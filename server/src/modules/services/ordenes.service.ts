import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
import { getConfig } from "../../shared/config";
import { getIvaRate } from "../../shared/config";
import { calcMoney } from "../../shared/money";
import { insertNotificacion } from "../notifications/notifications.repository";
import * as comprasService from "../compras/compras.service";
import { ESTADO_LABEL, validarTransicion } from "./estados";
import type { EstadoOrden, Rol, TipoEquipo } from "./ordenes.types";
import * as repo from "./ordenes.repository";
import * as ventasService from "../sales/ventas.service";
import * as notifications from "../notifications/notifications.service";

const DIAS_VIGENCIA_COTIZACION = 7;

function addDays(date: string | Date, days: number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function esRetrasada(estado: EstadoOrden, fechaPrometida: string, toleranciaDias = 1): boolean {
  if (estado === "entregado" || estado === "cancelado") return false;
  // BR-RET: retraso tras fecha_prometida + tolerancia (1 día calendario por default)
  return addDays(fechaPrometida, toleranciaDias) < today();
}

export interface OrdenDTO {
  id: number;
  folio: string;
  clienteId: number;
  clienteNombre: string;
  clienteTelefono: string;
  tipoEquipo: TipoEquipo;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  accesorios: string | null;
  fallaReportada: string;
  diagnostico: string | null;
  estado: EstadoOrden;
  retrasada: boolean;
  fechaPrometida: string;
  fechaEntrega: string | null;
  tecnicoId: number | null;
  vendedorId: number;
  firma: string | null;
  createdAt: string;
}

function mapOrden(r: repo.OrdenRow, toleranciaDias = 1): OrdenDTO {
  return {
    id: r.id,
    folio: r.folio,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre,
    clienteTelefono: r.cliente_telefono,
    tipoEquipo: r.tipo_equipo,
    marca: r.marca,
    modelo: r.modelo,
    serie: r.serie,
    accesorios: r.accesorios,
    fallaReportada: r.falla_reportada,
    diagnostico: r.diagnostico,
    estado: r.estado,
    retrasada: esRetrasada(r.estado, r.fecha_prometida, toleranciaDias),
    fechaPrometida: addDays(r.fecha_prometida, 0),
    fechaEntrega: r.fecha_entrega ? addDays(r.fecha_entrega, 0) : null,
    tecnicoId: r.tecnico_id,
    vendedorId: r.vendedor_id,
    firma: r.firma_recepcion,
    createdAt: r.created_at,
  };
}

function mapCotizacion(c: repo.CotizacionRow, lineas: repo.CotizacionLineaRow[]) {
  return {
    id: c.id,
    folio: c.folio,
    ordenId: c.orden_id,
    estado: c.estado,
    subtotal: Number(c.subtotal),
    iva: Number(c.iva),
    total: Number(c.total),
    vigenciaDesde: addDays(c.vigencia_desde, 0),
    vigenciaHasta: addDays(c.vigencia_hasta, 0),
    lineas: lineas.map((l) => ({
      id: l.id,
      tipoLinea: l.tipo_linea,
      productoId: l.producto_id,
      nombre: l.nombre_producto ?? l.descripcion_mano_obra,
      cantidad: l.cantidad,
      precioNeto: Number(l.precio_neto),
      descripcion: l.descripcion_mano_obra,
      horas: l.horas ? Number(l.horas) : null,
      tarifaHora: l.tarifa_hora ? Number(l.tarifa_hora) : null,
      stock: l.stock ?? null,
    })),
  };
}

export interface ListFilters {
  estado?: EstadoOrden;
  retrasadas?: boolean;
  folio?: string;
  clienteId?: number;
  page: number;
  pageSize: number;
}

export async function list(f: ListFilters) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { estado: f.estado, retrasadas: f.retrasadas, folio: f.folio, clienteId: f.clienteId };
  const [rows, totalItems, config] = await Promise.all([
    repo.listOrdenes({ ...filtros, limit, offset }),
    repo.countOrdenes(filtros),
    getConfig(),
  ]);
  return {
    data: rows.map((r) => mapOrden(r, config.toleranciaRetrasoDias)),
    meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}

export async function getById(id: number) {
  const orden = await repo.findOrdenById(id);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  const [historial, cotizacionesRows, config] = await Promise.all([
    repo.listHistorial(id),
    repo.listCotizaciones(id),
    getConfig(),
  ]);
  const cotizaciones = await Promise.all(
    cotizacionesRows.map(async (c) => mapCotizacion(c, await repo.listCotizacionLineas(c.id)))
  );
  const detalle = await repo.listDetalleOrden(id);
  return {
    ...mapOrden(orden, config.toleranciaRetrasoDias),
    historial: historial.map((h) => ({
      id: h.id,
      estado: h.estado,
      estadoLabel: ESTADO_LABEL[h.estado],
      usuarioId: h.usuario_id,
      usuarioNombre: h.usuario_nombre,
      nota: h.nota,
      fecha: h.created_at,
    })),
    cotizaciones,
    detalle,
  };
}

export async function getByFolio(folio: string) {
  const orden = await repo.findOrdenByFolio(folio);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  return mapOrden(orden);
}

export async function create(
  input: {
    clienteId: number;
    tipoEquipo: TipoEquipo;
    marca?: string | null;
    modelo?: string | null;
    serie?: string | null;
    accesorios?: string | null;
    fallaReportada: string;
    fechaPrometida?: string;
    tecnicoId?: number | null;
  },
  vendedorId: number
) {
  const clienteOk = await repo.clienteExists(input.clienteId);
  if (!clienteOk) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
  if (input.tecnicoId && !(await repo.tecnicoExists(input.tecnicoId))) {
    throw AppError.notFound("TECHNICIAN_NOT_FOUND", "Técnico no encontrado");
  }
  const fechaPrometida = input.fechaPrometida ?? addDays(today(), 7);
  const folio = await repo.nextOrdenFolio();
  const id = await repo.insertOrden({
    folio,
    clienteId: input.clienteId,
    tipoEquipo: input.tipoEquipo,
    marca: input.marca ?? null,
    modelo: input.modelo ?? null,
    serie: input.serie ?? null,
    accesorios: input.accesorios ?? null,
    fallaReportada: input.fallaReportada,
    fechaPrometida,
    tecnicoId: input.tecnicoId ?? null,
    vendedorId,
  });
  if (!id) throw AppError.business("INTERNAL_ERROR", "No se pudo crear la orden");
  await repo.insertHistorial(id, "pendiente", vendedorId, "Orden creada");
  return getById(id);
}

export async function cambiarEstado(id: number, nuevoEstado: EstadoOrden, nota: string | undefined, user: { id: number; rol: Rol }) {
  const orden = await repo.findOrdenById(id);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");

  const cotizaciones = await repo.listCotizaciones(id);
  const cotizacionAprobada = cotizaciones.some((c) => c.estado === "aprobada");
  validarTransicion(orden.estado, nuevoEstado, user.rol, cotizacionAprobada);
  const config = await getConfig();

  await withTransaction(async (client) => {
    if (nuevoEstado === "listo") {
      const reservas = await repo.listReservasOrden(client, id);
      await repo.consumirTodasLasReservas(client, id);
      for (const r of reservas) {
        await repo.insertMovimiento(client, {
          productoId: r.producto_id,
          tipo: "SALIDA_CONSUMO",
          cantidad: -r.cantidad,
          usuarioId: user.id,
          motivo: `Consumo orden ${orden.folio}`,
        });
      }
    }
    if (nuevoEstado === "cancelado") {
      const reservas = await repo.listReservasOrden(client, id);
      for (const r of reservas) {
        await repo.liberarStock(client, r.producto_id, r.cantidad);
        await repo.insertMovimiento(client, {
          productoId: r.producto_id,
          tipo: "LIBERACION",
          cantidad: r.cantidad,
          usuarioId: user.id,
          motivo: `Cancelación orden ${orden.folio}`,
        });
      }
      await repo.liberarReservas(client, id);
    }
    await repo.updateOrdenEstado(id, nuevoEstado, esRetrasada(nuevoEstado, orden.fecha_prometida, config.toleranciaRetrasoDias));
  });

  await repo.insertHistorial(id, nuevoEstado, user.id, nota ?? ESTADO_LABEL[nuevoEstado]);
  return getById(id);
}

export async function setDiagnostico(id: number, diagnostico: string, user: { id: number; rol: Rol }) {
  const orden = await repo.findOrdenById(id);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "tecnico") throw AppError.forbidden();
  if (orden.estado === "entregado" || orden.estado === "cancelado") {
    throw AppError.conflict("ORDER_STATE_INVALID", `No se puede diagnosticar en estado ${orden.estado}`);
  }
  await repo.updateOrdenDiagnostico(id, diagnostico);
  await repo.insertHistorial(id, orden.estado, user.id, "Diagnóstico actualizado");
  return getById(id);
}

