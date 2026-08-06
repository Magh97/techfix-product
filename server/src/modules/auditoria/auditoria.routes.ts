import { Router } from "express";
import { paginated } from "../../shared/http";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { listAuditoriaQuery } from "./auditoria.schema";
import * as service from "./auditoria.service";

export const auditoriaRouter = Router();

auditoriaRouter.use(requireAuth, requireRole("admin"));

auditoriaRouter.get("/", validate(listAuditoriaQuery, "query"), async (req, res) => {
  const q = getValidated<{
    usuarioId?: number;
    entidad?: string;
    accion?: string;
    desde?: string;
    hasta?: string;
    page: number;
    pageSize: number;
  }>(req, "query");
  const result = await service.list({
    usuarioId: q.usuarioId,
    entidad: q.entidad,
    accion: q.accion,
    desde: q.desde,
    hasta: q.hasta,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});
