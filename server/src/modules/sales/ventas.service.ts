import type { PoolClient } from "pg";
import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
import { getIvaRate } from "../../shared/config";
import { calcMoney } from "../../shared/money";
import * as repo from "./ventas.repository";

const DESCUENTO_MAX_VENDEDOR = 0.1; // BR-VEN-05
const DIAS_DEVOLUCION = 15; // BR-VEN-08

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string | Date, days: number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface VentaDTO {
  id: number;
  folio: string;
  clienteId: number | null;
  vendedorId: number;
  ordenId: number | null;
  subtotal: number;
  iva: number;
  total: number;
  descuento: number;
  tipoPago: string;
  metodoPago: string | null;
  fechaVencimiento: string | null;
  estado: string;
  cambio: number;
  lineas: { descripcion: string; cantidad: number; precio: number; productoId?: number | null }[];
}

export async function registrarVenta(
  input: repo.RegistrarVentaInput,
  user: { id: number; rol: string },
  client?: PoolClient
): Promise<VentaDTO> {
  const run = async (c: PoolClient): Promise<VentaDTO> => {
    const lineasDetalle: { descripcion: string; cantidad: number; precio: number; productoId?: number | null }[] = [];
    let subtotal = 0;

    for (const l of input.lineas) {
      if (l.tipo === "producto") {
        if (!l.productoId || !l.cantidad || l.cantidad <= 0) {
          throw AppError.badRequest("VALIDATION_ERROR", "Producto requiere cantidad válida");
        }
        const p = await repo.findProductoParaVenta(c, l.productoId);
        if (!p) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
        if (p.stock < l.cantidad) {
          throw AppError.business("INSUFFICIENT_STOCK", `${p.nombre}: stock disponible ${p.stock}`);
        }
        const res = await repo.decrementStock(c, l.productoId, l.cantidad);
        if (!res.rowCount) throw AppError.business("INSUFFICIENT_STOCK", `${p.nombre}: stock insuficiente`);
        const precio = Number(p.precio_venta) * l.cantidad;
        subtotal += precio;
        lineasDetalle.push({ descripcion: p.nombre, cantidad: l.cantidad, precio, productoId: l.productoId });
        await repo.insertMovimiento(c, {
          productoId: l.productoId,
          tipo: "SALIDA_VENTA",
          cantidad: -l.cantidad,
          usuarioId: user.id,
          motivo: "Venta",
        });
      } else {
        const unit = l.precioNeto ?? 0;
        const cantidad = l.cantidad || 1;
        const precio = unit * cantidad;
        subtotal += precio;
        lineasDetalle.push({ descripcion: l.nombre ?? "Servicio", cantidad, precio, productoId: null });
      }
    }

    if (!lineasDetalle.length) throw AppError.badRequest("VALIDATION_ERROR", "La venta requiere al menos una línea");

    const descuento = Math.max(0, input.descuento ?? 0);
    if (descuento > subtotal) throw AppError.badRequest("VALIDATION_ERROR", "El descuento no puede superar el subtotal");
    if (user.rol !== "admin" && descuento > subtotal * DESCUENTO_MAX_VENDEDOR) {
      throw AppError.forbidden("Descuento superior al 10% requiere rol admin (BR-VEN-05)");
    }

    const ivaRate = await getIvaRate();
    const mon = calcMoney(subtotal, descuento, ivaRate);

    let fechaVencimiento: string | null = null;
    let plazoDias: number | null = null;
    if (input.tipoPago === "credito") {
      if (!input.clienteId) throw AppError.badRequest("VALIDATION_ERROR", "La venta a crédito requiere un cliente");
      const cliente = await repo.findClienteCredito(c, input.clienteId);
      if (!cliente) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
      const saldo = await repo.saldoCliente(c, input.clienteId);
      if (saldo + mon.total > Number(cliente.limite_credito)) {
        throw AppError.business("CREDIT_LIMIT_EXCEEDED", `La venta excede el límite de crédito del cliente`);
      }
      plazoDias = input.plazoDias ?? cliente.plazo_credito_dias;
      fechaVencimiento = addDays(today(), plazoDias);
    }

    const cajaId = await repo.findCajaAbierta(c, input.vendedorId, today());
    const folio = await repo.nextVentaFolio(c);
    const ventaId = await repo.insertVenta(c, {
      folio,
      clienteId: input.clienteId ?? null,
      vendedorId: input.vendedorId,
      ordenId: input.ordenId ?? null,
      subtotal: mon.subtotal,
      iva: mon.iva,
      total: mon.total,
      descuento: mon.descuento,
      motivoDescuento: descuento > 0 ? (input.motivoDescuento ?? "Autorizado en caja") : null,
      tipoPago: input.tipoPago,
      metodoPago: input.metodoPago ?? null,
      plazoDias: input.tipoPago === "credito" ? plazoDias : null,
      fechaVencimiento,
      montoRecibido: input.tipoPago === "contado" ? (input.montoRecibido ?? mon.total) : null,
      cajaId,
    });
    if (!ventaId) throw AppError.business("INTERNAL_ERROR", "No se pudo registrar la venta");
    await repo.insertDetalleVenta(c, ventaId, lineasDetalle);

    return {
      id: ventaId,
      folio,
      clienteId: input.clienteId ?? null,
      vendedorId: input.vendedorId,
      ordenId: input.ordenId ?? null,
      subtotal: mon.subtotal,
      iva: mon.iva,
      total: mon.total,
      descuento: mon.descuento,
      tipoPago: input.tipoPago,
      metodoPago: input.metodoPago ?? null,
      fechaVencimiento,
      estado: "completada",
      cambio:
        input.tipoPago === "contado" && input.metodoPago === "efectivo"
          ? Math.max(0, (input.montoRecibido ?? mon.total) - mon.total)
          : 0,
      lineas: lineasDetalle,
    };
  };

  if (client) return run(client);
  return withTransaction(run);
}

