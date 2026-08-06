import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
import { registrarAuditoria } from "../../shared/auditoria";
import { insertNotificacion } from "../notifications/notifications.repository";
import { findProductById } from "../inventory/products.repository";
import * as repo from "./compras.repository";
import { findProveedorById } from "./proveedores.repository";
import { ESTADO_COMPRA_LABEL, validarTransicionCompra, type Rol } from "./estadosCompra";

export interface LineaCompraInput {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

export function calcularTotalCompra(lineas: LineaCompraInput[]): number {
  return lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(n: string | null | undefined): number {
  return Number(n ?? 0);
}

function mapCompra(c: repo.CompraRow, lineas: repo.CompraLineaRow[], pagos: repo.PagoProveedorRow[]) {
  const total = toNum(c.total_neto);
  const totalRecibido = toNum(c.total_recibido);
  const pagado = pagos.reduce((a, p) => a + toNum(p.monto), 0);
  return {
    id: c.id,
    folio: c.folio,
    proveedorId: c.proveedor_id,
    proveedorNombre: c.proveedor_nombre,
    estado: c.estado,
    estadoLabel: ESTADO_COMPRA_LABEL[c.estado],
    total,
    totalRecibido,
    pagado,
    saldo: Math.max(0, totalRecibido - pagado),
    fechaVencimiento: c.fecha_vencimiento ? String(c.fecha_vencimiento).slice(0, 10) : null,
    creadaPor: c.creada_por,
    creadorNombre: c.creador_nombre,
    createdAt: c.created_at,
    lineas: lineas.map((l) => ({
      id: l.id,
      productoId: l.producto_id,
      sku: l.sku,
      nombre: l.nombre_producto,
      cantidad: l.cantidad,
      cantidadRecibida: l.cantidad_recibida,
      pendiente: Math.max(0, l.cantidad - l.cantidad_recibida),
      recibida: l.cantidad_recibida >= l.cantidad,
      precioUnitario: toNum(l.precio_unitario),
      subtotal: l.cantidad * toNum(l.precio_unitario),
    })),
    pagos: pagos.map((p) => ({ id: p.id, monto: toNum(p.monto), metodo: p.metodo, usuario: p.usuario_nombre, fecha: p.created_at })),
  };
}

/** Pendiente de recepción de una línea. */
export function lineaPendiente(cantidad: number, recibida: number): number {
  return Math.max(0, cantidad - recibida);
}

/** True si todas las líneas están completamente recibidas. */
export function compraCompleta(lineas: { cantidad: number; cantidad_recibida: number }[]): boolean {
  return lineas.length > 0 && lineas.every((l) => l.cantidad_recibida >= l.cantidad);
}

export async function listar(f: { proveedorId?: number; estado?: string; folio?: string; page: number; pageSize: number }) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { proveedorId: f.proveedorId, estado: f.estado, folio: f.folio };
  const [rows, totalItems] = await Promise.all([
    repo.listCompras({ ...filtros, limit, offset }),
    repo.countCompras(filtros),
  ]);
  const data = await Promise.all(
    rows.map(async (c) => mapCompra(c, await repo.listCompraLineas(c.id), await repo.listPagosProveedor(c.id)))
  );
  return { data, meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 } };
}

export async function getById(id: number) {
  const c = await repo.findCompraById(id);
  if (!c) throw AppError.notFound("PURCHASE_NOT_FOUND", "Compra no encontrada");
  return mapCompra(c, await repo.listCompraLineas(id), await repo.listPagosProveedor(id));
}

export async function crear(input: { proveedorId: number; fechaVencimiento?: string | null; lineas: LineaCompraInput[] }, user: { id: number }) {
  const existeProveedor = await findProveedorById(input.proveedorId);
  if (!existeProveedor) throw AppError.notFound("SUPPLIER_NOT_FOUND", "Proveedor no encontrado");
  const total = calcularTotalCompra(input.lineas);
  if (total <= 0) throw AppError.badRequest("VALIDATION_ERROR", "La orden de compra requiere al menos una línea con monto");

  const compraId = await withTransaction(async (client) => {
    const folio = await repo.nextCompraFolio(client);
    const id = await repo.insertCompra(client, {
      folio,
      proveedorId: input.proveedorId,
      fechaVencimiento: input.fechaVencimiento ?? null,
      totalNeto: total,
      creadaPor: user.id,
    });
    if (!id) throw AppError.business("INTERNAL_ERROR", "No se pudo crear la compra");
    await repo.insertDetalleCompra(client, id, input.lineas);
    return id;
  });
  await registrarAuditoria({ usuarioId: user.id, accion: "CREAR", entidad: "compra", entidadId: compraId });
  return getById(compraId);
}

