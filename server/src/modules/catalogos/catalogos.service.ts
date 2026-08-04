import { AppError } from "../../shared/errors";
import * as repo from "./catalogos.repository";

export interface CatalogoDTO {
  id: number;
  parentId: number | null;
  nombre: string;
  camposEspecificacion: { clave: string; etiqueta: string }[];
  clavesCompatibilidad: string[];
}

function mapCatalogo(r: repo.CatalogoRow): CatalogoDTO {
  return {
    id: r.id,
    parentId: r.parent_id,
    nombre: r.nombre,
    camposEspecificacion: r.campos_especificacion ?? [],
    clavesCompatibilidad: r.claves_compatibilidad ?? [],
  };
}

export async function list() {
  const rows = await repo.listCatalogos();
  return rows.map(mapCatalogo);
}

export async function getById(id: number) {
  const row = await repo.findCatalogoById(id);
  if (!row) throw AppError.notFound("CATALOGO_NOT_FOUND", "Catálogo no encontrado");
  return mapCatalogo(row);
}

async function validarNombreUnico(nombre: string, parentId: number | null, exceptoId?: number) {
  const rows = await repo.listCatalogos();
  const duplicado = rows.some(
    (r) => r.parent_id === parentId && r.nombre.toLowerCase() === nombre.toLowerCase() && r.id !== exceptoId
  );
  if (duplicado) throw AppError.conflict("CATALOGO_DUPLICADO", "Ya existe un catálogo con ese nombre en el mismo nivel");
}

async function validarSinCiclo(nodoId: number, nuevoParentId: number | null) {
  if (!nuevoParentId || nuevoParentId === nodoId) {
    if (nuevoParentId === nodoId) throw AppError.badRequest("CICLO_CATALOGO", "Un catálogo no puede ser su propio padre");
    return;
  }
  // Un catálogo no puede quedar dentro de su propio descendiente
  let actual: repo.CatalogoRow | undefined = await repo.findCatalogoById(nuevoParentId);
  const visitados = new Set<number>();
  while (actual) {
    if (actual.id === nodoId) throw AppError.badRequest("CICLO_CATALOGO", "El catálogo no puede moverse dentro de sí mismo");
    if (visitados.has(actual.id)) break;
    visitados.add(actual.id);
    if (actual.parent_id === null) break;
    actual = await repo.findCatalogoById(actual.parent_id);
  }
}

export async function create(input: repo.InsertCatalogoInput) {
  if (input.parentId) await getById(input.parentId);
  await validarNombreUnico(input.nombre, input.parentId ?? null);
  const row = await repo.insertCatalogo(input);
  if (!row) throw AppError.business("INTERNAL_ERROR", "No se pudo crear el catálogo");
  return mapCatalogo(row);
}

export async function update(id: number, fields: Record<string, unknown>) {
  const existente = await repo.findCatalogoById(id);
  if (!existente) throw AppError.notFound("CATALOGO_NOT_FOUND", "Catálogo no encontrado");

  const mapped: Record<string, unknown> = {};
  if ("nombre" in fields && fields.nombre !== undefined) mapped.nombre = fields.nombre;
  if ("camposEspecificacion" in fields && fields.camposEspecificacion !== undefined) {
    mapped.campos_especificacion = JSON.stringify(fields.camposEspecificacion);
  }
  if ("clavesCompatibilidad" in fields && fields.clavesCompatibilidad !== undefined) {
    mapped.claves_compatibilidad = JSON.stringify(fields.clavesCompatibilidad);
  }

  let nuevoParentId = existente.parent_id;
  if ("parentId" in fields) {
    nuevoParentId = fields.parentId === null || fields.parentId === undefined ? null : Number(fields.parentId);
    mapped.parent_id = nuevoParentId;
    await validarSinCiclo(id, nuevoParentId);
  }
  if (mapped.nombre !== undefined) {
    await validarNombreUnico(String(mapped.nombre), nuevoParentId, id);
  }

  const row = await repo.updateCatalogo(id, mapped);
  if (!row) throw AppError.notFound("CATALOGO_NOT_FOUND", "Catálogo no encontrado");
  return mapCatalogo(row);
}

export async function remove(id: number) {
  const existente = await repo.findCatalogoById(id);
  if (!existente) throw AppError.notFound("CATALOGO_NOT_FOUND", "Catálogo no encontrado");
  const hijos = await repo.countHijos(id);
  if (hijos > 0) throw AppError.conflict("CATALOGO_CON_HIJOS", "No se puede eliminar: tiene catálogos hijos");
  const productos = await repo.countProductosPorCatalogo(id);
  if (productos > 0) throw AppError.conflict("CATALOGO_CON_PRODUCTOS", "No se puede eliminar: tiene productos asignados");
  await repo.deleteCatalogo(id);
  return { id };
}
