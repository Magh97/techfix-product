import { query } from "../../shared/db";

export interface CatalogoRow {
  id: number;
  parent_id: number | null;
  nombre: string;
  tags_sugeridas: string[];
  tags_compatibilidad: string[];
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
  tagsSugeridas?: string[];
  tagsCompatibilidad?: string[];
}

export function insertCatalogo(input: InsertCatalogoInput) {
  return query<CatalogoRow>(
    `INSERT INTO catalogos (nombre, parent_id, tags_sugeridas, tags_compatibilidad)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [
      input.nombre,
      input.parentId ?? null,
      JSON.stringify(input.tagsSugeridas ?? []),
      JSON.stringify(input.tagsCompatibilidad ?? []),
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

// Profundidad del nodo (raíz = 1) mediante CTE recursiva
export function profundidadCatalogo(id: number) {
  return query<{ profundidad: string }>(
    `WITH RECURSIVE cadena AS (
       SELECT id, parent_id, 1 AS nivel FROM catalogos WHERE id = $1
       UNION ALL
       SELECT c.id, c.parent_id, x.nivel + 1 FROM catalogos c JOIN cadena x ON c.id = x.parent_id
     )
     SELECT MAX(nivel) AS profundidad FROM cadena`,
    [id]
  ).then((r) => Number(r.rows[0]?.profundidad ?? 0));
}