export async function enviar(compraId: number, user: { id: number; rol: Rol }) {
  const c = await repo.findCompraById(compraId);
  if (!c) throw AppError.notFound("PURCHASE_NOT_FOUND", "Compra no encontrada");
  validarTransicionCompra(c.estado, "enviada", user.rol);
  const lineas = await repo.listCompraLineas(compraId);
  if (!lineas.length) throw AppError.business("PURCHASE_EMPTY", "No se puede enviar una orden sin líneas");
  await withTransaction((client) => repo.updateCompraEstado(client, compraId, "enviada"));
  return getById(compraId);
}

export interface RecibirLinea {
  detalleCompraId: number;
  cantidadRecibida: number;
}

export async function recibir(
  compraId: number,
  input: { lineas?: RecibirLinea[] },
  user: { id: number; rol: Rol }
) {
  const c = await repo.findCompraById(compraId);
  if (!c) throw AppError.notFound("PURCHASE_NOT_FOUND", "Compra no encontrada");
  validarTransicionCompra(c.estado, "recibida", user.rol);

  await withTransaction(async (client) => {
    const lineas = await repo.listCompraLineas(compraId);
    if (!lineas.length) throw AppError.business("PURCHASE_EMPTY", "La compra no tiene líneas");

    // Sin body → recibir todo lo pendiente; con body → recepción por líneas
    const recibos = new Map<number, number>();
    if (input.lineas) {
      if (!input.lineas.length) throw AppError.badRequest("VALIDATION_ERROR", "Envía al menos una línea o usa el cuerpo vacío para recibir todo");
      const idsValidos = new Set(lineas.map((l) => l.id));
      for (const r of input.lineas) {
        if (!idsValidos.has(r.detalleCompraId)) {
          throw AppError.business("LINEA_NO_EN_COMPRA", `La línea ${r.detalleCompraId} no pertenece a esta orden de compra`);
        }
        recibos.set(r.detalleCompraId, r.cantidadRecibida);
      }
    } else {
      for (const l of lineas) recibos.set(l.id, Math.max(0, l.cantidad - l.cantidad_recibida));
    }

    let montoRecibido = 0;
    // Acumulado de recepción por línea (en memoria; el pool no ve cambios sin commitear)
    const acumulado = new Map(lineas.map((l) => [l.id, l.cantidad_recibida]));
    for (const l of lineas) {
      const cantidad = recibos.get(l.id);
      if (cantidad === undefined) continue; // línea no incluida en este lote
      if (cantidad <= 0) throw AppError.business("CANTIDAD_INVALIDA", "La cantidad a recibir debe ser mayor a 0");
      const pendiente = Math.max(0, l.cantidad - l.cantidad_recibida);
      if (cantidad > pendiente) {
        throw AppError.business(
          "SOBRE_RECEPCION",
          `${l.nombre_producto}: solo quedan ${pendiente} por recibir de ${l.cantidad}`
        );
      }

      const producto = await repo.findProductoCompra(client, l.producto_id);
      if (!producto) throw AppError.notFound("PRODUCT_NOT_FOUND", `Producto ${l.producto_id} no encontrado`);
      await repo.incrementStockClient(client, l.producto_id, cantidad);
      await repo.insertMovimientoEntrada(client, {
        productoId: l.producto_id,
        cantidad,
        usuarioId: user.id,
        compraId,
      });
      const precioNuevo = toNum(l.precio_unitario);
      const precioActual = toNum(producto.precio_compra);
      if (Math.abs(precioNuevo - precioActual) > 0.001) {
        await repo.updatePrecioCompra(client, l.producto_id, precioNuevo);
        await repo.insertPrecioHistorial(client, {
          productoId: l.producto_id,
          precioCompra: precioNuevo,
          precioVenta: toNum(producto.precio_venta),
          usuarioId: user.id,
        });
      }

      await repo.incrementCantidadRecibida(client, l.id, cantidad);
      const nuevoRecibido = (acumulado.get(l.id) ?? 0) + cantidad;
      acumulado.set(l.id, nuevoRecibido);
      montoRecibido += cantidad * precioNuevo;

      // Al completarse la línea, las solicitudes aprobadas de ESA OC quedan entregadas
      if (nuevoRecibido >= l.cantidad) {
        const llegaron = await repo.entregarSolicitudesProducto(client, l.producto_id, compraId, user.id);
        for (const fila of llegaron) {
          if (fila.orden_id) {
            await repo.insertHistorialOrdenEntregada(client, fila.orden_id, l.nombre_producto, c.folio, user.id);
          }
        }
      }
    }
    if (montoRecibido <= 0) throw AppError.badRequest("VALIDATION_ERROR", "No se recibió ninguna cantidad");

    await repo.incrementTotalRecibido(client, compraId, montoRecibido);
    const completa = lineas.every((l) => (acumulado.get(l.id) ?? l.cantidad_recibida) >= l.cantidad);
    if (completa) {
      await repo.updateCompraEstado(client, compraId, "recibida");
    }
  });
  await registrarAuditoria({
    usuarioId: user.id,
    accion: "RECIBIR",
    entidad: "compra",
    entidadId: compraId,
    despues: { lineas: input.lineas ?? null },
  });
  return getById(compraId);
}