export async function crearCotizacion(
  id: number,
  lineas: {
    tipoLinea: "refaccion" | "mano_obra";
    productoId?: number;
    cantidad?: number;
    horas?: number;
    tarifaHora?: number;
    descripcion?: string;
  }[],
  user: { id: number; rol: Rol }
) {
  const orden = await repo.findOrdenById(id);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "tecnico") throw AppError.forbidden();
  if (orden.estado !== "en_diagnostico" && orden.estado !== "pendiente") {
    throw AppError.conflict("ORDER_STATE_INVALID", "La cotización requiere una orden en pendiente o diagnóstico");
  }

  const ivaRate = await getIvaRate();
  let subtotal = 0;
  const lineasListas: { descripcion: string; cantidad?: number; precio: number }[] = [];

  for (const l of lineas) {
    if (l.tipoLinea === "refaccion") {
      if (!l.productoId || !l.cantidad) throw AppError.badRequest("VALIDATION_ERROR", "Refacción requiere productoId y cantidad");
      const p = await repo.findProducto(l.productoId);
      if (!p) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
      if (p.stock < l.cantidad) {
        throw AppError.business("INSUFFICIENT_STOCK", `${p.nombre}: stock disponible ${p.stock}`);
      }
      const precio = Number(p.precio_venta) * l.cantidad;
      subtotal += precio;
      lineasListas.push({ descripcion: p.nombre, cantidad: l.cantidad, precio });
    } else {
      const horas = l.horas ?? 0;
      const tarifa = l.tarifaHora ?? 0;
      if (horas <= 0 || tarifa < 0) throw AppError.badRequest("VALIDATION_ERROR", "Mano de obra requiere horas > 0 y tarifa");
      const precio = horas * tarifa;
      subtotal += precio;
      lineasListas.push({ descripcion: l.descripcion ?? "Mano de obra", precio });
    }
  }

  const mon = calcMoney(subtotal, 0, ivaRate);
  const folio = await repo.nextCotizacionFolio();
  const cotizacionId = await repo.insertCotizacion({
    ordenId: id,
    folio,
    subtotal: mon.subtotal,
    iva: mon.iva,
    total: mon.total,
    vigenciaDesde: today(),
    vigenciaHasta: addDays(today(), DIAS_VIGENCIA_COTIZACION),
    creadaPor: user.id,
  });
  if (!cotizacionId) throw AppError.business("INTERNAL_ERROR", "No se pudo crear la cotización");

  let idx = 0;
  for (const l of lineas) {
    if (l.tipoLinea === "refaccion") {
      await repo.insertDetalleCotizacion({
        cotizacionId,
        tipoLinea: "refaccion",
        productoId: l.productoId,
        cantidad: l.cantidad,
        precioNeto: lineasListas[idx]!.precio,
      });
    } else {
      await repo.insertDetalleCotizacion({
        cotizacionId,
        tipoLinea: "mano_obra",
        descripcion: l.descripcion,
        horas: l.horas,
        tarifaHora: l.tarifaHora,
        precioNeto: lineasListas[idx]!.precio,
      });
    }
    idx++;
  }

  await repo.updateOrdenEstado(id, "cotizado", false);
  await repo.insertHistorial(id, "cotizado", user.id, `Cotización ${folio} emitida`);

  const c = await repo.findCotizacionById(cotizacionId);
  const lineasDb = await repo.listCotizacionLineas(cotizacionId);
  if (!c) throw AppError.business("INTERNAL_ERROR", "No se pudo recuperar la cotización");
  return mapCotizacion(c, lineasDb);
}

