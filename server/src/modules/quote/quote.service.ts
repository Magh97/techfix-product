import { getIvaRate } from "../../shared/config";
import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
import { calcMoney } from "../../shared/money";
import { registrarVenta } from "../sales/ventas.service";
import * as repo from "./quote.repository";

const DESCUENTO_MAX_VENDEDOR = 0.1; // BR-VEN-05

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// node-postgres devuelve columnas DATE como Date local: lo normaliza a YYYY-MM-DD
function parseFecha(v: string | Date): string {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mapCotizacion(row: repo.CotizacionVentaRow, lineas: repo.DetalleCotizacionVentaRow[]) {
  const vigenciaHasta = parseFecha(row.vigencia_hasta);
  const activa = row.estado === "emitida" || row.estado === "aprobada";
  return {
    id: row.id,
    folio: row.folio,
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre,
    estado: row.estado,
    subtotal: Number(row.subtotal),
    iva: Number(row.iva),
    total: Number(row.total),
    descuento: Number(row.descuento),
    motivoDescuento: row.motivo_descuento,
    vigenciaDesde: parseFecha(row.vigencia_desde),
    vigenciaHasta,
    expirada: activa && vigenciaHasta < today(),
    creadaPor: row.creada_por,
    creadorNombre: row.creador_nombre,
    createdAt: row.created_at,
    lineas: lineas.map((l) => ({
      productoId: l.producto_id,
      sku: l.sku,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precioNeto: Number(l.precio_neto),
    })),
  };
}

export async function getById(id: number) {
  const row = await repo.findCotizacionVenta(id);
  if (!row) throw AppError.notFound("QUOTE_NOT_FOUND", "Cotización no encontrada");
  const lineas = await repo.listDetalleCotizacionVenta(id);
  return mapCotizacion(row, lineas);
}

export async function getByFolio(folio: string) {
  const row = await repo.findCotizacionVentaByFolio(folio);
  if (!row) throw AppError.notFound("QUOTE_NOT_FOUND", "Cotización no encontrada");
  const lineas = await repo.listDetalleCotizacionVenta(row.id);
  return mapCotizacion(row, lineas);
}

export async function crear(
  input: { clienteId: number; lineas: { productoId: number; cantidad: number }[]; vigenciaDias?: number; descuento?: number; motivoDescuento?: string },
  user: { id: number; rol: string }
) {
  if (!(await repo.clienteExiste(input.clienteId))) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");

  const vistos = new Set<number>();
  let subtotal = 0;
  const lineas: { productoId: number; cantidad: number; precioNeto: number }[] = [];
  for (const l of input.lineas) {
    if (vistos.has(l.productoId)) throw AppError.badRequest("DUPLICATED_PRODUCT", `Producto ${l.productoId} duplicado`);
    vistos.add(l.productoId);
    const p = await repo.findProductoQuote(l.productoId);
    if (!p) throw AppError.notFound("PRODUCT_NOT_FOUND", `Producto ${l.productoId} no encontrado`);
    if (p.stock < l.cantidad) throw AppError.business("INSUFFICIENT_STOCK", `${p.nombre}: stock disponible ${p.stock}`);
    const precio = Number(p.precio_venta) * l.cantidad;
    subtotal += precio;
    lineas.push({ productoId: p.id, cantidad: l.cantidad, precioNeto: precio });
  }

  const descuento = Math.max(0, input.descuento ?? 0);
  if (descuento > subtotal) throw AppError.badRequest("VALIDATION_ERROR", "El descuento no puede superar el subtotal");
  if (user.rol !== "admin" && descuento > subtotal * DESCUENTO_MAX_VENDEDOR) {
    throw AppError.forbidden("Descuento superior al 10% requiere rol admin (BR-VEN-05)");
  }
  if (descuento > 0 && !input.motivoDescuento) {
    throw AppError.badRequest("VALIDATION_ERROR", "Se requiere el motivo del descuento");
  }

  const ivaRate = await getIvaRate();
  const mon = calcMoney(subtotal, descuento, ivaRate);
  const folio = await repo.nextCotizacionVentaFolio();
  const vigenciaDesde = today();
  const vigenciaHasta = addDays(vigenciaDesde, input.vigenciaDias ?? 7);

  const id = await repo.insertCotizacionVenta({
    folio,
    clienteId: input.clienteId,
    subtotal: mon.subtotal,
    iva: mon.iva,
    total: mon.total,
    descuento: mon.descuento,
    motivoDescuento: input.motivoDescuento ?? null,
    vigenciaDesde,
    vigenciaHasta,
    creadaPor: user.id,
  });
  if (!id) throw AppError.business("INTERNAL_ERROR", "No se pudo crear la cotización");
  await repo.insertDetalleCotizacionVenta(id, lineas);

  return getById(id);
}

export async function list(q: { estado?: string; clienteId?: number; folio?: string; page: number; pageSize: number }) {
  const limit = q.pageSize;
  const offset = (q.page - 1) * limit;
  const filtros = { estado: q.estado, clienteId: q.clienteId, folio: q.folio };
  const [rows, totalItems] = await Promise.all([
    repo.listCotizacionesVenta({ ...filtros, limit, offset }),
    repo.countCotizacionesVenta(filtros),
  ]);
  const data = await Promise.all(
    rows.map(async (r) => mapCotizacion(r, await repo.listDetalleCotizacionVenta(r.id)))
  );
  return { data, meta: { page: q.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 } };
}

export async function cambiarEstado(
  id: number,
  nuevoEstado: "aprobada" | "rechazada" | "cancelada",
  motivo: string | undefined,
  _user: { id: number; rol: string }
) {
  const cot = await repo.findCotizacionVenta(id);
  if (!cot) throw AppError.notFound("QUOTE_NOT_FOUND", "Cotización no encontrada");
  const permitido = cot.estado === "emitida" || (cot.estado === "aprobada" && nuevoEstado === "cancelada");
  if (!permitido) {
    throw AppError.conflict("QUOTE_STATE_INVALID", `No se puede pasar de ${cot.estado} a ${nuevoEstado}`);
  }
  if ((nuevoEstado === "rechazada" || nuevoEstado === "cancelada") && !motivo) {
    throw AppError.badRequest("VALIDATION_ERROR", "Se requiere un motivo para rechazar o cancelar");
  }
  if (nuevoEstado === "aprobada" && parseFecha(cot.vigencia_hasta) < today()) {
    await repo.updateCotizacionVentaEstado(null, id, "expirada");
    throw AppError.business("QUOTE_EXPIRED", "La cotización expiró y no puede aprobarse");
  }
  await repo.updateCotizacionVentaEstado(null, id, nuevoEstado);
  return getById(id);
}

export async function convertir(
  id: number,
  input: { metodoPago: string; tipoPago?: "contado" | "credito"; montoRecibido?: number | null },
  user: { id: number; rol: string }
) {
  const cot = await repo.findCotizacionVenta(id);
  if (!cot) throw AppError.notFound("QUOTE_NOT_FOUND", "Cotización no encontrada");
  if (cot.estado !== "aprobada") throw AppError.business("QUOTE_NOT_APPROVED", "La cotización debe estar aprobada para convertirla en venta");
  if (parseFecha(cot.vigencia_hasta) < today()) {
    await repo.updateCotizacionVentaEstado(null, id, "expirada");
    throw AppError.business("QUOTE_EXPIRED", "La cotización expiró y no puede convertirse");
  }

  const detalle = await repo.listDetalleCotizacionVenta(id);
  const lineas = detalle.map((d) => ({ tipo: "producto" as const, productoId: d.producto_id, cantidad: d.cantidad }));

  const venta = await withTransaction(async (c) => {
    const v = await registrarVenta(
      {
        clienteId: cot.cliente_id,
        vendedorId: user.id,
        lineas,
        descuento: Number(cot.descuento),
        motivoDescuento: cot.motivo_descuento ?? undefined,
        tipoPago: input.tipoPago ?? "contado",
        metodoPago: input.metodoPago,
        montoRecibido: input.montoRecibido ?? null,
      },
      user,
      c
    );
    await repo.updateCotizacionVentaEstado(c, id, "convertida");
    return v;
  });

  return { cotizacionId: id, folioCotizacion: cot.folio, venta };
}
