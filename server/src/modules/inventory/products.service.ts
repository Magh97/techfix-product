import { AppError } from "../../shared/errors";
import type { Response } from "express";
import { withTransaction } from "../../shared/db";
import { sendExport, type ExportColumn } from "../../shared/export";
import { registrarAuditoria } from "../../shared/auditoria";
import { findCatalogoById } from "../catalogos/catalogos.repository";
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
  catalogoId: number | null;
  especificaciones: string[];
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  lowStock: boolean;
  isKit: boolean;
  manoObra: number;
  isActive: boolean;
  kitDisponible: number | null;
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
    catalogoId: r.catalogo_id,
    especificaciones: r.especificaciones ?? [],
    precioCompra: Number(r.precio_compra),
    precioVenta: Number(r.precio_venta),
    stock: r.stock,
    stockMinimo: r.stock_minimo,
    lowStock: r.stock <= r.stock_minimo,
    isKit: r.is_kit,
    manoObra: Number(r.mano_obra),
    isActive: r.is_active,
    kitDisponible: r.is_kit ? (r.kit_disponible ?? 0) : null,
  };
}

export interface ListQuery {
  q?: string;
  categoria?: string;
  catalogoId?: number;
  stockBajo?: boolean;
  page: number;
  pageSize: number;
}

export async function list(q: ListQuery) {
  const limit = q.pageSize;
  const offset = (q.page - 1) * limit;
  const filters = { q: q.q, categoria: q.categoria, catalogoId: q.catalogoId, stockBajo: q.stockBajo };
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

async function raizCatalogo(catalogoId: number): Promise<number | null> {
  let c = await findCatalogoById(catalogoId);
  if (!c) return null;
  while (c.parent_id != null) {
    const padre = await findCatalogoById(c.parent_id);
    if (!padre) break;
    c = padre;
  }
  return c.id;
}

export async function create(input: repo.CreateProductInput, user: { id: number }) {
  const existing = await repo.findProductBySku(input.sku);
  if (existing) throw AppError.conflict("CONFLICT", "El SKU ya existe");

  // Regla de negocio: la categoría siempre es la raíz del catálogo seleccionado
  let categoriaId = input.categoriaId;
  if (input.catalogoId) {
    const raiz = await raizCatalogo(input.catalogoId);
    if (!raiz) throw AppError.notFound("CATALOG_NOT_FOUND", "Catálogo no encontrado");
    categoriaId = raiz;
  }
  if (!(await repo.categoriaExists(categoriaId))) {
    throw AppError.badRequest("CATEGORIA_INVALIDA", "La categoría debe ser un catálogo raíz");
  }

  const row = await repo.createProduct({ ...input, categoriaId });
  if (!row) throw AppError.business("INTERNAL_ERROR", "No se pudo crear el producto");
  await registrarAuditoria({ usuarioId: user.id, accion: "CREAR", entidad: "producto", entidadId: row.id, despues: { sku: row.sku, nombre: row.nombre } });
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
  catalogoId: "catalogo_id",
};

export async function update(id: number, fields: Record<string, unknown>, user: { id: number }) {
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    const col = FIELD_MAP[k];
    if (col) mapped[col] = v;
    if (k === "especificaciones" && v !== undefined) mapped.especificaciones = JSON.stringify(v);
  }
  const antes = await repo.findProductById(id);

  // Consistencia: si cambia el catálogo, la categoría se recalcula a su raíz
  if (mapped.catalogo_id !== undefined) {
    if (mapped.catalogo_id) {
      const raiz = await raizCatalogo(Number(mapped.catalogo_id));
      if (!raiz) throw AppError.notFound("CATALOG_NOT_FOUND", "Catálogo no encontrado");
      mapped.categoria_id = raiz;
    } else {
      delete mapped.categoria_id;
    }
  }
  if (mapped.categoria_id !== undefined && !(await repo.categoriaExists(Number(mapped.categoria_id)))) {
    throw AppError.badRequest("CATEGORIA_INVALIDA", "La categoría debe ser un catálogo raíz");
  }

  const row = await repo.updateProduct(id, mapped);
  if (!row) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  await registrarAuditoria({
    usuarioId: user.id,
    accion: "EDITAR",
    entidad: "producto",
    entidadId: id,
    antes: antes ? { nombre: antes.nombre, sku: antes.sku } : undefined,
    despues: { nombre: row.nombre, sku: row.sku },
  });
  return mapProduct(row);
}

