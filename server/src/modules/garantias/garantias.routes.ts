import { Router } from "express";
import { paginated } from "../../shared/http";
import { requireAuth } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { listGarantiasQuery } from "./garantias.schema";
import * as service from "./garantias.service";

export const garantiasRouter = Router();

garantiasRouter.use(requireAuth);

garantiasRouter.get("/", validate(listGarantiasQuery, "query"), async (req, res) => {
  const q = getValidated<{ clienteId?: number; estado?: string; page: number; pageSize: number }>(req, "query");
  const result = await service.list({
    clienteId: q.clienteId,
    estado: q.estado,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});
