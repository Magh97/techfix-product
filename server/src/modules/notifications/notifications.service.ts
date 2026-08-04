import { AppError } from "../../shared/errors";
import { sendMail } from "./mailer";
import { PLANTILLAS, renderPlantilla, tipoNotificacion } from "./plantillas";
import * as repo from "./notifications.repository";

export interface NotificarInput {
  tipo: "listo" | "cotizacion";
  canal?: string;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

async function enviarCorreo(orden: repo.OrdenNotif, tipo: string) {
  const cliente = await repo.findClienteById(orden.cliente_id);
  const vars = { cliente: cliente?.nombre ?? "", folio: orden.folio, fecha: hoy() };

  if (!cliente?.correo) {
    await repo.insertNotificacion({
      clienteId: orden.cliente_id,
      ordenId: orden.id,
      tipo,
      canal: "correo",
      estado: "fallido",
      error: "cliente sin correo",
      contenido: `Notificación ${tipo} · orden ${orden.folio}`,
    });
    return { enviado: false, motivo: "SIN_CORREO", folio: orden.folio };
  }

  const dbPlantilla = await repo.findPlantilla(tipo);
  const { asunto, cuerpo } = renderPlantilla(tipo, vars, dbPlantilla);
  const result = await sendMail({ to: cliente.correo, subject: asunto, body: cuerpo });

  await repo.insertNotificacion({
    clienteId: orden.cliente_id,
    ordenId: orden.id,
    tipo,
    canal: "correo",
    estado: result.ok ? "enviado" : "fallido",
    error: result.ok ? null : result.error,
    contenido: cuerpo,
  });

  return { enviado: result.ok, canal: "correo", folio: orden.folio, simulated: result.simulated, error: result.error ?? null };
}

export async function notificar(ordenId: number, input: NotificarInput) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (input.tipo === "listo" && orden.estado !== "listo") {
    throw AppError.business("ORDER_NOT_READY", "La orden debe estar en estado listo para notificar");
  }
  const tipo = tipoNotificacion(input.tipo);
  return enviarCorreo(orden, tipo);
}

// NOT-01: notificación automática de retraso (disparada por el worker)
export async function notificarRetraso(ordenId: number) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) return { enviado: false, motivo: "SIN_ORDEN" };
  return enviarCorreo(orden, tipoNotificacion("retraso"));
}

/* --- Plantillas (NOT-05) y historial (NOT-06) --- */

export async function listPlantillas() {
  const db = await repo.listPlantillas();
  const mapa = new Map(db.map((p) => [p.tipo, p]));
  const tipos = Object.keys(PLANTILLAS);
  return tipos.map((tipo) => ({
    tipo,
    asunto: mapa.get(tipo)?.asunto ?? PLANTILLAS[tipo]!.asunto,
    cuerpo: mapa.get(tipo)?.cuerpo ?? PLANTILLAS[tipo]!.cuerpo,
  }));
}

export async function upsertPlantilla(tipo: string, input: { asunto?: string | null; cuerpo: string }) {
  await repo.upsertPlantilla(tipo, input.asunto ?? null, input.cuerpo);
  return { tipo, asunto: input.asunto ?? null, cuerpo: input.cuerpo };
}

export async function historial(page = 1, pageSize = 20) {
  const [rows, totalItems] = await Promise.all([
    repo.listNotificaciones({ limit: pageSize, offset: (page - 1) * pageSize }),
    repo.countNotificaciones(),
  ]);
  return {
    data: rows.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      canal: n.canal,
      estado: n.estado,
      contenido: n.contenido,
      error: n.error,
      clienteNombre: n.cliente_nombre,
      ordenFolio: n.orden_folio,
      fecha: n.created_at,
    })),
    meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) || 1 },
  };
}
