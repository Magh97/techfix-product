import { Router } from "express";
import { ok, paginated } from "../../shared/http";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { historialQuery, plantillaParams, plantillaSchema } from "./notifications.schema";
import * as service from "./notifications.service";

export const notificacionesRouter = Router();

notificacionesRouter.use(requireAuth, requireRole("admin"));

notificacionesRouter.get("/plantillas", async (_req, res) => {
  ok(res, await service.listPlantillas());
});

notificacionesRouter.put(
  "/plantillas/:tipo",
  validate(plantillaParams, "params"),
  validate(plantillaSchema),
  async (req, res) => {
    const { tipo } = getValidated<{ tipo: string }>(req, "params");
    ok(res, await service.upsertPlantilla(tipo, getValidated<never>(req, "body")));
  }
);

notificacionesRouter.get("/historial", validate(historialQuery, "query"), async (req, res) => {
  const q = getValidated<{ page: number; pageSize: number }>(req, "query");
  const result = await service.historial(q.page, q.pageSize);
  paginated(res, result.data, result.meta);
});