export async function aprobarCotizacion(ordenId: number, cotizacionId: number, user: { id: number; rol: Rol }) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  const cot = await repo.findCotizacionById(cotizacionId);
  if (!cot || cot.orden_id !== ordenId) throw AppError.notFound("QUOTE_NOT_FOUND", "Cotización no encontrada");
  if (cot.estado !== "emitida") throw AppError.conflict("QUOTE_ALREADY_PROCESSED", "La cotización ya fue procesada");
  if (cot.vigencia_hasta < today()) throw AppError.business("QUOTE_EXPIRED", "La cotización expiró");

  await withTransaction(async (client) => {
    const lineas = await repo.listCotizacionLineas(cotizacionId);
    for (const l of lineas) {
      if (l.tipo_linea !== "refaccion" || !l.producto_id || !l.cantidad) continue;
      const res = await repo.reservarStock(client, l.producto_id, l.cantidad);
      if (!res.rowCount) {
        const p = await repo.findProducto(l.producto_id);
        throw AppError.business(
          "STOCK_RESERVED",
          `No hay stock suficiente de ${p?.nombre ?? "producto"} para reservar`
        );
      }
      const costo = Number(l.precio_neto) / l.cantidad;
      await repo.insertDetalleOrdenReserva(client, ordenId, l.producto_id, l.cantidad, costo);
      await repo.insertMovimiento(client, {
        productoId: l.producto_id,
        tipo: "RESERVA",
        cantidad: -l.cantidad,
        usuarioId: user.id,
        motivo: `Aprobación ${cot.folio} (orden ${orden.folio})`,
      });
    }
    await repo.updateCotizacionEstado(cotizacionId, "aprobada");
  });

  await repo.insertHistorial(ordenId, "cotizado", user.id, `Cotización ${cot.folio} aprobada · piezas reservadas`);
  const c = await repo.findCotizacionById(cotizacionId);
  if (!c) throw AppError.business("INTERNAL_ERROR", "No se pudo recuperar la cotización");
  return mapCotizacion(c, await repo.listCotizacionLineas(cotizacionId));
}

