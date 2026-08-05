import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { auditoriaRouter } from "./modules/auditoria/auditoria.routes";
import { catalogosRouter } from "./modules/catalogos/catalogos.routes";
import { comprasRouter, proveedoresRouter } from "./modules/compras/compras.routes";
import { configuracionRouter } from "./modules/configuracion/configuracion.routes";
import { clientesRouter } from "./modules/crm/clientes.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { cajaRouter, finanzasRouter } from "./modules/finance/finance.routes";
import { garantiasRouter } from "./modules/garantias/garantias.routes";
import { productsRouter } from "./modules/inventory/products.routes";
import { usadosRouter } from "./modules/inventory/usados.routes";
import { notificacionesRouter } from "./modules/notifications/notifications.routes";
import { quoteRouter } from "./modules/quote/quote.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { ventasRouter } from "./modules/sales/ventas.routes";
import { ordenesRouter } from "./modules/services/ordenes.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";
import { errorHandler, notFoundHandler } from "./shared/errors";
import { logger } from "./shared/logger";
import { apiLimiter, authLimiter } from "./shared/rateLimit";

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

  app.use("/api/v1", apiLimiter);
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/productos", productsRouter);
  app.use("/api/v1/usados", usadosRouter);
  app.use("/api/v1/clientes", clientesRouter);
  app.use("/api/v1/ventas", ventasRouter);
  app.use("/api/v1/ordenes", ordenesRouter);
  app.use("/api/v1/caja", cajaRouter);
  app.use("/api/v1/finanzas", finanzasRouter);
  app.use("/api/v1/proveedores", proveedoresRouter);
  app.use("/api/v1/compras", comprasRouter);
  app.use("/api/v1/cotizaciones-venta", quoteRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/usuarios", usuariosRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/catalogos", catalogosRouter);
  app.use("/api/v1/notificaciones", notificacionesRouter);
  app.use("/api/v1/configuracion", configuracionRouter);
  app.use("/api/v1/garantias", garantiasRouter);
  app.use("/api/v1/auditoria", auditoriaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
