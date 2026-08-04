import * as repo from "./auditoria.repository";

function mapRow(r: repo.AuditoriaRow) {
  return {
    id: r.id,
    usuarioId: r.usuario_id,
    usuarioNombre: r.usuario_nombre,
    accion: r.accion,
    entidad: r.entidad,
    entidadId: r.entidad_id,
    antes: r.antes ?? null,
    despues: r.despues ?? null,
    fecha: r.created_at,
  };
}

export async function list(f: {
  usuarioId?: number;
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  page: number;
  pageSize: number;
}) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros: repo.AuditoriaFiltros = {
    usuarioId: f.usuarioId,
    entidad: f.entidad,
    accion: f.accion,
    desde: f.desde,
    hasta: f.hasta,
  };
  const [rows, totalItems] = await Promise.all([
    repo.listAuditoria({ ...filtros, limit, offset }),
    repo.countAuditoria(filtros),
  ]);
  return {
    data: rows.map(mapRow),
    meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}
