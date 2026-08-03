import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import {
  cancelarSchema,
  changeEstadoSchema,
  consumoSchema,
  cidParams,
  crearCotizacionSchema,
  createOrdenSchema,
  diagnosticoSchema,
  entregarSchema,
  listOrdenesQuery,
  manoObraSchema,
  notificarSchema,
  idParams,
} from "./ordenes.schema";
import * as service from "./ordenes.service";
import type { EstadoOrden } from "./ordenes.types";

interface CotizacionLineaInput {
  tipoLinea: "refaccion" | "mano_obra";
  productoId?: number;
  cantidad?: number;
  horas?: number;
  tarifaHora?: number;
  descripcion?: string;
}

export const ordenesRouter = Router();

ordenesRouter.use(requireAuth);

interface ListQuery {
  page: number;
  pageSize: number;
  estado?: EstadoOrden;
  retrasadas?: "true" | "false";
  folio?: string;
  clienteId?: number;
}

ordenesRouter.get("/", validate(listOrdenesQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<ListQuery>(req, "query");
  const result = await service.list({
    estado: q.estado,
    retrasadas: q.retrasadas === "true" ? true : q.retrasadas === "false" ? false : undefined,
    folio: q.folio,
    clienteId: q.clienteId,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});

ordenesRouter.post("/", validate(createOrdenSchema), async (req: AuthedRequest, res) => {
  created(res, await service.create(getValidated<never>(req, "body"), req.user!.id));
});

ordenesRouter.get("/por-folio/:folio", async (req: AuthedRequest, res) => {
  ok(res, await service.getByFolio(req.params.folio as string));
});

ordenesRouter.get("/:id", validate(idParams, "params"), async (req: AuthedRequest, res) => {
  const { id } = getValidated<{ id: number }>(req, "params");
  ok(res, await service.getById(id));
});

ordenesRouter.patch("/:id/estado", validate(idParams, "params"), validate(changeEstadoSchema), async (req: AuthedRequest, res) => {
  const { id } = getValidated<{ id: number }>(req, "params");
  const body = getValidated<{ nuevoEstado: EstadoOrden; nota?: string }>(req, "body");
  ok(res, await service.cambiarEstado(id, body.nuevoEstado, body.nota, req.user!));
});

ordenesRouter.post(
  "/:id/diagnostico",
  requireRole("tecnico"),
  validate(idParams, "params"),
  validate(diagnosticoSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    const { diagnostico } = getValidated<{ diagnostico: string }>(req, "body");
    ok(res, await service.setDiagnostico(id, diagnostico, req.user!));
  }
);

ordenesRouter.post(
  "/:id/cotizaciones",
  requireRole("tecnico"),
  validate(idParams, "params"),
  validate(crearCotizacionSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    const { lineas } = getValidated<{ lineas: CotizacionLineaInput[] }>(req, "body");
    created(res, await service.crearCotizacion(id, lineas, req.user!));
  }
);

ordenesRouter.post(
  "/:id/cotizaciones/:cid/aprobar",
  requireRole("vendedor", "admin"),
  validate(cidParams, "params"),
  async (req: AuthedRequest, res) => {
    const { id, cid } = getValidated<{ id: number; cid: number }>(req, "params");
    ok(res, await service.aprobarCotizacion(id, cid, req.user!));
  }
);

ordenesRouter.post(
  "/:id/cotizaciones/:cid/rechazar",
  requireRole("vendedor", "admin"),
  validate(cidParams, "params"),
  validate(cancelarSchema),
  async (req: AuthedRequest, res) => {
    const { id, cid } = getValidated<{ id: number; cid: number }>(req, "params");
    const { motivo } = getValidated<{ motivo: string }>(req, "body");
    ok(res, await service.rechazarCotizacion(id, cid, motivo, req.user!));
  }
);

ordenesRouter.post(
  "/:id/consumo",
  requireRole("tecnico"),
  validate(idParams, "params"),
  validate(consumoSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    const { piezas } = getValidated<{ piezas: { productoId: number; cantidad: number }[] }>(req, "body");
    ok(res, await service.registrarConsumo(id, piezas, req.user!));
  }
);

ordenesRouter.post(
  "/:id/mano-obra",
  requireRole("tecnico"),
  validate(idParams, "params"),
  validate(manoObraSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    ok(res, await service.registrarManoObra(id, getValidated<never>(req, "body"), req.user!));
  }
);

ordenesRouter.post(
  "/:id/entregar",
  requireRole("vendedor", "admin"),
  validate(idParams, "params"),
  validate(entregarSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    ok(res, await service.entregar(id, getValidated<never>(req, "body"), req.user!));
  }
);

ordenesRouter.post("/:id/cancelar", validate(idParams, "params"), validate(cancelarSchema), async (req: AuthedRequest, res) => {
  const { id } = getValidated<{ id: number }>(req, "params");
  const { motivo } = getValidated<{ motivo: string }>(req, "body");
  ok(res, await service.cancelar(id, motivo, req.user!));
});

ordenesRouter.post(
  "/:id/notificar",
  validate(idParams, "params"),
  validate(notificarSchema),
  async (req: AuthedRequest, res) => {
    const { id } = getValidated<{ id: number }>(req, "params");
    ok(res, await service.notificar(id, getValidated<never>(req, "body"), req.user!));
  }
);

