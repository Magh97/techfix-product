import twilio from "twilio";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";

export interface WhatsappResult {
  ok: boolean;
  simulated: boolean;
  error?: string;
}

// Normaliza un teléfono a E.164: solo dígitos; si no trae código de país
// se antepone TWILIO_DEFAULT_COUNTRY_CODE (default "+52"). Devuelve null si es inválido.
export function normalizarE164(raw: string | null | undefined, countryCode = env.TWILIO_DEFAULT_COUNTRY_CODE): string | null {
  if (!raw) return null;
  const digitos = raw.replace(/\D/g, "");
  if (!digitos) return null;
  const conPais = raw.startsWith("+") ? digitos : `${countryCode}${digitos}`;
  return conPais.length >= 11 ? `+${conPais}` : null;
}

function client() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

export async function sendWhatsApp(input: { to: string; body: string }): Promise<WhatsappResult> {
  const c = client();
  if (!c || !env.TWILIO_WHATSAPP_FROM) {
    logger.info({ to: input.to, body: input.body }, "whatsapp:simulado sin Twilio");
    return { ok: true, simulated: true };
  }
  try {
    await c.messages.create({ from: env.TWILIO_WHATSAPP_FROM, to: input.to, body: input.body });
    return { ok: true, simulated: false };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error({ err: error, to: input.to }, "whatsapp:error al enviar");
    return { ok: false, simulated: false, error };
  }
}
