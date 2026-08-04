import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import {
  convertirCotizacionVentaSchema,
  cotizacionVentaIdParams,
  createCotizacionVentaSchema,
  estadoCotizacionVentaSchema,
  listCotizacionesVentaQuery,
} from "./quote.schema";
import * as service from "./quote.service";

export const quoteRouter = Router();

quoteRouter.use(requireAuth);

quoteRouter.get("/", validate(listCotizacionesVentaQuery, "query"), async (req, res) => {
  const q = getValidated<{ estado?: string; clienteId?: number; folio?: string; page: number; pageSize: number }>(req, "query");
  const result = await service.list(q);
  paginated(res, result.data, result.meta);
});

quoteRouter.post("/", validate(createCotizacionVentaSchema), async (req: AuthedRequest, res) => {
  created(res, await service.crear(getValidated<never>(req, "body"), req.user!));
});

quoteRouter.get("/:id", validate(cotizacionVentaIdParams, "params"), async (req, res) => {
  const { id } = getValidated<{ id: number }>(req, "params");
  ok(res, await service.getById(id));
});

quoteRouter.patch(
  "/:id/estado",
  validate(cotizacionVentaIdParams, "params"),
  validate(estadoCotizacionVentaSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    const body = getValidated<{ nuevoEstado: "aprobada" | "rechazada" | "cancelada"; motivo?: string }>(req, "body");
    ok(res, await service.cambiarEstado(id, body.nuevoEstado, body.motivo, req.user!));
  }
);

quoteRouter.post(
  "/:id/convertir",
  validate(cotizacionVentaIdParams, "params"),
  validate(convertirCotizacionVentaSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    const body = getValidated<{ metodoPago: string; tipoPago?: "contado" | "credito"; montoRecibido?: number | null }>(req, "body");
    ok(res, await service.convertir(id, body, req.user!));
  }
);
