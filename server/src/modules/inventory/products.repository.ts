import { query } from "../../shared/db";

export interface ProductRow {
  id: number;
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  categoria_id: number;
  categoria: string;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  stock_minimo: number;
  is_kit: boolean;
  is_active: boolean;
}

const SELECT = `
  SELECT p.id, p.sku, p.codigo_barras, p.nombre, p.marca, p.modelo, p.categoria_id,
         c.tipo AS categoria, p.precio_compra, p.precio_venta, p.stock, p.stock_minimo, p.is_kit, p.is_active
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
}

export function createProduct(input: CreateProductInput) {
  return query<{ id: number }>(
    `INSERT INTO productos (categoria_id, sku, codigo_barras, nombre, marca, modelo, precio_compra, precio_venta, stock, stock_minimo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9) RETURNING id`,
    [
      input.categoriaId,
      input.sku,
      input.codigoBarras ?? null,
      input.nombre,
      input.marca ?? null,
      input.modelo ?? null,
      input.precioCompra,
      input.precioVenta,
      input.stockMinimo,
    ]
  ).then((r) => (r.rows[0] ? findProductById(Number(r.rows[0].id)) : undefined));
}

export function createProductWithStock(input: CreateProductInput & { stock: number }) {
  return query<{ id: number }>(
    `INSERT INTO productos (categoria_id, sku, codigo_barras, nombre, marca, modelo, precio_compra, precio_venta, stock, stock_minimo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      input.categoriaId,
      input.sku,
      input.codigoBarras ?? null,
      input.nombre,
      input.marca ?? null,
      input.modelo ?? null,
      input.precioCompra,
      input.precioVenta,
      input.stock,
      input.stockMinimo,
    ]
  ).then((r) => (r.rows[0] ? findProductById(Number(r.rows[0].id)) : undefined));
}

export function categoriaExists(id: number) {
  return query<{ id: number }>("SELECT id FROM categorias WHERE id = $1", [id]).then((r) => r.rows[0] !== undefined);
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