export async function cancelar(compraId: number, user: { id: number; rol: Rol }) {
  const c = await repo.findCompraById(compraId);
  if (!c) throw AppError.notFound("PURCHASE_NOT_FOUND", "Compra no encontrada");
  validarTransicionCompra(c.estado, "cancelada", user.rol);
  await withTransaction((client) => repo.updateCompraEstado(client, compraId, "cancelada"));
  return getById(compraId);
}

export async function registrarPago(compraId: number, input: { monto: number; metodo: string }, user: { id: number }) {
  const c = await repo.findCompraById(compraId);
  if (!c) throw AppError.notFound("PURCHASE_NOT_FOUND", "Compra no encontrada");
  const totalRecibido = toNum(c.total_recibido);
  if (totalRecibido <= 0) {
    throw AppError.conflict("PURCHASE_NOT_RECEIVED", "No hay mercancía recibida para pagar");
  }
  const pagado = await repo.sumPagosCompra(compraId);
  const pendiente = Math.max(0, totalRecibido - pagado);
  if (input.monto <= 0 || input.monto > pendiente) {
    throw AppError.business("PAYMENT_INVALID", `Monto inválido: pendiente ${pendiente}`);
  }
  await withTransaction((client) => repo.insertPagoProveedor(client, { compraId, monto: input.monto, metodo: input.metodo, usuarioId: user.id }));
  await registrarAuditoria({ usuarioId: user.id, accion: "PAGAR", entidad: "pago_proveedor", entidadId: compraId, despues: input });
  return { compraId, monto: input.monto, saldoPendiente: Math.max(0, pendiente - input.monto) };
}

export async function cxp(estado?: string) {
  const compras = await repo.listComprasConRecepcion();
  const items: {
    compraId: number;
    folio: string;
    proveedorId: number;
    proveedorNombre: string;
    total: number;
    saldo: number;
    fechaVencimiento: string | null;
    estado: string;
  }[] = [];
  const hoyF = today();
  for (const c of compras) {
    const pagado = await repo.sumPagosCompra(c.id);
    const saldo = Math.max(0, toNum(c.total_recibido) - pagado);
    const vencido = c.fecha_vencimiento && String(c.fecha_vencimiento).slice(0, 10) < hoyF && saldo > 0;
    const est = saldo <= 0 ? "pagado" : vencido ? "vencido" : "vigente";
    if (estado && est !== estado) continue;
    items.push({
      compraId: c.id,
      folio: c.folio,
      proveedorId: c.proveedor_id,
      proveedorNombre: c.proveedor_nombre,
      total: toNum(c.total_recibido),
      saldo,
      fechaVencimiento: c.fecha_vencimiento ? String(c.fecha_vencimiento).slice(0, 10) : null,
      estado: est,
    });
  }
  return items;
}

/* --- Reabastecimiento sugerido --- */