/* --- Lecturas --- */

export async function list(f: { desde?: string; hasta?: string; vendedorId?: number; metodoPago?: string; estado?: string; page: number; pageSize: number }) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { desde: f.desde, hasta: f.hasta, vendedorId: f.vendedorId, metodoPago: f.metodoPago, estado: f.estado };
  const [rows, totalItems] = await Promise.all([repo.listVentas({ ...filtros, limit, offset }), repo.countVentas(filtros)]);
  const data = await Promise.all(
    rows.map(async (v) => ({
      id: v.id,
      folio: v.folio,
      clienteId: v.cliente_id,
      clienteNombre: v.cliente_nombre,
      vendedorNombre: v.vendedor_nombre,
      ordenId: v.orden_id,
      subtotal: Number(v.subtotal),
      iva: Number(v.iva),
      total: Number(v.total),
      descuento: Number(v.descuento),
      tipoPago: v.tipo_pago,
      metodoPago: v.metodo_pago,
      fechaVencimiento: v.fecha_vencimiento ? addDays(v.fecha_vencimiento, 0) : null,
      estado: v.estado,
      createdAt: v.created_at,
      lineas: await repo.listVentaLineas(v.id),
    }))
  );
  return { data, meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 } };
}

export async function getById(id: number) {
  const v = await repo.findVenta(id);
  if (!v) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  return {
    id: v.id,
    folio: v.folio,
    clienteId: v.cliente_id,
    clienteNombre: v.cliente_nombre,
    vendedorNombre: v.vendedor_nombre,
    ordenId: v.orden_id,
    subtotal: Number(v.subtotal),
    iva: Number(v.iva),
    total: Number(v.total),
    descuento: Number(v.descuento),
    motivoDescuento: v.motivo_descuento,
    tipoPago: v.tipo_pago,
    metodoPago: v.metodo_pago,
    fechaVencimiento: v.fecha_vencimiento ? addDays(v.fecha_vencimiento, 0) : null,
    montoRecibido: v.monto_recibido ? Number(v.monto_recibido) : null,
    estado: v.estado,
    createdAt: v.created_at,
    lineas: await repo.listVentaLineas(v.id),
    pagos: (await repo.listPagos(v.id)).map((p) => ({ id: p.id, monto: Number(p.monto), metodo: p.metodo, fecha: p.created_at })),
  };
}