export async function rechazarCotizacion(ordenId: number, cotizacionId: number, motivo: string, user: { id: number; rol: Rol }) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  const cot = await repo.findCotizacionById(cotizacionId);
  if (!cot || cot.orden_id !== ordenId) throw AppError.notFound("QUOTE_NOT_FOUND", "Cotización no encontrada");
  await repo.updateCotizacionEstado(cotizacionId, "rechazada");
  await repo.insertHistorial(ordenId, "cotizado", user.id, `Cotización ${cot.folio} rechazada: ${motivo}`);
  return { id: cotizacionId, estado: "rechazada" as const };
}

export async function registrarConsumo(
  ordenId: number,
  piezas: { productoId: number; cantidad: number }[],
  user: { id: number; rol: Rol }
) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "tecnico") throw AppError.forbidden();
  if (orden.estado !== "en_reparacion" && orden.estado !== "cotizado") {
    throw AppError.conflict("ORDER_STATE_INVALID", "El consumo solo aplica en reparación");
  }

  await withTransaction(async (client) => {
    for (const p of piezas) {
      const res = await repo.consumirDetalleOrden(client, ordenId, p.productoId, p.cantidad);
      if (!res.rowCount || res.rowCount < p.cantidad) {
        throw AppError.business("STOCK_RESERVED", `No hay ${p.cantidad} piezas reservadas del producto ${p.productoId}`);
      }
      await repo.insertMovimiento(client, {
        productoId: p.productoId,
        tipo: "SALIDA_CONSUMO",
        cantidad: -p.cantidad,
        usuarioId: user.id,
        motivo: `Consumo orden ${orden.folio}`,
      });
    }
  });

  await repo.insertHistorial(ordenId, orden.estado, user.id, "Consumo de piezas registrado");
  return getById(ordenId);
}

