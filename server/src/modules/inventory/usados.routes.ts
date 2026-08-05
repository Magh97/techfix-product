import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { crearUsadoSchema, listUsadosQuery, updateUsadoSchema, usadoIdParams } from "./usados.schema";
import * as service from "./usados.service";

export const usadosRouter = Router();

usadosRouter.use(requireAuth);

usadosRouter.get("/", validate(listUsadosQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ estado?: string; origen?: string; clienteId?: number; q?: string; page: number; pageSize: number }>(req, "query");
  const result = await service.listar({
    estado: q.estado,
    origen: q.origen,
    clienteId: q.clienteId,
    q: q.q,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});

usadosRouter.post("/", requireRole("admin"), validate(crearUsadoSchema), async (req: AuthedRequest, res) => {
  created(res, await service.crear(getValidated<never>(req, "body"), req.user!));
});

usadosRouter.put(
  "/:usadoId",
  requireRole("admin"),
  validate(usadoIdParams, "params"),
  validate(updateUsadoSchema),
  async (req: AuthedRequest, res) => {
    const { usadoId } = getValidated<{ usadoId: number }>(req, "params");
    ok(res, await service.actualizar(usadoId, getValidated<never>(req, "body"), req.user!));
  }
);
