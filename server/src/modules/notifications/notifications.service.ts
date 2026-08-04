import { AppError } from "../../shared/errors";
import { sendMail } from "./mailer";
import { renderPlantilla, tipoNotificacion } from "./plantillas";
import * as repo from "./notifications.repository";

export interface NotificarInput {
  tipo: "listo" | "cotizacion";
  canal?: string;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function notificar(ordenId: number, input: NotificarInput) {
  const orden = await repo.findOrdenById(ordenId);
  if (!orden) throw AppError.notFound("ORDER_NOT_FOUND", "Orden no encontrada");
  if (input.tipo === "listo" && orden.estado !== "listo") {
    throw AppError.business("ORDER_NOT_READY", "La orden debe estar en estado listo para notificar");
  }

  const cliente = await repo.findClienteById(orden.cliente_id);
  const tipo = tipoNotificacion(input.tipo);
  const vars = { cliente: cliente?.nombre ?? "", folio: orden.folio, fecha: hoy() };

  // Canal implementado: correo (ADR-0007). WhatsApp/Twilio queda diferido.
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