export async function registrarManoObra(
  ordenId: number,
  input: { horas: number; tarifaHora: number; descripcion?: string },
  user: { id: number; rol: Rol }
) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  const cotizaciones = await repo.listCotizaciones(ordenId);
  const activa = cotizaciones.find((c) => c.estado === "aprobada" || c.estado === "emitida");
  if (!activa) throw AppError.business("QUOTE_NOT_FOUND", "No hay cotización activa para la orden");

  const ivaRate = await getIvaRate();
  const precio = input.horas * input.tarifaHora;
  await repo.insertDetalleCotizacion({
    cotizacionId: activa.id,
    tipoLinea: "mano_obra",
    descripcion: input.descripcion,
    horas: input.horas,
    tarifaHora: input.tarifaHora,
    precioNeto: precio,
  });

  const lineas = await repo.listCotizacionLineas(activa.id);
  const subtotal = lineas.reduce((a, l) => a + Number(l.precio_neto), 0);
  const mon = calcMoney(subtotal, 0, ivaRate);
  await repo.updateCotizacionTotales(activa.id, mon.subtotal, mon.iva, mon.total);

  await repo.insertHistorial(ordenId, orden.estado, user.id, "Mano de obra registrada");
  return getById(ordenId);
}

export async function entregar(
  ordenId: number,
  input: { firma: string; metodoPago?: string },
  user: { id: number; rol: Rol }
) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "vendedor" && user.rol !== "admin") throw AppError.forbidden();
  if (orden.estado !== "listo") throw AppError.conflict("ORDER_STATE_INVALID", "Solo se entregan órdenes en estado Listo");

  const cotizaciones = await repo.listCotizaciones(ordenId);
  const cot = cotizaciones.find((c) => c.estado === "aprobada");
  if (!cot) throw AppError.business("QUOTE_NOT_FOUND", "No hay cotización aprobada");

  const config = await getConfig();
  const lineasCot = await repo.listCotizacionLineas(cot.id);
  let ventaFolio = "";

  await withTransaction(async (client) => {
    const venta = await ventasService.registrarVenta(
      {
        clienteId: orden.cliente_id,
        vendedorId: user.id,
        ordenId: orden.id,
        lineas: lineasCot.map((l) => ({
          tipo: "servicio" as const,
          nombre: l.nombre_producto ?? l.descripcion_mano_obra ?? "Servicio",
          cantidad: l.cantidad ?? 1,
          precioNeto: Number(l.precio_neto) / (l.cantidad ?? 1),
        })),
        descuento: 0,
        tipoPago: "contado",
        metodoPago: input.metodoPago ?? "efectivo",
        montoRecibido: Number(cot.total),
      },
      user,
      client
    );
    ventaFolio = venta.folio;
    await repo.updateOrdenEntrega(client, orden.id, input.firma);
    await repo.updateCotizacionEstado(cot.id, "convertida");
    await repo.insertGarantia(client, {
      ventaId: venta.id,
      ordenId: orden.id,
      clienteId: orden.cliente_id,
      tipo: "servicio",
      inicio: today(),
      fin: addDays(today(), config.diasGarantiaServicio),
    });
  });

  await repo.insertHistorial(ordenId, "entregado", user.id, `Entregado y cobrado · venta ${ventaFolio}`);
  return { orden: await getById(ordenId), ventaFolio };
}

