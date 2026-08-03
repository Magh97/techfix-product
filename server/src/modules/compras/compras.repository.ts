import type { PoolClient } from "pg";
import { query } from "../../shared/db";

export interface CompraRow {
  id: number;
  folio: string;
  proveedor_id: number;
  proveedor_nombre: string;
  estado: "borrador" | "enviada" | "recibida" | "cancelada";
  total_neto: string;
  fecha_vencimiento: string | null;
  creada_por: number;
  creador_nombre: string;
  created_at: string;
}

export interface CompraLineaRow {
  id: number;
  compra_id: number;
  producto_id: number;
  sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: string;
}

export interface PagoProveedorRow {
  id: number;
  compra_id: number;
  monto: string;
  metodo: string;
  usuario_nombre: string;
  created_at: string;
}

const SELECT_COMPRA = `
  SELECT c.*, p.nombre AS proveedor_nombre, u.nombre AS creador_nombre
  FROM compras c
  JOIN proveedores p ON p.id = c.proveedor_id
  JOIN usuarios u ON u.id = c.creada_por
`;

/* --- Writes (transacción) --- */

export async function nextCompraFolio(client: PoolClient): Promise<string> {
  const r = await client.query<{ n: string }>("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM compras");
  return `OC-${String(Number(r.rows[0]?.n ?? 1)).padStart(6, "0")}`;
}

export async function insertCompra(
  client: PoolClient,
  input: { folio: string; proveedorId: number; fechaVencimiento: string | null; totalNeto: number; creadaPor: number }
) {
  const r = await client.query<{ id: number }>(
    `INSERT INTO compras (proveedor_id, folio, estado, total_neto, fecha_vencimiento, creada_por)
     VALUES ($1,$2,'borrador',$3,$4,$5) RETURNING id`,
    [input.proveedorId, input.folio, input.totalNeto, input.fechaVencimiento, input.creadaPor]
  );
  return r.rows[0]?.id;
}

export function insertDetalleCompra(
  client: PoolClient,
  compraId: number,
  lineas: { productoId: number; cantidad: number; precioUnitario: number }[]
) {
  const valores: unknown[] = [];
  const rows = lineas.map((l, i) => {
    const base = i * 4 + 1;
    valores.push(compraId, l.productoId, l.cantidad, l.precioUnitario);
    return `($${base}, $${base + 1}, $${base + 2}, $${base + 3})`;
  });
  return client.query(
    `INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_unitario) VALUES ${rows.join(", ")}`,
    valores
  );
}

export function updateCompraEstado(client: PoolClient, compraId: number, estado: string) {
  return client.query("UPDATE compras SET estado = $2, updated_at = NOW() WHERE id = $1", [compraId, estado]);
}

export async function findProductoCompra(client: PoolClient, productoId: number) {
  const r = await client.query<{ id: number; nombre: string; precio_compra: string; precio_venta: string }>(
    "SELECT id, nombre, precio_compra, precio_venta FROM productos WHERE id = $1 AND is_active = true FOR UPDATE",
    [productoId]
  );
  return r.rows[0];
}

export function incrementStockClient(client: PoolClient, productoId: number, cantidad: number) {
  return client.query("UPDATE productos SET stock = stock + $2, updated_at = NOW() WHERE id = $1", [productoId, cantidad]);
}

export function updatePrecioCompra(client: PoolClient, productoId: number, precio: number) {
  return client.query("UPDATE productos SET precio_compra = $2, updated_at = NOW() WHERE id = $1", [productoId, precio]);
}

export function insertMovimientoEntrada(
  client: PoolClient,
  input: { productoId: number; cantidad: number; usuarioId: number; compraId: number }
) {
  return client.query(
    `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, referencia_id, referencia_tipo, usuario_id, motivo)
     VALUES ($1,'ENTRADA',$2,$3,'compra',$4,$5)`,
    [input.productoId, input.cantidad, input.compraId, input.usuarioId, `Compra ${input.compraId}`]
  );
}

export function insertPrecioHistorial(
  client: PoolClient,
  input: { productoId: number; precioCompra: number; precioVenta: number; usuarioId: number }
) {
  return client.query(
    "INSERT INTO precio_historial (producto_id, precio_compra, precio_venta, usuario_id) VALUES ($1,$2,$3,$4)",
    [input.productoId, input.precioCompra, input.precioVenta, input.usuarioId]
  );
}

export function insertPagoProveedor(
  client: PoolClient,
  input: { compraId: number; monto: number; metodo: string; usuarioId: number }
) {
  return client.query(
    "INSERT INTO pagos_proveedor (compra_id, monto, metodo, usuario_id) VALUES ($1,$2,$3,$4)",
    [input.compraId, input.monto, input.metodo, input.usuarioId]
  );
}

/* --- Lecturas (pool) --- */

export function findCompraById(id: number) {
  return query<CompraRow>(`${SELECT_COMPRA} WHERE c.id = $1`, [id]).then((r) => r.rows[0]);
}

interface CompraFilters {
  proveedorId?: number;
  estado?: string;
  folio?: string;
  limit: number;
  offset: number;
}

export function listCompras(f: CompraFilters) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.proveedorId) {
    params.push(f.proveedorId);
    where.push(`c.proveedor_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`c.estado = $${params.length}`);
  }
  if (f.folio) {
    params.push(`%${f.folio}%`);
    where.push(`c.folio ILIKE $${params.length}`);
  }
  params.push(f.limit, f.offset);
  const sql = `${SELECT_COMPRA}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY c.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  return query<CompraRow>(sql, params).then((r) => r.rows);
}

export function countCompras(f: Omit<CompraFilters, "limit" | "offset">) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.proveedorId) {
    params.push(f.proveedorId);
    where.push(`c.proveedor_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`c.estado = $${params.length}`);
  }
  if (f.folio) {
    params.push(`%${f.folio}%`);
    where.push(`c.folio ILIKE $${params.length}`);
  }
  return query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM compras c${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`,
    params
  ).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function listCompraLineas(compraId: number) {
  return query<CompraLineaRow>(
    `SELECT dc.*, p.sku, p.nombre AS nombre_producto FROM detalle_compra dc
     JOIN productos p ON p.id = dc.producto_id WHERE dc.compra_id = $1 ORDER BY dc.id`,
    [compraId]
  ).then((r) => r.rows);
}

export function listPagosProveedor(compraId: number) {
  return query<PagoProveedorRow>(
    `SELECT pp.*, u.nombre AS usuario_nombre FROM pagos_proveedor pp
     JOIN usuarios u ON u.id = pp.usuario_id WHERE pp.compra_id = $1 ORDER BY pp.id`,
    [compraId]
  ).then((r) => r.rows);
}

export function sumPagosCompra(compraId: number) {
  return query<{ s: string }>(
    "SELECT COALESCE(SUM(monto),0)::numeric AS s FROM pagos_proveedor WHERE compra_id = $1",
    [compraId]
  ).then((r) => Number(r.rows[0]?.s ?? 0));
}

export function listComprasRecibidas() {
  return query<CompraRow>(
    `SELECT c.*, p.nombre AS proveedor_nombre, u.nombre AS creador_nombre
     FROM compras c JOIN proveedores p ON p.id = c.proveedor_id JOIN usuarios u ON u.id = c.creada_por
     WHERE c.estado = 'recibida' ORDER BY c.id DESC LIMIT 200`
  ).then((r) => r.rows);
}
