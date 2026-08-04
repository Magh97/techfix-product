import { query } from "../../shared/db";
import type { PoolClient } from "pg";

export interface ProductRow {
  id: number;
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  categoria_id: number;
  categoria: string;
  catalogo_id: number | null;
  especificaciones: Record<string, unknown>;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  stock_minimo: number;
  is_kit: boolean;
  mano_obra: string;
  is_active: boolean;
  kit_disponible: number | null;
}

const SELECT = `
  SELECT p.id, p.sku, p.codigo_barras, p.nombre, p.marca, p.modelo, p.categoria_id,
         c.tipo AS categoria, p.catalogo_id, p.especificaciones, p.precio_compra, p.precio_venta, p.stock, p.stock_minimo, p.is_kit, p.mano_obra, p.is_active,
         CASE WHEN p.is_kit THEN (
           SELECT MIN(FLOOR(comp.stock / b.cantidad))
           FROM producto_bom b
           JOIN productos comp ON comp.id = b.componente_id
           WHERE b.kit_producto_id = p.id
         ) ELSE NULL END AS kit_disponible
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
`;

interface Filters {
  q?: string;
  categoria?: string;
  stockBajo?: boolean;
}

function buildWhere(f: Filters, params: unknown[], prefix = "") {
  const where: string[] = [`${prefix}p.is_active = true`];
  if (f.q) {
    params.push(`%${f.q}%`);
    where.push(`(${prefix}p.nombre ILIKE $${params.length} OR ${prefix}p.marca ILIKE $${params.length} OR ${prefix}p.sku ILIKE $${params.length})`);
  }
  if (f.categoria) {
    params.push(f.categoria);
    where.push(`${prefix}c.tipo = $${params.length}`);
  }
  if (f.stockBajo) {
    where.push(`${prefix}p.stock <= ${prefix}p.stock_minimo`);
  }
  return where.join(" AND ");
}

export function listProducts(f: Filters & { limit: number; offset: number }) {
  const params: unknown[] = [];
  const where = buildWhere(f, params);
  params.push(f.limit, f.offset);
  return query<ProductRow>(`${SELECT} WHERE ${where} ORDER BY p.nombre LIMIT $${params.length - 1} OFFSET $${params.length}`, params).then(
    (r) => r.rows
  );
}

