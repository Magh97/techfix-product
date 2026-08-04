import type { PoolClient } from "pg";
import { query } from "../../shared/db";

export interface VentaLineaInput {
  tipo: "producto" | "servicio";
  productoId?: number;
  nombre?: string;
  cantidad: number;
  precioNeto?: number;
}

export interface RegistrarVentaInput {
  clienteId?: number | null;
  vendedorId: number;
  ordenId?: number | null;
  lineas: VentaLineaInput[];
  descuento?: number;
  motivoDescuento?: string;
  tipoPago: "contado" | "credito";
  metodoPago?: string;
  plazoDias?: number | null;
  montoRecibido?: number | null;
}

export interface ProductoVentaRow {
  id: number;
  nombre: string;
  precio_venta: string;
  stock: number;
  is_kit: boolean;
  mano_obra: string;
}

export function findProductoParaVenta(client: PoolClient, id: number) {
  return client
    .query<ProductoVentaRow>(
      "SELECT id, nombre, precio_venta, stock, is_kit, mano_obra FROM productos WHERE id = $1 AND is_active = true FOR UPDATE",
      [id]
    )
    .then((r) => r.rows[0]);
}

export interface BomVentaRow {
  componente_id: number;
  nombre: string;
  cantidad: number;
  precio_venta: string;
  stock: number;
}

export function listBomParaVenta(client: PoolClient, kitId: number) {
  return client
    .query<BomVentaRow>(
      `SELECT b.componente_id, p.nombre, b.cantidad, p.precio_venta, p.stock
       FROM producto_bom b
       JOIN productos p ON p.id = b.componente_id AND p.is_active = true
       WHERE b.kit_producto_id = $1
       ORDER BY b.id`,
      [kitId]
    )
    .then((r) => r.rows);
}

export function decrementStock(client: PoolClient, productoId: number, cantidad: number) {
  return client.query(
    "UPDATE productos SET stock = stock - $2, updated_at = NOW() WHERE id = $1 AND stock >= $2 RETURNING id",
    [productoId, cantidad]
  );
}

export function incrementStock(client: PoolClient, productoId: number, cantidad: number) {
  return client.query("UPDATE productos SET stock = stock + $2, updated_at = NOW() WHERE id = $1", [productoId, cantidad]);
}

export function insertPago(
  client: PoolClient,
  data: { ventaId: number; monto: number; metodo: string; usuarioId: number; cajaId?: number | null }
) {
  return client.query(
    "INSERT INTO pagos (venta_id, monto, metodo, usuario_id, caja_id) VALUES ($1,$2,$3,$4,$5)",
    [data.ventaId, data.monto, data.metodo, data.usuarioId, data.cajaId ?? null]
  );
}

export function sumPagos(client: PoolClient, ventaId: number) {
  return client
    .query<{ s: string }>("SELECT COALESCE(SUM(monto),0)::numeric AS s FROM pagos WHERE venta_id = $1", [ventaId])
    .then((r) => Number(r.rows[0]?.s ?? 0));
}

export async function nextVentaFolio(client: PoolClient): Promise<string> {
  const r = await client.query<{ n: string }>("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM ventas");
  return `VEN-${String(Number(r.rows[0]?.n ?? 1)).padStart(4, "0")}`;
}

export interface InsertVentaInput {
  folio: string;
  clienteId: number | null;
  vendedorId: number;
  ordenId: number | null;
  subtotal: number;
  iva: number;
  total: number;
  descuento: number;
  motivoDescuento: string | null;
  tipoPago: "contado" | "credito";
  metodoPago: string | null;
  plazoDias: number | null;
  fechaVencimiento: string | null;
  montoRecibido: number | null;
  cajaId: number | null;
}

export function insertVenta(client: PoolClient, input: InsertVentaInput) {
  return client
    .query<{ id: number }>(
      `INSERT INTO ventas
        (folio, cliente_id, vendedor_id, orden_id, subtotal, iva, total, descuento, motivo_descuento,
         tipo_pago, metodo_pago, plazo_dias, fecha_vencimiento, monto_recibido, caja_id, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'completada') RETURNING id`,
      [
        input.folio,
        input.clienteId,
        input.vendedorId,
        input.ordenId,
        input.subtotal,
        input.iva,
        input.total,
        input.descuento,
        input.motivoDescuento,
        input.tipoPago,
        input.metodoPago,
        input.plazoDias,
        input.fechaVencimiento,
        input.montoRecibido,
        input.cajaId,
      ]
    )
    .then((r) => r.rows[0]?.id);
}

