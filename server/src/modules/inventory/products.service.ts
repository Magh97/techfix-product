import { AppError } from "../../shared/errors";
import * as repo from "./products.repository";

export interface ProductDTO {
  id: number;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  categoriaId: number;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  isKit: boolean;
  isActive: boolean;
}

function mapProduct(r: repo.ProductRow): ProductDTO {
  return {
    id: r.id,
    sku: r.sku,
    codigoBarras: r.codigo_barras,
    nombre: r.nombre,
    marca: r.marca,
    modelo: r.modelo,
    categoriaId: r.categoria_id,
    categoria: r.categoria,
    precioCompra: Number(r.precio_compra),
    precioVenta: Number(r.precio_venta),
    stock: r.stock,
    stockMinimo: r.stock_minimo,
    isKit: r.is_kit,
    isActive: r.is_active,
  };
}

export interface ListQuery {
  q?: string;
  categoria?: string;
  stockBajo?: boolean;
  page: number;
  pageSize: number;
}

export async function list(q: ListQuery) {
  const limit = q.pageSize;
  const offset = (q.page - 1) * limit;
  const filters = { q: q.q, categoria: q.categoria, stockBajo: q.stockBajo };
  const [rows, totalItems] = await Promise.all([
    repo.listProducts({ ...filters, limit, offset }),
    repo.countProducts(filters),
  ]);
  return {
    data: rows.map(mapProduct),
    meta: { page: q.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}

export async function getById(id: number) {
  const row = await repo.findProductById(id);
  if (!row) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  return mapProduct(row);
}

export async function getByCode(codigo: string) {
  const row = await repo.findProductByCode(codigo);
  if (!row) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  return mapProduct(row);
}

export async function create(input: repo.CreateProductInput) {
  const existing = await repo.findProductBySku(input.sku);
  if (existing) throw AppError.conflict("CONFLICT", "El SKU ya existe");
  const row = await repo.createProduct(input);
  if (!row) throw AppError.business("INTERNAL_ERROR", "No se pudo crear el producto");
  return mapProduct(row);
}

const FIELD_MAP: Record<string, string> = {
  categoriaId: "categoria_id",
  codigoBarras: "codigo_barras",
  nombre: "nombre",
  marca: "marca",
  modelo: "modelo",
  precioCompra: "precio_compra",
  precioVenta: "precio_venta",
  stockMinimo: "stock_minimo",
};

export async function update(id: number, fields: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    const col = FIELD_MAP[k];
    if (col) mapped[col] = v;
  }
  const row = await repo.updateProduct(id, mapped);
  if (!row) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  return mapProduct(row);
}

export async function deactivate(id: number) {
  const row = await repo.deactivateProduct(id);
  if (!row) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  return mapProduct(row);
}
