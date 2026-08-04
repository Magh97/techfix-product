import "dotenv/config";
import { z } from "zod";

const isTest = process.env.NODE_ENV === "test";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default(isTest ? "test" : "development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1).default("postgres://techstore:techstore_dev@localhost:5432/techstore"),
  JWT_SECRET: z.string().min(16).default("dev_change_me_access_secret_ok"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev_change_me_refresh_secret_ok"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.string().default("info"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("no-reply@techstore.local"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error("Configuración inválida:\n" + JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
}

export const env = parsed.data;
