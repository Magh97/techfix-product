import { query } from "../../shared/db";

export interface ProveedorRow {
  id: number;
  nombre: string;
  contacto: string | null;
  condiciones_pago: string | null;
  is_active: boolean;
  created_at: string;
}

export function listProveedores(f: { q?: string; limit: number; offset: number }) {
  const params: unknown[] = [];
  const where: string[] = ["is_active = true"];
  if (f.q) {
    params.push(`%${f.q}%`);
    where.push(`(nombre ILIKE $${params.length} OR contacto ILIKE $${params.length})`);
  }
  params.push(f.limit, f.offset);
  return query<ProveedorRow>(
    `SELECT * FROM proveedores WHERE ${where.join(" AND ")} ORDER BY nombre LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countProveedores(q?: string) {
  const params: unknown[] = [];
  const where: string[] = ["is_active = true"];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(nombre ILIKE $${params.length} OR contacto ILIKE $${params.length})`);
  }
  return query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM proveedores WHERE ${where.join(" AND ")}`, params).then(
    (r) => Number(r.rows[0]?.count ?? 0)
  );
}

export interface InsertProveedorInput {
  nombre: string;
  contacto?: string | null;
  condicionesPago?: string | null;
}

export function insertProveedor(input: InsertProveedorInput) {
  return query<ProveedorRow>(
    "INSERT INTO proveedores (nombre, contacto, condiciones_pago) VALUES ($1,$2,$3) RETURNING *",
    [input.nombre, input.contacto ?? null, input.condicionesPago ?? null]
  ).then((r) => r.rows[0]);
}

export function findProveedorById(id: number) {
  return query<ProveedorRow>("SELECT * FROM proveedores WHERE id = $1 AND is_active = true", [id]).then((r) => r.rows[0]);
}

export function updateProveedor(id: number, fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!entries.length) return findProveedorById(id);
  const sets = entries.map(([k], i) => `"${k}" = $${i + 1}`);
  const values: unknown[] = entries.map(([, v]) => v);
  values.push(id);
  return query<ProveedorRow>(`UPDATE proveedores SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values).then(
    (r) => r.rows[0]
  );
}

export function softDeleteProveedor(id: number) {
  return query("UPDATE proveedores SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id", [id]).then(
    (r) => r.rowCount ?? 0
  );
}

export function countComprasActivas(proveedorId: number) {
  return query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM compras WHERE proveedor_id = $1 AND estado <> 'cancelada'",
    [proveedorId]
  ).then((r) => Number(r.rows[0]?.count ?? 0));
}

export interface AuditoriaInput {
  usuarioId: number;
  accion: string;
  entidad: string;
  entidadId?: number;
  antes?: unknown;
  despues?: unknown;
}

export function insertAuditoria(input: AuditoriaInput) {
  return query(
    "INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, antes, despues) VALUES ($1,$2,$3,$4,$5,$6)",
    [
      input.usuarioId,
      input.accion,
      input.entidad,
      input.entidadId ?? null,
      input.antes !== undefined ? JSON.stringify(input.antes) : null,
      input.despues !== undefined ? JSON.stringify(input.despues) : null,
    ]
  );
}