export async function deactivate(id: number) {
  const row = await repo.deactivateProduct(id);
  if (!row) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  return mapProduct(row);
}

/* --- Ajustes de inventario y movimientos (INV-05, INV-06) --- */

export async function ajustar(id: number, input: { cantidad: number; motivo: string }, user: { id: number }) {
  const producto = await repo.findProductById(id);
  if (!producto) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  await withTransaction(async (client) => {
    const res = await repo.ajustarStock(client, id, input.cantidad);
    if (!res.rowCount) throw AppError.business("STOCK_NEGATIVO", "El ajuste dejaría el stock en negativo");
    await repo.insertMovimientoAjuste(client, {
      productoId: id,
      cantidad: input.cantidad,
      usuarioId: user.id,
      motivo: input.motivo,
    });
  });
  const actual = await repo.findProductById(id);
  return mapProduct(actual!);
}

export async function movimientos(id: number, page = 1, pageSize = 20) {
  const [rows, totalItems] = await Promise.all([
    repo.listMovimientos(id, { limit: pageSize, offset: (page - 1) * pageSize }),
    repo.countMovimientos(id),
  ]);
  return {
    data: rows.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      cantidad: m.cantidad,
      motivo: m.motivo,
      usuario: m.usuario_nombre,
      referenciaId: m.referencia_id,
      referenciaTipo: m.referencia_tipo,
      fecha: m.created_at,
    })),
    meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) || 1 },
  };
}

/* --- Sustitución (taxonomía) --- */

interface SustitutoDTO {
  id: number;
  sku: string;
  nombre: string;
  precioVenta: number;
  stock: number;
  especificaciones: string[];
}

async function sustitutosDe(productoId: number, source: repo.ProductRow): Promise<SustitutoDTO[]> {
  if (!source.catalogo_id) return [];
  const catalogo = await findCatalogoById(source.catalogo_id);
  const candidatos = await repo.listSugerenciasPorCatalogo(source.catalogo_id, productoId);
  const compat = catalogo?.tags_compatibilidad ?? [];
  const tags = source.especificaciones ?? [];
  return candidatos
    .filter((c) => {
      if (!compat.length) return true;
      const tagsC = c.especificaciones ?? [];
      return compat.some((t: string) => tags.includes(t) && tagsC.includes(t));
    })
    .map((c) => ({
      id: c.id,
      sku: c.sku,
      nombre: c.nombre,
      precioVenta: Number(c.precio_venta),
      stock: c.stock,
      especificaciones: c.especificaciones ?? [],
    }));
}

export async function sugerencias(productoId: number) {
  const producto = await repo.findProductById(productoId);
  if (!producto) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");

  const sustitutos = await sustitutosDe(productoId, producto);

  let componenteCorto: { productoId: number; nombre: string; stock: number; requerido: number } | null = null;
  let sustitutosComponente: SustitutoDTO[] = [];

  if (producto.is_kit && (producto.kit_disponible ?? 0) <= 0) {
    const componentes = await repo.listBom(productoId);
    const corto = componentes.find((c) => c.stock < c.cantidad);
    if (corto) {
      componenteCorto = { productoId: corto.producto_id, nombre: corto.nombre, stock: corto.stock, requerido: corto.cantidad };
      const compRow = await repo.findProductById(corto.producto_id);
      if (compRow) sustitutosComponente = await sustitutosDe(corto.producto_id, compRow);
    }
  }

  const catalogo = producto.catalogo_id ? await findCatalogoById(producto.catalogo_id) : undefined;
  return {
    producto: { id: producto.id, nombre: producto.nombre, catalogoId: producto.catalogo_id, catalogoNombre: catalogo?.nombre ?? null },
    componenteCorto,
    sustitutos,
    sustitutosComponente,
  };
}

/* --- BOM / kits (ADR-0003) --- */

