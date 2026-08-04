import { Router } from "express";
import { ok } from "../../shared/http";
import { requireAuth, type AuthedRequest } from "../../shared/middleware/auth";
import * as service from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/resumen", async (req: AuthedRequest, res) => {
  ok(res, await service.resumen(req.user!.id));
});
