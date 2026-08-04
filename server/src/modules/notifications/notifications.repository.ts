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
