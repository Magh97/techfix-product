import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { actualizarUsuarioSchema, crearUsuarioSchema, listUsuariosQuery, usuarioIdParams } from "./usuarios.schema";
import * as service from "./usuarios.service";

export const usuariosRouter = Router();

usuariosRouter.use(requireAuth, requireRole("admin"));

usuariosRouter.get("/", validate(listUsuariosQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ rol?: string; isActive?: string; page: number; pageSize: number }>(req, "query");
  const result = await service.list({
    rol: q.rol,
    isActive: q.isActive === undefined ? undefined : q.isActive === "true",
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});

usuariosRouter.post("/", validate(crearUsuarioSchema), async (req: AuthedRequest, res) => {
  created(res, await service.create(getValidated<never>(req, "body")));
});

usuariosRouter.put(
  "/:usuarioId",
  validate(usuarioIdParams, "params"),
  validate(actualizarUsuarioSchema),
  async (req: AuthedRequest, res) => {
    const { usuarioId } = getValidated<{ usuarioId: number }>(req, "params");
    ok(res, await service.update(usuarioId, getValidated<never>(req, "body"), req.user!.id));
  }
);

usuariosRouter.delete("/:usuarioId", validate(usuarioIdParams, "params"), async (req: AuthedRequest, res) => {
  const { usuarioId } = getValidated<{ usuarioId: number }>(req, "params");
  ok(res, await service.remove(usuarioId, req.user!.id));
});