export async function cancelar(id: number, motivo: string, user: { id: number; rol: Rol }) {
  return cambiarEstado(id, "cancelado", `Cancelada: ${motivo}`, user);
}

export async function notificar(
  ordenId: number,
  input: { tipo: "listo" | "cotizacion"; canal?: string },
  _user: { id: number; rol: Rol }
) {
  return notifications.notificar(ordenId, input);
}

// US-SER-09: job horario que marca las órdenes retrasadas y dispara NOT-01
export async function marcarRetrasadas() {
  const config = await getConfig();
  const ids = await repo.marcarRetrasadas(config.toleranciaRetrasoDias);
  for (const id of ids) {
    try {
      await notifications.notificarRetraso(id);
    } catch (err) {
      console.error(`[notif:retraso] orden ${id}:`, err);
    }
  }
  return ids.length;
}

/* --- Sustituciones (validación del cliente) --- */

function mapSustitucion(s: repo.SustitucionRow) {
  return {
    id: s.id,
    ordenId: s.orden_id,
    cotizacionId: s.cotizacion_id,
    cotizacionFolio: s.cotizacion_folio,
    lineaId: s.linea_id,
    productoOriginalId: s.producto_original_id,
    skuOriginal: s.sku_original,
    nombreOriginal: s.nombre_original,
    cantidad: s.cantidad,
    sustitutoId: s.sustituto_id,
    skuSustituto: s.sku_sustituto,
    nombreSustituto: s.nombre_sustituto,
    precioSustituto: Number(s.precio_sustituto),
    stockSustituto: s.stock_sustituto,
    justificacion: s.justificacion,
    clienteAcepta: s.cliente_acepta,
    estado: s.estado,
    solicitudId: s.solicitud_id,
    creadaPor: s.creada_por,
    creadorNombre: s.creador_nombre,
    createdAt: s.created_at,
    resueltoAt: s.resuelto_at,
  };
}

async function cotizacionDe(s: repo.SustitucionRow) {
  return repo.findCotizacionById(s.cotizacion_id);
}

export async function crearSustitucion(
  ordenId: number,
  input: { cotizacionId: number; lineaId: number; sustitutoId: number; justificacion?: string },
  user: { id: number; rol: Rol }
) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "tecnico" && user.rol !== "admin") throw AppError.forbidden();
  if (orden.estado !== "cotizado" && orden.estado !== "en_reparacion") {
    throw AppError.conflict("ORDER_STATE_INVALID", "Solo se puede proponer sustitución en cotizado o en reparación");
  }

  const cot = await repo.findCotizacionById(input.cotizacionId);
  if (!cot || cot.orden_id !== ordenId) throw AppError.notFound("QUOTE_NOT_FOUND", "Cotización no encontrada");
  if (cot.estado !== "emitida" && cot.estado !== "aprobada") {
    throw AppError.conflict("QUOTE_INVALID", "La cotización debe estar emitida o aprobada");
  }

  const linea = await repo.findCotizacionLineaById(input.lineaId);
  if (!linea || linea.cotizacion_id !== input.cotizacionId) {
    throw AppError.notFound("LINEA_NOT_FOUND", "Línea de cotización no encontrada");
  }
  if (linea.tipo_linea !== "refaccion" || !linea.producto_id || !linea.cantidad) {
    throw AppError.badRequest("LINEA_NO_REFACCION", "La línea debe ser una refacción");
  }
  if (linea.stock !== null && linea.stock >= linea.cantidad) {
    throw AppError.business("STOCK_SUFICIENTE", "Hay stock suficiente para esa pieza; no requiere sustitución");
  }

  const sustituto = await repo.findProducto(input.sustitutoId);
  if (!sustituto) throw AppError.notFound("PRODUCT_NOT_FOUND", "Sustituto no encontrado");
  if (sustituto.stock < linea.cantidad) {
    throw AppError.business("INSUFFICIENT_STOCK", `El sustituto no tiene stock suficiente (disponible ${sustituto.stock})`);
  }
  if (sustituto.id === linea.producto_id) {
    throw AppError.badRequest("MISMO_PRODUCTO", "El sustituto no puede ser el mismo producto");
  }

  const id = await repo.insertSustitucion({
    ordenId,
    cotizacionId: input.cotizacionId,
    lineaId: input.lineaId,
    productoOriginalId: linea.producto_id,
    cantidad: linea.cantidad,
    sustitutoId: input.sustitutoId,
    justificacion: input.justificacion ?? null,
    creadaPor: user.id,
  });

  await insertNotificacion({
    clienteId: null,
    ordenId,
    tipo: "NOT-06",
    canal: "app",
    estado: "enviado",
    contenido: `Sustitución propuesta: ${linea.nombre_producto} → ${sustituto.nombre}`,
  });

  await repo.updateOrdenEstado(ordenId, "sustitucion_pendiente", esRetrasada("sustitucion_pendiente", orden.fecha_prometida));
  await repo.insertHistorial(ordenId, "sustitucion_pendiente", user.id, `Sustitución propuesta: ${linea.nombre_producto} → ${sustituto.nombre}`);

  const row = await repo.findSustitucionById(id!);
  return mapSustitucion(row!);
}

