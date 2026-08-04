import { query } from "../../shared/db";

export interface CatalogoRow {
  id: number;
  parent_id: number | null;
  nombre: string;
  campos_especificacion: { clave: string; etiqueta: string }[];
  claves_compatibilidad: string[];
  created_at: string;
}

export function listCatalogos() {
  return query<CatalogoRow>(
    "SELECT * FROM catalogos ORDER BY parent_id NULLS FIRST, nombre"
  ).then((r) => r.rows);
}

export function findCatalogoById(id: number) {
  return query<CatalogoRow>("SELECT * FROM catalogos WHERE id = $1", [id]).then((r) => r.rows[0]);
}

export interface InsertCatalogoInput {
  nombre: string;
  parentId?: number | null;
  camposEspecificacion?: { clave: string; etiqueta: string }[];
  clavesCompatibilidad?: string[];
}

export function insertCatalogo(input: InsertCatalogoInput) {
  return query<CatalogoRow>(
    `INSERT INTO catalogos (nombre, parent_id, campos_especificacion, claves_compatibilidad)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [
      input.nombre,
      input.parentId ?? null,
      JSON.stringify(input.camposEspecificacion ?? []),
      JSON.stringify(input.clavesCompatibilidad ?? []),
    ]
  ).then((r) => r.rows[0]);
}

export function updateCatalogo(id: number, fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!entries.length) return findCatalogoById(id);
  const sets = entries.map(([k], i) => `"${k}" = $${i + 1}`);
  const values: unknown[] = entries.map(([, v]) => v);
  values.push(id);
  return query<CatalogoRow>(`UPDATE catalogos SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`, values).then(
    (r) => r.rows[0]
  );
}

export function deleteCatalogo(id: number) {
  return query("DELETE FROM catalogos WHERE id = $1 RETURNING id", [id]).then((r) => r.rowCount ?? 0);
}

export function countHijos(id: number) {
  return query<{ count: string }>("SELECT COUNT(*)::int AS count FROM catalogos WHERE parent_id = $1", [id]).then(
    (r) => Number(r.rows[0]?.count ?? 0)
  );
}

export function countProductosPorCatalogo(id: number) {
  return query<{ count: string }>("SELECT COUNT(*)::int AS count FROM productos WHERE catalogo_id = $1", [id]).then(
    (r) => Number(r.rows[0]?.count ?? 0)
  );
}
