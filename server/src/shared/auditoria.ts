import { query } from "./db";

export interface AuditoriaInput {
  usuarioId: number;
  accion: string;
  entidad: string;
  entidadId?: number;
  antes?: unknown;
  despues?: unknown;
}

export function registrarAuditoria(input: AuditoriaInput) {
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
