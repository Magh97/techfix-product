import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { clienteIdParams, createClienteSchema, etiquetasSchema, listClientesQuery, updateClienteSchema } from "./clientes.schema";
import * as service from "./clientes.service";
import * as garantiasService from "../garantias/garantias.service";

export const clientesRouter = Router();

clientesRouter.use(requireAuth);

clientesRouter.get("/", validate(listClientesQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ q?: string; page: number; pageSize: number }>(req, "query");
  const result = await service.list(q.q, q.page, q.pageSize);
  paginated(res, result.data, result.meta);
});

clientesRouter.post("/", validate(createClienteSchema), async (req: AuthedRequest, res) => {
  created(res, await service.create(getValidated<never>(req, "body")));
});

clientesRouter.get("/:clienteId", validate(clienteIdParams, "params"), async (req: AuthedRequest, res) => {
  const { clienteId } = getValidated<{ clienteId: number }>(req, "params");
  ok(res, await service.getById(clienteId));
});

clientesRouter.put("/:clienteId", validate(clienteIdParams, "params"), validate(updateClienteSchema), async (req: AuthedRequest, res) => {
  const { clienteId } = getValidated<{ clienteId: number }>(req, "params");
  ok(res, await service.update(clienteId, getValidated<never>(req, "body")));
});

clientesRouter.patch(
  "/:clienteId/etiquetas",
  validate(clienteIdParams, "params"),
  validate(etiquetasSchema),
  async (req: AuthedRequest, res) => {
    const { clienteId } = getValidated<{ clienteId: number }>(req, "params");
    const { etiquetas } = getValidated<{ etiquetas: string[] }>(req, "body");
    ok(res, await service.setEtiquetas(clienteId, etiquetas));
  }
);

clientesRouter.get("/:clienteId/historial", validate(clienteIdParams, "params"), async (req: AuthedRequest, res) => {
  const { clienteId } = getValidated<{ clienteId: number }>(req, "params");
  ok(res, await service.historial(clienteId));
});

clientesRouter.get("/:clienteId/cxc", validate(clienteIdParams, "params"), async (req: AuthedRequest, res) => {
  const { clienteId } = getValidated<{ clienteId: number }>(req, "params");
  ok(res, await service.cxc(clienteId));
});

clientesRouter.get("/:clienteId/garantias", validate(clienteIdParams, "params"), async (req: AuthedRequest, res) => {
  const { clienteId } = getValidated<{ clienteId: number }>(req, "params");
  ok(res, await garantiasService.listCliente(clienteId));
});

clientesRouter.get("/:clienteId/notas-credito", validate(clienteIdParams, "params"), async (req: AuthedRequest, res) => {
  const { clienteId } = getValidated<{ clienteId: number }>(req, "params");
  ok(res, await service.notasCredito(clienteId));
});