export function countProducts(f: Filters) {
  const params: unknown[] = [];
  const where = buildWhere(f, params);
  return query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE ${where}`, params).then(
    (r) => Number(r.rows[0]?.count ?? 0)
  );
}

export function findProductById(id: number) {
  return query<ProductRow>(`${SELECT} WHERE p.id = $1 AND p.is_active = true`, [id]).then((r) => r.rows[0]);
}

export function findProductByCode(codigo: string) {
  return query<ProductRow>(`${SELECT} WHERE p.codigo_barras = $1 AND p.is_active = true`, [codigo]).then((r) => r.rows[0]);
}

export function findProductBySku(sku: string) {
  return query<ProductRow>(`${SELECT} WHERE p.sku = $1 AND p.is_active = true`, [sku]).then((r) => r.rows[0]);
}

export interface CreateProductInput {
  categoriaId: number;
  sku: string;
  codigoBarras?: string | null;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  catalogoId?: number | null;
  especificaciones?: Record<string, unknown>;
}

function insertColumns(input: CreateProductInput) {
  const cols = ["categoria_id", "sku", "codigo_barras", "nombre", "marca", "modelo", "precio_compra", "precio_venta", "stock", "stock_minimo"];
  const vals: unknown[] = [
    input.categoriaId,
    input.sku,
    input.codigoBarras || null,
    input.nombre,
    input.marca ?? null,
    input.modelo ?? null,
    input.precioCompra,
    input.precioVenta,
    0,
    input.stockMinimo,
  ];
  if (input.catalogoId !== undefined) {
    cols.push("catalogo_id");
    vals.push(input.catalogoId ?? null);
  }
  if (input.especificaciones !== undefined) {
    cols.push("especificaciones");
    vals.push(JSON.stringify(input.especificaciones ?? {}));
  }
  return { cols, vals };
}

export function createProduct(input: CreateProductInput) {
  const { cols, vals } = insertColumns(input);
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  return query<{ id: number }>(
    `INSERT INTO productos (${cols.join(", ")}) VALUES (${placeholders}) RETURNING id`,
    vals
  ).then((r) => (r.rows[0] ? findProductById(Number(r.rows[0].id)) : undefined));
}

export function createProductWithStock(input: CreateProductInput & { stock: number }) {
  const { cols, vals } = insertColumns(input);
  const stockIdx = cols.indexOf("stock");
  vals[stockIdx] = input.stock;
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  return query<{ id: number }>(
    `INSERT INTO productos (${cols.join(", ")}) VALUES (${placeholders}) RETURNING id`,
    vals
  ).then((r) => (r.rows[0] ? findProductById(Number(r.rows[0].id)) : undefined));
}

export function categoriaExists(id: number) {
  return query<{ id: number }>("SELECT id FROM categorias WHERE id = $1", [id]).then((r) => r.rows[0] !== undefined);
}

/* --- BOM / kits (ADR-0003) --- */

export interface ProductoBasicoRow {
  id: number;
  sku: string;
  nombre: string;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  is_kit: boolean;
  is_active: boolean;
}

export function findProductoBasico(id: number) {
  return query<ProductoBasicoRow>(
    "SELECT id, sku, nombre, precio_compra, precio_venta, stock, is_kit, is_active FROM productos WHERE id = $1",
    [id]
  ).then((r) => r.rows[0]);
}

export function listSugerenciasPorCatalogo(catalogoId: number, excluirId: number) {
  return query<ProductRow>(
    `${SELECT} WHERE p.is_active = true AND p.stock > 0 AND p.catalogo_id = $1 AND p.id <> $2 ORDER BY p.nombre`,
    [catalogoId, excluirId]
  ).then((r) => r.rows);
}

export interface BomComponenteRow {
  producto_id: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precio_compra: string;
  precio_venta: string;
  stock: number;
}

export function listBom(kitId: number) {
  return query<BomComponenteRow>(
    `SELECT b.componente_id AS producto_id, p.sku, p.nombre, b.cantidad, p.precio_compra, p.precio_venta, p.stock
     FROM producto_bom b
     JOIN productos p ON p.id = b.componente_id
     WHERE b.kit_producto_id = $1
     ORDER BY p.nombre`,
    [kitId]
  ).then((r) => r.rows);
}

export function countBom(kitId: number) {
  return query<{ c: string }>("SELECT COUNT(*)::int AS c FROM producto_bom WHERE kit_producto_id = $1", [kitId]).then(
    (r) => Number(r.rows[0]?.c ?? 0)
  );
}

export function deleteBom(client: PoolClient, kitId: number) {
  return client.query("DELETE FROM producto_bom WHERE kit_producto_id = $1", [kitId]);
}

export function insertBomComponente(
  client: PoolClient,
  kitId: number,
  componenteId: number,
  cantidad: number
) {
  return client.query(
    "INSERT INTO producto_bom (kit_producto_id, componente_id, cantidad) VALUES ($1,$2,$3)",
    [kitId, componenteId, cantidad]
  );
}

export function updateKitConfig(
  client: PoolClient,
  kitId: number,
  data: { precioCompra: number; precioVenta: number; manoObra: number }
) {
  return client.query(
    `UPDATE productos SET is_kit = true, mano_obra = $2, precio_compra = $3, precio_venta = $4, updated_at = NOW() WHERE id = $1`,
    [kitId, data.manoObra, data.precioCompra, data.precioVenta]
  );
}

export function clearKitConfig(client: PoolClient, kitId: number) {
  return client.query(
    `UPDATE productos SET is_kit = false, mano_obra = 0, updated_at = NOW() WHERE id = $1`,
    [kitId]
  );
}

export function updateProduct(id: number, fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!entries.length) return findProductById(id);
  const sets = entries.map(([k], i) => `"${k}" = $${i + 1}`);
  const values: unknown[] = entries.map(([, v]) => v);
  values.push(id);
  return query<{ id: number }>(
    `UPDATE productos SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING id`,
    values
  ).then((r) => (r.rows[0] ? findProductById(Number(r.rows[0].id)) : undefined));
}

export function deactivateProduct(id: number) {
  return query<{ id: number }>(
    `UPDATE productos SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id]
  ).then((r) => (r.rows[0] ? findProductById(Number(r.rows[0].id)) : undefined));
}
