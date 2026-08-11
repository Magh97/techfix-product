import { AppError } from "../../shared/errors";
import { sendMail } from "./mailer";
import { normalizarE164, sendWhatsApp } from "./whatsapp";
import { PLANTILLAS, renderPlantilla, tipoNotificacion } from "./plantillas";
import * as repo from "./notifications.repository";

export interface NotificarInput {
  tipo: "listo" | "cotizacion";
  canal?: string;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Contacto {
  clienteId: number;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  preferencia: string;
}

/** Registra un intento de notificación en la BD (NOT-06). */
async function registrar(input: {
  clienteId: number;
  ordenId?: number | null;
  garantiaId?: number | null;
  tipo: string;
  canal: string;
  contenido?: string;
  estado: "enviado" | "fallido";
  error?: string | null;
}) {
  return repo.insertNotificacion({
    clienteId: input.clienteId,
    ordenId: input.ordenId ?? null,
    garantiaId: input.garantiaId ?? null,
    tipo: input.tipo,
    canal: input.canal,
    contenido: input.contenido,
    estado: input.estado,
    error: input.error ?? null,
  });
}

async function enviarCorreo(contacto: Contacto, tipo: string, vars: Record<string, string>, ref: { ordenId?: number; garantiaId?: number }) {
  if (!contacto.correo) {
    await registrar({
      clienteId: contacto.clienteId,
      ordenId: ref.ordenId,
      garantiaId: ref.garantiaId,
      tipo,
      canal: "correo",
      estado: "fallido",
      error: "cliente sin correo",
    });
    return { enviado: false, canal: "correo", motivo: "SIN_CORREO", folio: vars.folio };
  }
  const dbPlantilla = await repo.findPlantilla(tipo);
  const { asunto, cuerpo } = renderPlantilla(tipo, vars, dbPlantilla);
  const result = await sendMail({ to: contacto.correo, subject: asunto, body: cuerpo });
  await registrar({
    clienteId: contacto.clienteId,
    ordenId: ref.ordenId,
    garantiaId: ref.garantiaId,
    tipo,
    canal: "correo",
    contenido: cuerpo,
    estado: result.ok ? "enviado" : "fallido",
    error: result.ok ? null : result.error,
  });
  return { enviado: result.ok, canal: "correo", folio: vars.folio, simulated: result.simulated, error: result.error ?? null };
}

async function enviarWhatsApp(contacto: Contacto, tipo: string, vars: Record<string, string>, ref: { ordenId?: number; garantiaId?: number }) {
  const telefono = normalizarE164(contacto.telefono);
  if (!telefono) {
    await registrar({
      clienteId: contacto.clienteId,
      ordenId: ref.ordenId,
      garantiaId: ref.garantiaId,
      tipo,
      canal: "whatsapp",
      estado: "fallido",
      error: "teléfono inválido para WhatsApp",
    });
    return { enviado: false, canal: "whatsapp", motivo: "SIN_TELEFONO_VALIDO", folio: vars.folio };
  }
  const dbPlantilla = await repo.findPlantilla(tipo);
  const { cuerpo } = renderPlantilla(tipo, vars, dbPlantilla);
  const result = await sendWhatsApp({ to: telefono, body: cuerpo });
  await registrar({
    clienteId: contacto.clienteId,
    ordenId: ref.ordenId,
    garantiaId: ref.garantiaId,
    tipo,
    canal: "whatsapp",
    contenido: cuerpo,
    estado: result.ok ? "enviado" : "fallido",
    error: result.ok ? null : result.error,
  });
  return { enviado: result.ok, canal: "whatsapp", folio: vars.folio, simulated: result.simulated, error: result.error ?? null };
}

/**
 * Decide el canal según preferencia_contacto con fallback (ADR-0006):
 * - whatsapp y teléfono válido → WhatsApp; si falla → correo (si hay correo).
 * - correo (o whatsapp sin teléfono) y correo → correo.
 * - llamada (o sin contactos) → registra fallido "requiere llamada" / "cliente sin contacto".
 * Si `canalForzado` viene (override del botón), se usa ese canal sin fallback.
 */
async function enviarNotificacion(
  contacto: Contacto,
  tipo: string,
  vars: Record<string, string>,
  ref: { ordenId?: number; garantiaId?: number },
  canalForzado?: string
) {
  if (canalForzado === "whatsapp") return enviarWhatsApp(contacto, tipo, vars, ref);
  if (canalForzado === "correo") return enviarCorreo(contacto, tipo, vars, ref);
  if (canalForzado === "llamada") {
    await registrar({
      clienteId: contacto.clienteId,
      ordenId: ref.ordenId,
      garantiaId: ref.garantiaId,
      tipo,
      canal: "llamada",
      estado: "fallido",
      error: "requiere llamada",
    });
    return { enviado: false, canal: "llamada", motivo: "REQUIERE_LLAMADA", folio: vars.folio };
  }

  const pref = contacto.preferencia ?? "whatsapp";

  if (pref === "whatsapp") {
    const wa = await enviarWhatsApp(contacto, tipo, vars, ref);
    if (wa.enviado) return wa;
    if (contacto.correo) {
      const fallback = await enviarCorreo(contacto, tipo, vars, ref);
      return { ...fallback, fallbackDeWhatsapp: true, motivoWhatsapp: wa.error ?? wa.motivo };
    }
    return wa; // whatsapp fallido y sin correo → queda el fallo registrado
  }

  if (pref === "correo") {
    if (contacto.correo) return enviarCorreo(contacto, tipo, vars, ref);
    await registrar({
      clienteId: contacto.clienteId,
      ordenId: ref.ordenId,
      garantiaId: ref.garantiaId,
      tipo,
      canal: "correo",
      estado: "fallido",
      error: "cliente sin correo",
    });
    return { enviado: false, canal: "correo", motivo: "SIN_CORREO", folio: vars.folio };
  }

  // llamada (o preferencia sin canal real) → tarea manual
  await registrar({
    clienteId: contacto.clienteId,
    ordenId: ref.ordenId,
    garantiaId: ref.garantiaId,
    tipo,
    canal: "llamada",
    estado: "fallido",
    error: "requiere llamada",
  });
  return { enviado: false, canal: "llamada", motivo: "REQUIERE_LLAMADA", folio: vars.folio };
}

export async function notificar(ordenId: number, input: NotificarInput) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (input.tipo === "listo" && orden.estado !== "listo") {
    throw AppError.business("ORDER_NOT_READY", "La orden debe estar en estado listo para notificar");
  }
  const tipo = tipoNotificacion(input.tipo);
  const cliente = await repo.findClienteById(orden.cliente_id);
  if (!cliente) {
    await registrar({ clienteId: orden.cliente_id, ordenId, tipo, canal: "correo", estado: "fallido", error: "cliente sin contacto" });
    return { enviado: false, motivo: "SIN_CLIENTE", folio: orden.folio };
  }
  const vars = { cliente: cliente.nombre, folio: orden.folio, fecha: hoy() };
  return enviarNotificacion(
    { clienteId: cliente.id, nombre: cliente.nombre, correo: cliente.correo, telefono: cliente.telefono, preferencia: cliente.preferencia_contacto },
    tipo,
    vars,
    { ordenId },
    input.canal
  );
}

