import type { PoolClient } from "pg";
import { query } from "../../shared/db";

export interface QuejaRow {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  tipo: string;
  garantia_id: number | null;
  orden_id: number | null;
  orden_folio: string | null;
  venta_id: number | null;
  venta_folio: string | null;
  descripcion: string;
  estado: string;
  resolucion: string | null;
  registrada_por_nombre: string;
  resuelta_por_nombre: string | null;
  resuelta_at: string | null;
  created_at: string;
}

const SELECT_QUEJA = `
  SELECT q.*, c.nombre AS cliente_nombre, u.nombre AS registrada_por_nombre, ur.nombre AS resuelta_por_nombre,
         o.folio AS orden_folio, v.folio AS venta_folio
  FROM quejas q
  JOIN clientes c ON c.id = q.cliente_id
  JOIN usuarios u ON u.id = q.registrada_por
  LEFT JOIN usuarios ur ON ur.id = q.resuelta_por
  LEFT JOIN ordenes_servicio o ON o.id = q.orden_id
  LEFT JOIN ventas v ON v.id = q.venta_id
`;

export function findCliente(clienteId: number) {
  return query<{ id: number }>("SELECT id FROM clientes WHERE id = $1 AND is_active = true", [clienteId]).then(
    (r) => r.rows[0] ?? null
  );
}

export function findGarantiaDeCliente(clienteId: number, garantiaId: number) {
  return query<{ id: number }>("SELECT id FROM garantias WHERE id = $1 AND cliente_id = $2", [garantiaId, clienteId]).then(
    (r) => r.rows[0] ?? null
  );
}

export function insertQueja(
  input: {
    clienteId: number;
    tipo: string;
    garantiaId: number | null;
    ordenId: number | null;
    ventaId: number | null;
    descripcion: string;
    registradaPor: number;
  }
) {
  return query<{ id: number }>(
    `INSERT INTO quejas (cliente_id, tipo, garantia_id, orden_id, venta_id, descripcion, registrada_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [input.clienteId, input.tipo, input.garantiaId, input.ordenId, input.ventaId, input.descripcion, input.registradaPor]
  ).then((r) => r.rows[0]?.id);
}

export interface QuejaFilters {
  clienteId?: number;
  estado?: string;
  tipo?: string;
  limit: number;
  offset: number;
}

function whereQuejas(f: Omit<QuejaFilters, "limit" | "offset">) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.clienteId) {
    params.push(f.clienteId);
    where.push(`q.cliente_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`q.estado = $${params.length}`);
  }
  if (f.tipo) {
    params.push(f.tipo);
    where.push(`q.tipo = $${params.length}`);
  }
  return { where, params };
}

export function listQuejas(f: QuejaFilters) {
  const { where, params } = whereQuejas(f);
  params.push(f.limit, f.offset);
  return query<QuejaRow>(
    `${SELECT_QUEJA}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY q.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countQuejas(f: Omit<QuejaFilters, "limit" | "offset">) {
  const { where, params } = whereQuejas(f);
  return query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM quejas q${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`,
    params
  ).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function findQueja(id: number) {
  return query<QuejaRow>(`${SELECT_QUEJA} WHERE q.id = $1`, [id]).then((r) => r.rows[0] ?? null);
}

export function listClienteQuejas(clienteId: number) {
  return query<QuejaRow>(`${SELECT_QUEJA} WHERE q.cliente_id = $1 ORDER BY q.id DESC`, [clienteId]).then((r) => r.rows);
}

export function actualizarEstadoQueja(
  client: PoolClient,
  id: number,
  campos: { estado: string; resolucion: string | null; resueltaPor: number | null }
) {
  const sets: string[] = ["estado = $2"];
  const vals: unknown[] = [id, campos.estado];
  if (campos.resolucion !== null) {
    sets.push(`resolucion = $${vals.length + 1}`);
    vals.push(campos.resolucion);
  }
  if (campos.estado === "resuelta") {
    sets.push(`resuelta_por = $${vals.length + 1}`);
    vals.push(campos.resueltaPor);
    sets.push(`resuelta_at = NOW()`);
  }
  return client.query(`UPDATE quejas SET ${sets.join(", ")} WHERE id = $1`, vals);
}
