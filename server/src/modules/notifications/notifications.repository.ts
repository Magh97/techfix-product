import { query } from "../../shared/db";

export interface OrdenNotif {
  id: number;
  folio: string;
  estado: string;
  cliente_id: number;
}

export interface ClienteNotif {
  id: number;
  nombre: string;
  correo: string | null;
  preferencia_contacto: string;
}

export interface PlantillaRow {
  asunto: string | null;
  cuerpo: string | null;
}

export function findOrdenById(ordenId: number) {
  return query<OrdenNotif>("SELECT id, folio, estado, cliente_id FROM ordenes_servicio WHERE id = $1", [ordenId]).then(
    (r) => r.rows[0]
  );
}

export function findClienteById(clienteId: number) {
  return query<ClienteNotif>(
    "SELECT id, nombre, correo, preferencia_contacto FROM clientes WHERE id = $1 AND is_active = true",
    [clienteId]
  ).then((r) => r.rows[0]);
}

export function findPlantilla(tipo: string) {
  return query<PlantillaRow>("SELECT asunto, cuerpo FROM plantillas_notificacion WHERE tipo = $1", [tipo]).then(
    (r) => r.rows[0]
  );
}

export interface InsertNotificacionInput {
  clienteId: number | null;
  ordenId: number | null;
  tipo: string;
  canal: string;
  contenido?: string;
  estado?: "enviado" | "fallido" | "reintento";
  error?: string | null;
}

export function insertNotificacion(input: InsertNotificacionInput) {
  return query(
    `INSERT INTO notificaciones (cliente_id, orden_id, tipo, canal, contenido, estado, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.clienteId,
      input.ordenId,
      input.tipo,
      input.canal,
      input.contenido ?? null,
      input.estado ?? "enviado",
      input.error ?? null,
    ]
  );
}

/* --- Plantillas (NOT-05) y historial (NOT-06) --- */

export function listPlantillas() {
  return query<{ tipo: string; asunto: string | null; cuerpo: string | null }>(
    "SELECT tipo, asunto, cuerpo FROM plantillas_notificacion ORDER BY tipo"
  ).then((r) => r.rows);
}

export function upsertPlantilla(tipo: string, asunto: string | null, cuerpo: string) {
  return query(
    `INSERT INTO plantillas_notificacion (tipo, asunto, cuerpo) VALUES ($1,$2,$3)
     ON CONFLICT (tipo) DO UPDATE SET asunto = EXCLUDED.asunto, cuerpo = EXCLUDED.cuerpo`,
    [tipo, asunto, cuerpo]
  );
}

export interface NotifRow {
  id: number;
  tipo: string;
  canal: string;
  estado: string;
  contenido: string | null;
  error: string | null;
  cliente_id: number | null;
  cliente_nombre: string | null;
  orden_id: number | null;
  orden_folio: string | null;
  created_at: string;
}

export function listNotificaciones(f: { limit: number; offset: number }) {
  return query<NotifRow>(
    `SELECT n.*, c.nombre AS cliente_nombre, o.folio AS orden_folio
     FROM notificaciones n
     LEFT JOIN clientes c ON c.id = n.cliente_id
     LEFT JOIN ordenes_servicio o ON o.id = n.orden_id
     ORDER BY n.id DESC LIMIT $1 OFFSET $2`,
    [f.limit, f.offset]
  ).then((r) => r.rows);
}

export function countNotificaciones() {
  return query<{ count: string }>("SELECT COUNT(*)::int AS count FROM notificaciones").then(
    (r) => Number(r.rows[0]?.count ?? 0)
  );
}
