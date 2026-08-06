import { query } from "../../shared/db";

export interface AuditoriaRow {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  accion: string;
  entidad: string;
  entidad_id: number | null;
  antes: unknown;
  despues: unknown;
  created_at: string;
}

export interface AuditoriaFiltros {
  usuarioId?: number;
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
}

const SELECT = `
  SELECT a.id, a.usuario_id, a.accion, a.entidad, a.entidad_id, a.antes, a.despues, a.created_at,
         u.nombre AS usuario_nombre
  FROM auditoria a
  JOIN usuarios u ON u.id = a.usuario_id
`;

function buildWhere(f: AuditoriaFiltros): { where: string; params: unknown[] } {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.usuarioId) {
    params.push(f.usuarioId);
    where.push(`a.usuario_id = $${params.length}`);
  }
  if (f.entidad) {
    params.push(f.entidad);
    where.push(`a.entidad = $${params.length}`);
  }
  if (f.accion) {
    params.push(f.accion);
    where.push(`a.accion = $${params.length}`);
  }
  if (f.desde) {
    params.push(f.desde);
    where.push(`a.created_at >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`a.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  return { where: where.length ? ` WHERE ${where.join(" AND ")}` : "", params };
}

export function listAuditoria(f: AuditoriaFiltros & { limit: number; offset: number }) {
  const { where, params } = buildWhere(f);
  params.push(f.limit, f.offset);
  return query<AuditoriaRow>(
    `${SELECT}${where} ORDER BY a.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countAuditoria(f: AuditoriaFiltros) {
  const { where, params } = buildWhere(f);
  return query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM auditoria a${where}`, params).then((r) =>
    Number(r.rows[0]?.count ?? 0)
  );
}