export async function getByFolio(folio: string) {
  const v = await repo.findVentaByFolio(folio);
  if (!v) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  return getById(v.id);
}

/* --- Pagos / abonos --- */

export async function registrarAbono(ventaId: number, input: { monto: number; metodo: string }, user: { id: number }) {
  const venta = await repo.findVenta(ventaId);
  if (!venta) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  if (venta.tipo_pago !== "credito") throw AppError.conflict("SALE_NOT_CREDIT", "La venta no es a crédito");

  return withTransaction(async (c) => {
    const saldo = (await repo.sumPagos(c, ventaId)) as number;
    const total = Number(venta.total);
    const pendiente = Math.max(0, total - saldo);
    if (input.monto <= 0 || input.monto > pendiente) {
      throw AppError.business("PAYMENT_INVALID", `Monto inválido: pendiente ${pendiente}`);
    }
    const cajaId = await repo.findCajaAbierta(c, venta.vendedor_id, today());
    await repo.insertPago(c, { ventaId, monto: input.monto, metodo: input.metodo, usuarioId: user.id, cajaId });
    if (Math.abs(pendiente - input.monto) < 0.001) {
      await repo.updateVentaEstado(c, ventaId, "completada");
    }
    return { ventaId, monto: input.monto, saldoPendiente: Math.max(0, pendiente - input.monto) };
  });
}

/* --- Cancelación (admin) y devolución --- */

export async function cancelar(ventaId: number, motivo: string, user: { id: number; rol: string }) {
  if (user.rol !== "admin") throw AppError.forbidden("Solo el administrador puede cancelar ventas");
  const venta = await repo.findVenta(ventaId);
  if (!venta) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  if (venta.estado === "cancelada") throw AppError.conflict("SALE_ALREADY_CANCELLED", "La venta ya está cancelada");

  await withTransaction(async (c) => {
    const lineas = await repo.listVentaLineas(ventaId);
    for (const l of lineas) {
      if (l.producto_id) {
        await repo.incrementStock(c, l.producto_id, l.cantidad);
        await repo.insertMovimiento(c, {
          productoId: l.producto_id,
          tipo: "DEVOLUCION",
          cantidad: l.cantidad,
          usuarioId: user.id,
          motivo: `Cancelación venta ${venta.folio}`,
        });
      }
    }
    await repo.updateVentaEstado(c, ventaId, "cancelada");
  });
  return getById(ventaId);
}

export async function devolucion(
  ventaId: number,
  input: { lineas: { productoId: number; cantidad: number }[] },
  user: { id: number; rol: string }
) {
  const venta = await repo.findVenta(ventaId);
  if (!venta) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  if (venta.estado === "devuelta" || venta.estado === "cancelada") {
    throw AppError.conflict("SALE_ALREADY_PROCESSED", "La venta ya fue devuelta o cancelada");
  }
  const ventana = addDays(venta.created_at, DIAS_DEVOLUCION);
  if (ventana < today()) {
    throw AppError.business("REFUND_WINDOW_EXPIRED", `Solo se aceptan devoluciones dentro de ${DIAS_DEVOLUCION} días (BR-VEN-08)`);
  }

  await withTransaction(async (c) => {
    for (const l of input.lineas) {
      await repo.incrementStock(c, l.productoId, l.cantidad);
      await repo.insertMovimiento(c, {
        productoId: l.productoId,
        tipo: "DEVOLUCION",
        cantidad: l.cantidad,
        usuarioId: user.id,
        motivo: `Devolución venta ${venta.folio}`,
      });
    }
    await repo.updateVentaEstado(c, ventaId, "devuelta");
  });
  return getById(ventaId);
}