// NOT-01: notificación automática de retraso (disparada por el worker)
export async function notificarRetraso(ordenId: number) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) return { enviado: false, motivo: "SIN_ORDEN" };
  const cliente = await repo.findClienteById(orden.cliente_id);
  if (!cliente) return { enviado: false, motivo: "SIN_CLIENTE" };
  const tipo = tipoNotificacion("retraso");
  const vars = { cliente: cliente.nombre, folio: orden.folio, fecha: hoy() };
  return enviarNotificacion(
    { clienteId: cliente.id, nombre: cliente.nombre, correo: cliente.correo, telefono: cliente.telefono, preferencia: cliente.preferencia_contacto },
    tipo,
    vars,
    { ordenId }
  );
}

// NOT-04: recordatorio de garantía por vencer (disparada por el worker)
export async function notificarGarantia(garantiaId: number) {
  const g = await repo.findGarantiaNotif(garantiaId);
  if (!g) return { enviado: false, motivo: "SIN_GARANTIA" };
  const cliente = await repo.findClienteById(g.cliente_id);
  if (!cliente) return { enviado: false, motivo: "SIN_CLIENTE", garantiaId };
  const tipo = tipoNotificacion("garantia");
  const folio = g.orden_folio ?? g.venta_folio ?? "";
  const vars = { cliente: cliente.nombre, folio, fecha: hoy() };
  return enviarNotificacion(
    { clienteId: cliente.id, nombre: cliente.nombre, correo: cliente.correo, telefono: cliente.telefono, preferencia: cliente.preferencia_contacto },
    tipo,
    vars,
    { garantiaId }
  );
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
