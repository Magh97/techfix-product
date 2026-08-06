import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { cambiarEstadoQuejaSchema, crearQuejaSchema, listQuejasQuery, quejaIdParams } from "./quejas.schema";
import * as service from "./quejas.service";

export const quejasRouter = Router();

quejasRouter.use(requireAuth);

quejasRouter.get("/", validate(listQuejasQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ clienteId?: number; estado?: string; tipo?: string; page: number; pageSize: number }>(req, "query");
  const result = await service.listar({
    clienteId: q.clienteId,
    estado: q.estado,
    tipo: q.tipo,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});

quejasRouter.post("/", requireRole("vendedor", "admin"), validate(crearQuejaSchema), async (req: AuthedRequest, res) => {
  created(res, await service.crear(getValidated<never>(req, "body"), req.user!));
});

quejasRouter.post(
  "/:quejaId/estado",
  requireRole("vendedor", "admin"),
  validate(quejaIdParams, "params"),
  validate(cambiarEstadoQuejaSchema),
  async (req: AuthedRequest, res) => {
    const { quejaId } = getValidated<{ quejaId: number }>(req, "params");
    ok(res, await service.cambiarEstado(quejaId, getValidated<never>(req, "body"), req.user!));
  }
);
