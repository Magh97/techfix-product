import type { PoolClient } from "pg";
import { query } from "../../shared/db";

export interface CotizacionVentaRow {
  id: number;
  folio: string;
  cliente_id: number;
  cliente_nombre: string;
  estado: string;
  subtotal: string;
  iva: string;
  total: string;
  descuento: string;
  motivo_descuento: string | null;
  vigencia_desde: string;
  vigencia_hasta: string;
  creada_por: number;
  creador_nombre: string;
  created_at: string;
}

export interface DetalleCotizacionVentaRow {
  producto_id: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precio_neto: string;
}

const SELECT_COTIZACION = `
  SELECT cv.*, c.nombre AS cliente_nombre, u.nombre AS creador_nombre
  FROM cotizaciones_venta cv
  JOIN clientes c ON c.id = cv.cliente_id
  JOIN usuarios u ON u.id = cv.creada_por
`;

export function nextCotizacionVentaFolio() {
  return query<{ n: string }>("SELECT COALESCE(MAX(id),0)+1 AS n FROM cotizaciones_venta").then(
    (r) => `CV-${String(Number(r.rows[0]?.n ?? 1)).padStart(4, "0")}`
  );
}

export function clienteExiste(id: number) {
  return query<{ id: number }>("SELECT id FROM clientes WHERE id = $1 AND is_active = true", [id]).then(
    (r) => r.rows[0] !== undefined
  );
}

export function findProductoQuote(id: number) {
  return query<{ id: number; nombre: string; precio_venta: string; stock: number }>(
    "SELECT id, nombre, precio_venta, stock FROM productos WHERE id = $1 AND is_active = true",
    [id]
  ).then((r) => r.rows[0]);
}

export interface InsertCotizacionInput {
  folio: string;
  clienteId: number;
  subtotal: number;
  iva: number;
  total: number;
  descuento: number;
  motivoDescuento: string | null;
  vigenciaDesde: string;
  vigenciaHasta: string;
  creadaPor: number;
}

export function insertCotizacionVenta(input: InsertCotizacionInput) {
  return query<{ id: number }>(
    `INSERT INTO cotizaciones_venta
      (folio, cliente_id, subtotal, iva, total, descuento, motivo_descuento, vigencia_desde, vigencia_hasta, creada_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      input.folio,
      input.clienteId,
      input.subtotal,
      input.iva,
      input.total,
      input.descuento,
      input.motivoDescuento,
      input.vigenciaDesde,
      input.vigenciaHasta,
      input.creadaPor,
    ]
  ).then((r) => r.rows[0]?.id);
}

export function insertDetalleCotizacionVenta(
  cotizacionId: number,
  lineas: { productoId: number; cantidad: number; precioNeto: number }[]
) {
  const valores: unknown[] = [];
  const rows = lineas.map((l, i) => {
    const base = i * 4 + 1;
    valores.push(cotizacionId, l.productoId, l.cantidad, l.precioNeto);
    return `($${base}, $${base + 1}, $${base + 2}, $${base + 3})`;
  });
  return query(
    `INSERT INTO detalle_cotizacion_venta (cotizacion_id, producto_id, cantidad, precio_neto) VALUES ${rows.join(", ")}`,
    valores
  );
}

export function findCotizacionVenta(id: number) {
  return query<CotizacionVentaRow>(`${SELECT_COTIZACION} WHERE cv.id = $1`, [id]).then((r) => r.rows[0]);
}

export function findCotizacionVentaByFolio(folio: string) {
  return query<CotizacionVentaRow>(`${SELECT_COTIZACION} WHERE cv.folio = $1`, [folio]).then((r) => r.rows[0]);
}

export function listDetalleCotizacionVenta(cotizacionId: number) {
  return query<DetalleCotizacionVentaRow>(
    `SELECT d.producto_id, p.sku, p.nombre, d.cantidad, d.precio_neto
     FROM detalle_cotizacion_venta d
     JOIN productos p ON p.id = d.producto_id
     WHERE d.cotizacion_id = $1 ORDER BY d.id`,
    [cotizacionId]
  ).then((r) => r.rows);
}

export interface QuoteFilters {
  estado?: string;
  clienteId?: number;
  folio?: string;
  limit: number;
  offset: number;
}

function buildWhere(f: Omit<QuoteFilters, "limit" | "offset">, params: unknown[]) {
  const where: string[] = [];
  if (f.estado) {
    params.push(f.estado);
    where.push(`cv.estado = $${params.length}`);
  }
  if (f.clienteId) {
    params.push(f.clienteId);
    where.push(`cv.cliente_id = $${params.length}`);
  }
  if (f.folio) {
    params.push(`%${f.folio}%`);
    where.push(`cv.folio ILIKE $${params.length}`);
  }
  return where;
}

export function listCotizacionesVenta(f: QuoteFilters) {
  const params: unknown[] = [];
  const where = buildWhere(f, params);
  params.push(f.limit, f.offset);
  const sql = `${SELECT_COTIZACION}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY cv.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  return query<CotizacionVentaRow>(sql, params).then((r) => r.rows);
}

export function countCotizacionesVenta(f: Omit<QuoteFilters, "limit" | "offset">) {
  const params: unknown[] = [];
  const where = buildWhere(f, params);
  const sql = `SELECT COUNT(*)::int AS count FROM cotizaciones_venta cv${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  return query<{ count: string }>(sql, params).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function updateCotizacionVentaEstado(client: PoolClient | null, id: number, estado: string) {
  const sql = "UPDATE cotizaciones_venta SET estado = $2, updated_at = NOW() WHERE id = $1";
  if (client) return client.query(sql, [id, estado]);
  return query(sql, [id, estado]);
}
