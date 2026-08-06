import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { AppError } from "../../shared/errors";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import { compraIdParams, crearCompraSchema, listComprasQuery, pagoCompraSchema, crearSolicitudSchema, listSolicitudesQuery, aprobarSolicitudesSchema, resolverSolicitudSchema, solicitudIdParams, recibirSchema, comparacionQuery } from "./compras.schema";
import * as compraService from "./compras.service";
import {
  createProveedorSchema,
  listProveedoresQuery,
  proveedorIdParams,
  updateProveedorSchema,
} from "./proveedores.schema";
import * as proveedorService from "./proveedores.service";

export const proveedoresRouter = Router();
export const comprasRouter = Router();

proveedoresRouter.use(requireAuth);

proveedoresRouter.get("/", validate(listProveedoresQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ q?: string; page: number; pageSize: number }>(req, "query");
  const result = await proveedorService.list(q.q, q.page, q.pageSize);
  paginated(res, result.data, result.meta);
});

proveedoresRouter.post("/", requireRole("admin"), validate(createProveedorSchema), async (req: AuthedRequest, res) => {
  created(res, await proveedorService.create(getValidated<never>(req, "body"), req.user!));
});

proveedoresRouter.get("/:proveedorId", validate(proveedorIdParams, "params"), async (req: AuthedRequest, res) => {
  const { proveedorId } = getValidated<{ proveedorId: number }>(req, "params");
  ok(res, await proveedorService.getById(proveedorId));
});

proveedoresRouter.put(
  "/:proveedorId",
  requireRole("admin"),
  validate(proveedorIdParams, "params"),
  validate(updateProveedorSchema),
  async (req: AuthedRequest, res) => {
    const { proveedorId } = getValidated<{ proveedorId: number }>(req, "params");
    ok(res, await proveedorService.update(proveedorId, getValidated<never>(req, "body"), req.user!));
  }
);

proveedoresRouter.delete("/:proveedorId", requireRole("admin"), validate(proveedorIdParams, "params"), async (req: AuthedRequest, res) => {
  const { proveedorId } = getValidated<{ proveedorId: number }>(req, "params");
  ok(res, await proveedorService.remove(proveedorId, req.user!));
});

comprasRouter.use(requireAuth);

comprasRouter.get("/", validate(listComprasQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ proveedorId?: number; estado?: string; folio?: string; page: number; pageSize: number }>(req, "query");
  const result = await compraService.listar({
    proveedorId: q.proveedorId,
    estado: q.estado,
    folio: q.folio,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});

comprasRouter.get("/cxp", async (req: AuthedRequest, res) => {
  const estado = typeof req.query.estado === "string" ? req.query.estado : undefined;
  ok(res, await compraService.cxp(estado));
});

// Reabastecimiento sugerido (admin)
comprasRouter.get("/reabastecimiento", requireRole("admin"), async (_req, res) => {
  ok(res, await compraService.reabastecimiento());
});

// Comparación de precios entre proveedores (admin)
comprasRouter.get("/comparacion-precios", requireRole("admin"), validate(comparacionQuery, "query"), async (req: AuthedRequest, res) => {
  const { productoId } = getValidated<{ productoId: number }>(req, "query");
  ok(res, await compraService.comparacionPrecios(productoId));
});

// Solicitudes de reabastecimiento (tecnico/admin crean; admin resuelve)
comprasRouter.post("/solicitudes", requireRole("tecnico", "admin"), validate(crearSolicitudSchema), async (req: AuthedRequest, res) => {
  created(res, await compraService.crearSolicitud(getValidated<never>(req, "body"), req.user!));
});

comprasRouter.get("/solicitudes", requireRole("tecnico", "admin"), validate(listSolicitudesQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<{ estado?: string; ordenId?: number; page: number; pageSize: number }>(req, "query");
  if (req.user!.rol === "tecnico" && !q.ordenId) {
    throw AppError.badRequest("ORDEN_REQUERIDA", "Especifica la orden para consultar sus solicitudes");
  }
  const result = await compraService.listarSolicitudes({ estado: q.estado, ordenId: q.ordenId, page: q.page, pageSize: q.pageSize });
  paginated(res, result.data, result.meta);
});

comprasRouter.post("/solicitudes/aprobar", requireRole("admin"), validate(aprobarSolicitudesSchema), async (req: AuthedRequest, res) => {
  const body = getValidated<{ solicitudes: number[] }>(req, "body");
  ok(res, await compraService.aprobarSolicitudes(body.solicitudes, req.user!));
});

comprasRouter.post("/solicitudes/:solicitudId/rechazar", requireRole("admin"), validate(solicitudIdParams, "params"), validate(resolverSolicitudSchema), async (req: AuthedRequest, res) => {
  const { solicitudId } = getValidated<{ solicitudId: number }>(req, "params");
  const body = getValidated<{ motivo: string }>(req, "body");
  ok(res, await compraService.rechazarSolicitud(solicitudId, body.motivo, req.user!));
});

comprasRouter.post("/solicitudes/:solicitudId/cancelar", requireRole("tecnico", "admin"), validate(solicitudIdParams, "params"), validate(resolverSolicitudSchema), async (req: AuthedRequest, res) => {
  const { solicitudId } = getValidated<{ solicitudId: number }>(req, "params");
  const body = getValidated<{ motivo: string }>(req, "body");
  ok(res, await compraService.cancelarSolicitud(solicitudId, body.motivo, req.user!));
});

comprasRouter.post("/", requireRole("admin"), validate(crearCompraSchema), async (req: AuthedRequest, res) => {
  created(res, await compraService.crear(getValidated<never>(req, "body"), req.user!));
});

comprasRouter.get("/:compraId", validate(compraIdParams, "params"), async (req: AuthedRequest, res) => {
  const { compraId } = getValidated<{ compraId: number }>(req, "params");
  ok(res, await compraService.getById(compraId));
});

comprasRouter.post("/:compraId/enviar", requireRole("admin"), validate(compraIdParams, "params"), async (req: AuthedRequest, res) => {
  const { compraId } = getValidated<{ compraId: number }>(req, "params");
  ok(res, await compraService.enviar(compraId, req.user!));
});

comprasRouter.post("/:compraId/recibir", requireRole("admin"), validate(compraIdParams, "params"), validate(recibirSchema), async (req: AuthedRequest, res) => {
  const { compraId } = getValidated<{ compraId: number }>(req, "params");
  ok(res, await compraService.recibir(compraId, getValidated<never>(req, "body"), req.user!));
});

comprasRouter.post(
  "/:compraId/cancelar",
  requireRole("admin"),
  validate(compraIdParams, "params"),
  async (req: AuthedRequest, res) => {
    const { compraId } = getValidated<{ compraId: number }>(req, "params");
    ok(res, await compraService.cancelar(compraId, req.user!));
  }
);

comprasRouter.post(
  "/:compraId/pagos",
  requireRole("admin"),
  validate(compraIdParams, "params"),
  validate(pagoCompraSchema),
  async (req: AuthedRequest, res) => {
    const { compraId } = getValidated<{ compraId: number }>(req, "params");
    const body = getValidated<{ monto: number; metodo: string }>(req, "body");
    ok(res, await compraService.registrarPago(compraId, body, req.user!));
  }
);
