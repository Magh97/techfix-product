import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// En tests se desactivan los límites para no volver flaky la suite
const habilitado = env.NODE_ENV !== "test";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: habilitado ? 10 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: habilitado ? 300 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
});
