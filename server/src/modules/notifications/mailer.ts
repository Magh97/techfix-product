import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";

export interface MailResult {
  ok: boolean;
  simulated: boolean;
  error?: string;
}

function transport() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

export async function sendMail(input: { to: string; subject: string; body: string }): Promise<MailResult> {
  const tx = transport();
  if (!tx) {
    logger.info({ to: input.to, subject: input.subject, body: input.body }, "mail:simulado sin SMTP");
    return { ok: true, simulated: true };
  }
  try {
    await tx.sendMail({ from: env.SMTP_FROM, to: input.to, subject: input.subject, text: input.body });
    return { ok: true, simulated: false };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error({ err: error, to: input.to }, "mail:error al enviar");
    return { ok: false, simulated: false, error };
  }
}
