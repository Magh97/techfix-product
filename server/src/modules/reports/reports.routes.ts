import { Router } from "express";
import { ok } from "../../shared/http";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { exportQuerySchema, reporteQuerySchema, serviciosQuerySchema, tipoReporteParams, ventasQuerySchema } from "./reports.schema";
import * as service from "./reports.service";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole("admin"));

reportsRouter.get("/inventario", async (_req, res) => {
  ok(res, await service.inventario());
});

reportsRouter.get("/ventas", validate(ventasQuerySchema, "query"), async (req, res) => {
  const q = getValidated<{ desde?: string; hasta?: string; agrupar: string }>(req, "query");
  ok(res, await service.ventas(q));
});

reportsRouter.get("/servicios", validate(serviciosQuerySchema, "query"), async (req, res) => {
  const q = getValidated<{ desde?: string; hasta?: string; estado?: string; tecnicoId?: number }>(req, "query");
  ok(res, await service.servicios(q));
});

reportsRouter.get("/rentabilidad", validate(reporteQuerySchema, "query"), async (req, res) => {
  const q = getValidated<{ desde?: string; hasta?: string }>(req, "query");
  ok(res, await service.rentabilidad(q));
});

reportsRouter.get("/clientes", validate(reporteQuerySchema, "query"), async (req, res) => {
  const q = getValidated<{ desde?: string; hasta?: string }>(req, "query");
  ok(res, await service.clientes(q));
});

reportsRouter.get("/financiero", validate(reporteQuerySchema, "query"), async (req, res) => {
  const q = getValidated<{ desde?: string; hasta?: string }>(req, "query");
  ok(res, await service.financiero(q));
});

reportsRouter.get(
  "/:tipo/export",
  validate(tipoReporteParams, "params"),
  validate(exportQuerySchema, "query"),
  async (req, res) => {
    const { tipo } = getValidated<{ tipo: "inventario" | "ventas" | "servicios" | "rentabilidad" | "clientes" | "financiero" }>(req, "params");
    const q = getValidated<{ formato: "csv" | "xlsx"; desde?: string; hasta?: string; agrupar?: string; estado?: string; tecnicoId?: number }>(req, "query");
    await service.exportar(res, tipo, q.formato, q);
  }
);