export async function getBom(kitId: number) {
  const kit = await repo.findProductById(kitId);
  if (!kit) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");
  if (!kit.is_kit) {
    throw AppError.badRequest("NOT_A_KIT", "El producto no es un kit ensamblable");
  }
  const componentes = await repo.listBom(kitId);
  return {
    kitId: kit.id,
    nombre: kit.nombre,
    manoObra: Number(kit.mano_obra),
    precioCompra: Number(kit.precio_compra),
    precioVenta: Number(kit.precio_venta),
    componentes: componentes.map((c) => ({
      productoId: c.producto_id,
      sku: c.sku,
      nombre: c.nombre,
      cantidad: c.cantidad,
      precioCompra: Number(c.precio_compra),
      precioVenta: Number(c.precio_venta),
      stock: c.stock,
    })),
  };
}

export async function setBom(
  kitId: number,
  input: { componentes: { productoId: number; cantidad: number }[]; manoObra?: number }
) {
  const kit = await repo.findProductoBasico(kitId);
  if (!kit || !kit.is_active) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");

  // Componentes vacíos → quitar el kit (is_kit=false), conservando el precio
  if (!input.componentes.length) {
    await withTransaction(async (client) => {
      await repo.deleteBom(client, kitId);
      await repo.clearKitConfig(client, kitId);
    });
    const actual = await repo.findProductoBasico(kitId);
    return {
      kitId,
      nombre: kit.nombre,
      manoObra: 0,
      precioCompra: Number(actual?.precio_compra ?? 0),
      precioVenta: Number(actual?.precio_venta ?? 0),
      componentes: [],
    };
  }

  const vistos = new Set<number>();
  const componentes: { id: number; cantidad: number; precioCompra: number; precioVenta: number }[] = [];
  for (const c of input.componentes) {
    if (c.productoId === kitId) throw AppError.badRequest("SELF_REFERENCE", "Un kit no puede incluirse a sí mismo");
    if (vistos.has(c.productoId)) throw AppError.badRequest("DUPLICATED_COMPONENT", `Componente ${c.productoId} duplicado`);
    vistos.add(c.productoId);
    const comp = await repo.findProductoBasico(c.productoId);
    if (!comp || !comp.is_active) throw AppError.notFound("COMPONENT_NOT_FOUND", `Componente ${c.productoId} no encontrado`);
    if (comp.is_kit) throw AppError.badRequest("KIT_NESTED", `El componente ${comp.nombre} es un kit: no se permiten kits anidados`);
    componentes.push({
      id: comp.id,
      cantidad: c.cantidad,
      precioCompra: Number(comp.precio_compra),
      precioVenta: Number(comp.precio_venta),
    });
  }

  const manoObra = input.manoObra ?? 0;
  const precioCompra = componentes.reduce((acc, c) => acc + c.precioCompra * c.cantidad, 0);
  const precioVenta = componentes.reduce((acc, c) => acc + c.precioVenta * c.cantidad, 0) + manoObra;

  await withTransaction(async (client) => {
    await repo.deleteBom(client, kitId);
    for (const c of componentes) {
      await repo.insertBomComponente(client, kitId, c.id, c.cantidad);
    }
    await repo.updateKitConfig(client, kitId, { precioCompra, precioVenta, manoObra });
  });

  return getBom(kitId);
}

export async function exportarCatalogo(res: Response, formato: "csv" | "xlsx") {
  const rows = await repo.listProducts({ limit: 100_000, offset: 0 });
  const columns: ExportColumn[] = [
    { header: "SKU", key: "sku" },
    { header: "Codigo barras", key: "codigo_barras" },
    { header: "Nombre", key: "nombre" },
    { header: "Marca", key: "marca" },
    { header: "Modelo", key: "modelo" },
    { header: "Categoria", key: "categoria" },
    { header: "Stock", key: "stock" },
    { header: "Stock minimo", key: "stock_minimo" },
    { header: "Precio compra", key: "precio_compra" },
    { header: "Precio venta", key: "precio_venta" },
  ];
  const data = rows.map((r) => ({
    sku: r.sku,
    codigo_barras: r.codigo_barras,
    nombre: r.nombre,
    marca: r.marca,
    modelo: r.modelo,
    categoria: r.categoria,
    stock: r.stock,
    stock_minimo: r.stock_minimo,
    precio_compra: Number(r.precio_compra),
    precio_venta: Number(r.precio_venta),
  }));
  return sendExport(res, { formato, filename: "catalogo-productos", columns, rows: data });
}