export async function listarSustituciones(ordenId: number) {
  return (await repo.listSustituciones(ordenId)).map(mapSustitucion);
}

export async function aceptarSustitucion(ordenId: number, sid: number, user: { id: number; rol: Rol }) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "tecnico" && user.rol !== "admin") throw AppError.forbidden();
  const s = await repo.findSustitucionById(sid);
  if (!s || s.orden_id !== ordenId) throw AppError.notFound("SUSTITUCION_NOT_FOUND", "Sustitución no encontrada");
  if (s.estado !== "pendiente") throw AppError.conflict("SUSTITUCION_CERRADA", "La sustitución ya fue resuelta");

  const sustituto = await repo.findProducto(s.sustituto_id);
  if (!sustituto) throw AppError.notFound("PRODUCT_NOT_FOUND", "Sustituto no encontrado");
  if (sustituto.stock < s.cantidad) {
    throw AppError.business("INSUFFICIENT_STOCK", `El sustituto ya no tiene stock suficiente (disponible ${sustituto.stock})`);
  }

  const cot = await cotizacionDe(s);
  const fueAprobada = cot?.estado === "aprobada";
  const precioNuevo = Number(sustituto.precio_venta);
  const ivaRate = await getIvaRate();

  await withTransaction(async (client) => {
    // Reemplazar la pieza en la cotización con el precio nuevo del sustituto
    await repo.updateCotizacionLinea(s.linea_id, { productoId: s.sustituto_id, precioNeto: precioNuevo * s.cantidad });

    // Recalcular totales de la cotización
    const lineas = await repo.listCotizacionLineas(s.cotizacion_id);
    const subtotal = lineas.reduce((acc, l) => acc + Number(l.precio_neto), 0);
    const mon = calcMoney(subtotal, 0, ivaRate);
    await repo.updateCotizacionTotales(s.cotizacion_id, mon.subtotal, mon.iva, mon.total);

    // Si estaba aprobada: liberar reserva del original y reservar el sustituto
    if (fueAprobada) {
      const liberadas = await repo.liberarReservaProductoClient(client, ordenId, s.producto_original_id);
      const cantidadLib = liberadas.reduce((a, r) => a + Number(r.cantidad), 0);
      if (cantidadLib > 0) {
        await repo.liberarStock(client, s.producto_original_id, cantidadLib);
        await repo.insertMovimiento(client, {
          productoId: s.producto_original_id,
          tipo: "LIBERACION",
          cantidad: cantidadLib,
          usuarioId: user.id,
          motivo: `Sustitución aceptada (orden ${orden.folio})`,
        });
      }
      const res = await repo.reservarStock(client, s.sustituto_id, s.cantidad);
      if (!res.rowCount) throw AppError.business("STOCK_RESERVED", "No hay stock suficiente del sustituto para reservar");
      await repo.insertDetalleOrdenReserva(client, ordenId, s.sustituto_id, s.cantidad, precioNuevo);
      await repo.insertMovimiento(client, {
        productoId: s.sustituto_id,
        tipo: "RESERVA",
        cantidad: -s.cantidad,
        usuarioId: user.id,
        motivo: `Sustitución aceptada (orden ${orden.folio})`,
      });
    }
  });

  await repo.resolverSustitucion(sid, { estado: "aceptada", clienteAcepta: true, resueltoPor: user.id });
  const destino: EstadoOrden = fueAprobada ? "en_reparacion" : "cotizado";
  await repo.updateOrdenEstado(ordenId, destino, esRetrasada(destino, orden.fecha_prometida));
  await repo.insertHistorial(
    ordenId,
    destino,
    user.id,
    `Cliente aceptó sustitución: ${s.nombre_original} → ${s.nombre_sustituto} ($${precioNuevo})`
  );
  return mapSustitucion((await repo.findSustitucionById(sid))!);
}

