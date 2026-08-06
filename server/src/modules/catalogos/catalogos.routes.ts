import { Router } from "express";
import { created, ok } from "../../shared/http";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { actualizarCatalogoSchema, catalogoIdParams, crearCatalogoSchema } from "./catalogos.schema";
import * as service from "./catalogos.service";

export const catalogosRouter = Router();

catalogosRouter.use(requireAuth, requireRole("admin"));

catalogosRouter.get("/", async (_req, res) => {
  ok(res, await service.list());
});

catalogosRouter.post("/", validate(crearCatalogoSchema), async (req, res) => {
  created(res, await service.create(getValidated<never>(req, "body")));
});

catalogosRouter.put(
  "/:catalogoId",
  validate(catalogoIdParams, "params"),
  validate(actualizarCatalogoSchema),
  async (req, res) => {
    const { catalogoId } = getValidated<{ catalogoId: number }>(req, "params");
    ok(res, await service.update(catalogoId, getValidated<never>(req, "body")));
  }
);

catalogosRouter.delete("/:catalogoId", validate(catalogoIdParams, "params"), async (req, res) => {
  const { catalogoId } = getValidated<{ catalogoId: number }>(req, "params");
  ok(res, await service.remove(catalogoId));
});
