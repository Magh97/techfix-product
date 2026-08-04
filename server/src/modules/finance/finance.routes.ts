import { Router } from "express";
import { ok, paginated } from "../../shared/http";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { cerrarCajaSchema, cxcQuery, egresoSchema, ingresoSchema, movimientosQuery } from "./finance.schema";
import * as service from "./finance.service";

export const cajaRouter = Router();
export const finanzasRouter = Router();

cajaRouter.use(requireAuth);

cajaRouter.post("/abrir", requireRole("vendedor", "admin"), async (req: AuthedRequest, res) => {
  ok(res, await service.abrir(req.user!.id));
});

cajaRouter.get("/actual", async (req: AuthedRequest, res) => {
  ok(res, await service.actual(req.user!.id));
});

cajaRouter.get("/corte", requireRole("vendedor", "admin"), async (req: AuthedRequest, res) => {
  ok(res, await service.corte(req.user!.id));
});

cajaRouter.post("/cerrar", requireRole("admin"), validate(cerrarCajaSchema), async (req: AuthedRequest, res) => {
  const { efectivoFisico } = getValidated<{ efectivoFisico: number }>(req, "body");
  ok(res, await service.cerrar(req.user!.id, efectivoFisico));
});

finanzasRouter.use(requireAuth);

finanzasRouter.get("/movimientos", validate(movimientosQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ page: number; pageSize: number }>(req, "query");
  const result = await service.movimientos(req.user!.id, q);
  paginated(res, result.data, result.meta);
});

finanzasRouter.post("/ingresos", requireRole("vendedor", "admin"), validate(ingresoSchema), async (req: AuthedRequest, res) => {
  ok(res, await service.registrarIngreso(getValidated<never>(req, "body"), req.user!.id));
});

finanzasRouter.post("/egresos", requireRole("admin"), validate(egresoSchema), async (req: AuthedRequest, res) => {
  ok(res, await service.registrarEgreso(getValidated<never>(req, "body"), req.user!.id));
});

finanzasRouter.get("/cxc", requireRole("vendedor", "admin"), validate(cxcQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ estado?: string }>(req, "query");
  ok(res, await service.cxcGlobal(q.estado));
});