export async function rechazarSustitucion(ordenId: number, sid: number, motivo: string, user: { id: number; rol: Rol }) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "tecnico" && user.rol !== "admin") throw AppError.forbidden();
  const s = await repo.findSustitucionById(sid);
  if (!s || s.orden_id !== ordenId) throw AppError.notFound("SUSTITUCION_NOT_FOUND", "Sustitución no encontrada");
  if (s.estado !== "pendiente") throw AppError.conflict("SUSTITUCION_CERRADA", "La sustitución ya fue resuelta");

  // El cliente no aceptó → se solicita el reabastecimiento del producto original
  const solicitud = await comprasService.crearSolicitud(
    { productoId: s.producto_original_id, cantidad: s.cantidad, ordenId, motivo },
    { id: user.id }
  );

  await repo.resolverSustitucion(sid, { estado: "rechazada", clienteAcepta: false, solicitudId: solicitud.id, resueltoPor: user.id });
  const cot = await cotizacionDe(s);
  const destino: EstadoOrden = cot?.estado === "aprobada" ? "en_reparacion" : "cotizado";
  await repo.updateOrdenEstado(ordenId, destino, esRetrasada(destino, orden.fecha_prometida));
  await repo.insertHistorial(ordenId, destino, user.id, `Cliente rechazó sustitución; se generó solicitud de reabastecimiento de ${s.nombre_original}`);
  return mapSustitucion((await repo.findSustitucionById(sid))!);
}

export async function cancelarSustitucion(ordenId: number, sid: number, motivo: string, user: { id: number; rol: Rol }) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (user.rol !== "tecnico" && user.rol !== "admin") throw AppError.forbidden();
  const s = await repo.findSustitucionById(sid);
  if (!s || s.orden_id !== ordenId) throw AppError.notFound("SUSTITUCION_NOT_FOUND", "Sustitución no encontrada");
  if (s.estado !== "pendiente") throw AppError.conflict("SUSTITUCION_CERRADA", "Solo se puede cancelar una sustitución pendiente");
  if (user.rol !== "admin" && s.creada_por !== user.id) throw AppError.forbidden();

  await repo.resolverSustitucion(sid, { estado: "cancelada", clienteAcepta: null, resueltoPor: user.id });
  const cot = await cotizacionDe(s);
  const destino: EstadoOrden = cot?.estado === "aprobada" ? "en_reparacion" : "cotizado";
  await repo.updateOrdenEstado(ordenId, destino, esRetrasada(destino, orden.fecha_prometida));
  await repo.insertHistorial(ordenId, destino, user.id, `Sustitución cancelada: ${motivo}`);
  return mapSustitucion((await repo.findSustitucionById(sid))!);
}