interface LineaReabastecimiento {
  productoId: number;
  sku: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  sugerido: number;
  precio: number;
  subtotal: number;
  esFavorito: boolean;
  esMasBarato: boolean;
  enOC: boolean;
  folioOC: string | null;
}

export async function reabastecimiento() {
  const rows = await repo.listarReabastecimiento();
  const grupos = new Map<
    number | null,
    { proveedorId: number | null; proveedorNombre: string; totalEstimado: number; lineas: LineaReabastecimiento[] }
  >();
  for (const r of rows) {
    const sugerido = Math.max(0, (r.stock_maximo > 0 ? r.stock_maximo : r.stock_minimo * 2) - r.stock);
    if (sugerido <= 0) continue;
    const precio = toNum(r.precio_compra);
    const key = r.proveedor_id;
    let g = grupos.get(key);
    if (!g) {
      g = { proveedorId: key, proveedorNombre: r.proveedor_nombre ?? "Sin proveedor", totalEstimado: 0, lineas: [] };
      grupos.set(key, g);
    }
    g.lineas.push({
      productoId: r.id,
      sku: r.sku,
      nombre: r.nombre,
      stock: r.stock,
      stockMinimo: r.stock_minimo,
      stockMaximo: r.stock_maximo,
      sugerido,
      precio,
      subtotal: sugerido * precio,
      esFavorito: r.es_favorito,
      esMasBarato: r.es_mas_barato,
      enOC: !!r.en_oc_folio,
      folioOC: r.en_oc_folio,
    });
    g.totalEstimado += sugerido * precio;
  }
  return { grupos: [...grupos.values()] };
}

/* --- Solicitudes de reabastecimiento --- */

function mapSolicitud(s: repo.SolicitudRow) {
  return {
    id: s.id,
    productoId: s.producto_id,
    sku: s.sku,
    productoNombre: s.nombre_producto,
    cantidad: s.cantidad,
    ordenId: s.orden_id,
    ordenFolio: s.orden_folio,
    solicitadoPor: s.solicitado_por,
    solicitanteNombre: s.solicitante_nombre,
    motivo: s.motivo,
    estado: s.estado,
    rechazoMotivo: s.rechazo_motivo,
    compraId: s.compra_id,
    compraFolio: s.compra_folio,
    resueltoPor: s.resuelto_por,
    createdAt: s.created_at,
    resueltoAt: s.resuelto_at,
  };
}

export async function crearSolicitud(
  input: { productoId: number; cantidad: number; ordenId?: number | null; motivo?: string },
  user: { id: number }
) {
  const producto = await findProductById(input.productoId);
  if (!producto) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  if (producto.stock >= input.cantidad) {
    throw AppError.business(
      "STOCK_SUFICIENTE",
      "Hay stock suficiente para esa cantidad; no se requiere reabastecimiento"
    );
  }
  const id = await repo.insertSolicitud({
    productoId: input.productoId,
    cantidad: input.cantidad,
    ordenId: input.ordenId ?? null,
    solicitadoPor: user.id,
    motivo: input.motivo ?? null,
  });
  await insertNotificacion({
    clienteId: null,
    ordenId: input.ordenId ?? null,
    tipo: "NOT-05",
    canal: "app",
    estado: "enviado",
    contenido: `Solicitud de refacción: ${input.cantidad} × ${producto.nombre} (${producto.sku})`,
  });
  const row = await repo.findSolicitudById(id!);
  return mapSolicitud(row!);
}

export async function listarSolicitudes(f: { estado?: string; ordenId?: number; page: number; pageSize: number }) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const [rows, totalItems] = await Promise.all([
    repo.listSolicitudes({ estado: f.estado, ordenId: f.ordenId, limit, offset }),
    repo.countSolicitudes(f.estado, f.ordenId),
  ]);
  return {
    data: rows.map(mapSolicitud),
    meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}

