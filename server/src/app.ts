import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { clientesRouter } from "./modules/crm/clientes.routes";
import { productsRouter } from "./modules/inventory/products.routes";
import { ordenesRouter } from "./modules/services/ordenes.routes";
import { errorHandler, notFoundHandler } from "./shared/errors";
import { logger } from "./shared/logger";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, "request");
    next();
  });

  app.get("/api/v1/health", (_req, res) => {
    res.json({ data: { status: "ok", uptime: process.uptime() } });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/productos", productsRouter);
  app.use("/api/v1/clientes", clientesRouter);
  app.use("/api/v1/ordenes", ordenesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
