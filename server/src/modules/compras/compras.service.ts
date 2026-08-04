import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
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
  const pagado = pagos.reduce((a, p) => a + toNum(p.monto), 0);
  return {
    id: c.id,
    folio: c.folio,
    proveedorId: c.proveedor_id,
    proveedorNombre: c.proveedor_nombre,
    estado: c.estado,
    estadoLabel: ESTADO_COMPRA_LABEL[c.estado],
    total,
    saldo: Math.max(0, total - pagado),
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
      precioUnitario: toNum(l.precio_unitario),
      subtotal: l.cantidad * toNum(l.precio_unitario),
    })),
    pagos: pagos.map((p) => ({ id: p.id, monto: toNum(p.monto), metodo: p.metodo, usuario: p.usuario_nombre, fecha: p.created_at })),
  };
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

export async function recibir(compraId: number, user: { id: number; rol: Rol }) {
  const c = await repo.findCompraById(compraId);
  if (!c) throw AppError.notFound("PURCHASE_NOT_FOUND", "Compra no encontrada");
  validarTransicionCompra(c.estado, "recibida", user.rol);

  await withTransaction(async (client) => {
    const lineas = await repo.listCompraLineas(compraId);
    if (!lineas.length) throw AppError.business("PURCHASE_EMPTY", "La compra no tiene líneas");
    for (const l of lineas) {
      const producto = await repo.findProductoCompra(client, l.producto_id);
      if (!producto) throw AppError.notFound("PRODUCT_NOT_FOUND", `Producto ${l.producto_id} no encontrado`);
      await repo.incrementStockClient(client, l.producto_id, l.cantidad);
      await repo.insertMovimientoEntrada(client, {
        productoId: l.producto_id,
        cantidad: l.cantidad,
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
    }
    await repo.updateCompraEstado(client, compraId, "recibida");
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
  if (c.estado !== "recibida") {
    throw AppError.conflict("PURCHASE_NOT_RECEIVED", "Solo se puede pagar una compra recibida");
  }
  const pagado = await repo.sumPagosCompra(compraId);
  const pendiente = Math.max(0, toNum(c.total_neto) - pagado);
  if (input.monto <= 0 || input.monto > pendiente) {
    throw AppError.business("PAYMENT_INVALID", `Monto inválido: pendiente ${pendiente}`);
  }
  await withTransaction((client) => repo.insertPagoProveedor(client, { compraId, monto: input.monto, metodo: input.metodo, usuarioId: user.id }));
  return { compraId, monto: input.monto, saldoPendiente: Math.max(0, pendiente - input.monto) };
}

export async function cxp(estado?: string) {
  const compras = await repo.listComprasRecibidas();
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
    const saldo = Math.max(0, toNum(c.total_neto) - pagado);
    const vencido = c.fecha_vencimiento && String(c.fecha_vencimiento).slice(0, 10) < hoyF && saldo > 0;
    const est = saldo <= 0 ? "pagado" : vencido ? "vencido" : "vigente";
    if (estado && est !== estado) continue;
    items.push({
      compraId: c.id,
      folio: c.folio,
      proveedorId: c.proveedor_id,
      proveedorNombre: c.proveedor_nombre,
      total: toNum(c.total_neto),
      saldo,
      fechaVencimiento: c.fecha_vencimiento ? String(c.fecha_vencimiento).slice(0, 10) : null,
      estado: est,
    });
  }
  return items;
}