export async function aprobarSolicitudes(solicitudes: number[], user: { id: number }) {
  const compras: { id: number; folio: string; proveedorId: number; proveedorNombre: string; lineas: number }[] = [];
  const sinProveedor: number[] = [];
  const noPendientes: number[] = [];
  const porProveedor = new Map<number, { productoId: number; cantidad: number; precio: number; solicitudId: number }[]>();

  for (const id of solicitudes) {
    const s = await repo.findSolicitudById(id);
    if (!s || s.estado !== "pendiente") {
      noPendientes.push(id);
      continue;
    }
    const prov = await repo.proveedorDeProducto(s.producto_id);
    if (!prov?.proveedor_id) {
      sinProveedor.push(id);
      continue;
    }
    const producto = await findProductById(s.producto_id);
    const precio = toNum(producto?.precio_compra);
    if (!porProveedor.has(prov.proveedor_id)) porProveedor.set(prov.proveedor_id, []);
    porProveedor.get(prov.proveedor_id)!.push({ productoId: s.producto_id, cantidad: s.cantidad, precio, solicitudId: id });
  }

  for (const [proveedorId, lineas] of porProveedor) {
    const total = lineas.reduce((a, l) => a + l.cantidad * l.precio, 0);
    if (total <= 0) {
      lineas.forEach((l) => sinProveedor.push(l.solicitudId));
      continue;
    }
    const compra = await crear(
      {
        proveedorId,
        fechaVencimiento: null,
        lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precio })),
      },
      user
    );
    for (const l of lineas) {
      await repo.resolverSolicitud(l.solicitudId, { estado: "aprobada", compraId: compra.id, resueltoPor: user.id });
    }
    compras.push({ id: compra.id, folio: compra.folio, proveedorId: compra.proveedorId, proveedorNombre: compra.proveedorNombre, lineas: lineas.length });
  }

  return { compras, sinProveedor, noPendientes };
}

export async function rechazarSolicitud(id: number, motivo: string, user: { id: number }) {
  const s = await repo.findSolicitudById(id);
  if (!s) throw AppError.notFound("SOLICITUD_NOT_FOUND", "Solicitud no encontrada");
  if (s.estado !== "pendiente") {
    throw AppError.conflict("SOLICITUD_NO_PENDIENTE", "Solo se pueden rechazar solicitudes pendientes");
  }
  await repo.resolverSolicitud(id, { estado: "rechazada", rechazoMotivo: motivo, resueltoPor: user.id });
  return mapSolicitud((await repo.findSolicitudById(id))!);
}

export async function cancelarSolicitud(id: number, motivo: string, user: { id: number; rol: Rol }) {
  const s = await repo.findSolicitudById(id);
  if (!s) throw AppError.notFound("SOLICITUD_NOT_FOUND", "Solicitud no encontrada");
  if (s.estado === "rechazada" || s.estado === "cancelada") {
    throw AppError.conflict("SOLICITUD_CERRADA", "La solicitud ya está cerrada");
  }
  const esAdmin = user.rol === "admin";
  if (!esAdmin) {
    if (s.solicitado_por !== user.id) throw AppError.forbidden();
    if (s.estado !== "pendiente") {
      throw AppError.conflict("SOLICITUD_NO_PENDIENTE", "Solo puedes cancelar tu solicitud mientras esté pendiente");
    }
  }
  await repo.resolverSolicitud(id, { estado: "cancelada", rechazoMotivo: motivo, resueltoPor: user.id });
  return mapSolicitud((await repo.findSolicitudById(id))!);
}

/* --- Comparación de precios entre proveedores (US-COM-05) --- */

export async function comparacionPrecios(productoId: number) {
  const producto = await findProductById(productoId);
  if (!producto) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");

  const rows = await repo.ultimoPrecioPorProveedor(productoId);
  const precios = rows.map((r) => toNum(r.ultimo_precio));
  const minPrecio = precios.length ? Math.min(...precios) : null;

  const proveedores = rows.map((r) => {
    const precio = toNum(r.ultimo_precio);
    return {
      proveedorId: r.proveedor_id,
      proveedorNombre: r.proveedor_nombre,
      ultimoPrecio: precio,
      ultimaFecha: String(r.ultima_fecha).slice(0, 10),
      folioOC: r.folio_oc,
      cantidad: r.cantidad,
      esFavorito: r.proveedor_id === producto.proveedor_favorito_id,
      esInactivo: !r.proveedor_is_active,
      esMasBarato: precios.length > 1 && precio === minPrecio,
      porDebajoDelActual: precio < toNum(producto.precio_compra),
    };
  });

  return {
    producto: {
      id: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      precioCompra: toNum(producto.precio_compra),
      proveedorFavoritoId: producto.proveedor_favorito_id,
    },
    proveedores,
  };
}
