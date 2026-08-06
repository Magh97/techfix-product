import { Router } from "express";
import { ok } from "../../shared/http";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { putConfigSchema } from "./configuracion.schema";
import * as service from "./configuracion.service";

export const configuracionRouter = Router();

configuracionRouter.use(requireAuth);

configuracionRouter.get("/", async (_req, res) => {
  ok(res, await service.get());
});

configuracionRouter.put("/", requireRole("admin"), validate(putConfigSchema), async (req, res) => {
  const { clave, valor } = getValidated<{ clave: string; valor: number }>(req, "body");
  ok(res, await service.update(clave, valor));
});
