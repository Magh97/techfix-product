import { Router } from "express";
import { created, paginated } from "../../shared/http";
import { requireAuth } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { createClienteSchema, listClientesQuery } from "./clientes.schema";
import * as service from "./clientes.service";

export const clientesRouter = Router();

clientesRouter.use(requireAuth);

clientesRouter.get("/", validate(listClientesQuery, "query"), async (req, res) => {
  const q = getValidated<{ q?: string; page: number; pageSize: number }>(req, "query");
  const result = await service.list(q.q, q.page, q.pageSize);
  paginated(res, result.data, result.meta);
});

clientesRouter.post("/", validate(createClienteSchema), async (req, res) => {
  created(res, await service.create(getValidated<never>(req, "body")));
});
