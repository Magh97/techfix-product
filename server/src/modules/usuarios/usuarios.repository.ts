import { query } from "../../shared/db";

export interface UsuarioRow {
  id: number;
  nombre: string;
  usuario: string;
  rol: "admin" | "vendedor" | "tecnico";
  password_hash: string;
  is_active: boolean;
  created_at: string;
}

export function listUsuarios(f: { rol?: string; isActive?: boolean; limit: number; offset: number }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.rol) {
    params.push(f.rol);
    where.push(`rol = $${params.length}`);
  }
  if (f.isActive !== undefined) {
    params.push(f.isActive);
    where.push(`is_active = $${params.length}`);
  }
  params.push(f.limit, f.offset);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query<UsuarioRow>(
    `SELECT id, nombre, usuario, rol, is_active, created_at FROM usuarios ${whereSql} ORDER BY nombre LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countUsuarios(f: { rol?: string; isActive?: boolean }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.rol) {
    params.push(f.rol);
    where.push(`rol = $${params.length}`);
  }
  if (f.isActive !== undefined) {
    params.push(f.isActive);
    where.push(`is_active = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM usuarios ${whereSql}`, params).then(
    (r) => Number(r.rows[0]?.count ?? 0)
  );
}

export function findByUsuario(usuario: string) {
  return query<UsuarioRow>(
    "SELECT id, nombre, usuario, rol, password_hash, is_active FROM usuarios WHERE usuario = $1",
    [usuario]
  ).then((r) => r.rows[0]);
}

export function findById(id: number) {
  return query<UsuarioRow>(
    "SELECT id, nombre, usuario, rol, password_hash, is_active FROM usuarios WHERE id = $1",
    [id]
  ).then((r) => r.rows[0]);
}

export function insertUsuario(input: { nombre: string; usuario: string; passwordHash: string; rol: string }) {
  return query<{ id: number }>(
    "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id",
    [input.nombre, input.usuario, input.passwordHash, input.rol]
  ).then((r) => r.rows[0]?.id);
}

export function updateUsuario(id: number, fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!entries.length) return findById(id);
  const sets = entries.map(([k], i) => `"${k}" = $${i + 1}`);
  const values: unknown[] = entries.map(([, v]) => v);
  values.push(id);
  return query<{ id: number }>(
    `UPDATE usuarios SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING id`,
    values
  ).then((r) => (r.rows[0] ? findById(Number(r.rows[0].id)) : undefined));
}