export function insertDetalleVenta(
  client: PoolClient,
  ventaId: number,
  lineas: { descripcion: string; cantidad: number; precio: number; productoId?: number | null }[]
) {
  const valores: unknown[] = [];
  const rows = lineas.map((l, i) => {
    const base = i * 5 + 1;
    valores.push(ventaId, l.productoId ?? null, l.cantidad, l.precio, l.descripcion);
    return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, 0, $${base + 4})`;
  });
  return client.query(
    `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_neto, descuento_linea, descripcion_servicio) VALUES ${rows.join(", ")}`,
    valores
  );
}

export function insertMovimiento(
  client: PoolClient,
  data: { productoId: number; tipo: string; cantidad: number; usuarioId: number; motivo: string }
) {
  return client.query(
    "INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, usuario_id, motivo) VALUES ($1,$2,$3,$4,$5)",
    [data.productoId, data.tipo, data.cantidad, data.usuarioId, data.motivo]
  );
}

export function findCajaAbierta(client: PoolClient, vendedorId: number, fecha: string) {
  return client
    .query<{ id: number }>(
      "SELECT id FROM cajas WHERE usuario_id = $1 AND fecha = $2 AND estado IN ('abierta','reabierta') ORDER BY id DESC LIMIT 1",
      [vendedorId, fecha]
    )
    .then((r) => r.rows[0]?.id ?? null);
}

export function findClienteCredito(client: PoolClient, id: number) {
  return client
    .query<{ id: number; limite_credito: string; plazo_credito_dias: number }>(
      "SELECT id, limite_credito, plazo_credito_dias FROM clientes WHERE id = $1 AND is_active = true",
      [id]
    )
    .then((r) => r.rows[0]);
}

export async function saldoCliente(client: PoolClient, clienteId: number): Promise<number> {
  const ventas = await client.query<{ id: number; total: string }>(
    `SELECT id, total FROM ventas
     WHERE cliente_id = $1 AND tipo_pago = 'credito' AND estado IN ('completada','credito_pendiente','devuelta')`,
    [clienteId]
  );
  let saldo = 0;
  for (const v of ventas.rows) {
    const pagado = await client.query<{ s: string }>(
      "SELECT COALESCE(SUM(monto),0)::numeric AS s FROM pagos WHERE venta_id = $1",
      [v.id]
    );
    saldo += Number(v.total) - Number(pagado.rows[0]?.s ?? 0);
  }
  return Math.max(0, saldo);
}

/* --- Lecturas (pool) --- */

export interface VentaRow {
  id: number;
  folio: string;
  cliente_id: number | null;
  cliente_nombre: string | null;
  vendedor_id: number;
  vendedor_nombre: string;
  orden_id: number | null;
  subtotal: string;
  iva: string;
  total: string;
  descuento: string;
  motivo_descuento: string | null;
  tipo_pago: string;
  metodo_pago: string | null;
  plazo_dias: number | null;
  fecha_vencimiento: string | null;
  monto_recibido: string | null;
  estado: string;
  caja_id: number | null;
  created_at: string;
}

export interface VentaLineaRow {
  id: number;
  venta_id: number;
  producto_id: number | null;
  cantidad: number;
  precio_neto: string;
  descripcion_servicio: string | null;
  nombre_producto: string | null;
}

export interface PagoRow {
  id: number;
  venta_id: number;
  monto: string;
  metodo: string;
  created_at: string;
}

const SELECT_VENTA = `
  SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS vendedor_nombre
  FROM ventas v
  LEFT JOIN clientes c ON c.id = v.cliente_id
  JOIN usuarios u ON u.id = v.vendedor_id
`;

interface VentaFilters {
  desde?: string;
  hasta?: string;
  vendedorId?: number;
  metodoPago?: string;
  estado?: string;
  limit: number;
  offset: number;
}

function buildVentaWhere(f: Omit<VentaFilters, "limit" | "offset">, params: unknown[], prefix = "") {
  const where: string[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`${prefix}v.created_at::date >= $${params.length}`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`${prefix}v.created_at::date <= $${params.length}`);
  }
  if (f.vendedorId) {
    params.push(f.vendedorId);
    where.push(`${prefix}v.vendedor_id = $${params.length}`);
  }
  if (f.metodoPago) {
    params.push(f.metodoPago);
    where.push(`${prefix}v.metodo_pago = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`${prefix}v.estado = $${params.length}`);
  }
  return where;
}

export function listVentas(f: VentaFilters) {
  const params: unknown[] = [];
  const where = buildVentaWhere(f, params);
  params.push(f.limit, f.offset);
  const sql = `${SELECT_VENTA}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY v.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  return query<VentaRow>(sql, params).then((r) => r.rows);
}

export function countVentas(f: Omit<VentaFilters, "limit" | "offset">) {
  const params: unknown[] = [];
  const where = buildVentaWhere(f, params);
  const sql = `SELECT COUNT(*)::int AS count FROM ventas v${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  return query<{ count: string }>(sql, params).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function findVenta(id: number) {
  return query<VentaRow>(`${SELECT_VENTA} WHERE v.id = $1`, [id]).then((r) => r.rows[0]);
}

export function findVentaByFolio(folio: string) {
  return query<VentaRow>(`${SELECT_VENTA} WHERE v.folio = $1`, [folio]).then((r) => r.rows[0]);
}

export function listVentaLineas(ventaId: number) {
  return query<VentaLineaRow>(
    `SELECT dv.*, p.nombre AS nombre_producto FROM detalle_venta dv
     LEFT JOIN productos p ON p.id = dv.producto_id WHERE dv.venta_id = $1 ORDER BY dv.id`,
    [ventaId]
  ).then((r) => r.rows);
}

export function listPagos(ventaId: number) {
  return query<PagoRow>("SELECT * FROM pagos WHERE venta_id = $1 ORDER BY id", [ventaId]).then((r) => r.rows);
}

export function updateVentaEstado(client: PoolClient, ventaId: number, estado: string) {
  return client.query("UPDATE ventas SET estado = $2 WHERE id = $1", [ventaId, estado]);
}
