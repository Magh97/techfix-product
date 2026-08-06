import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import {
  cancelarVentaSchema,
  crearVentaSchema,
  devolucionSchema,
  listVentasQuery,
  pagoSchema,
  ventaIdParams,
} from "./ventas.schema";
import * as service from "./ventas.service";
import type { RegistrarVentaInput } from "./ventas.repository";

export const ventasRouter = Router();

ventasRouter.use(requireAuth);

interface ListQuery {
  page: number;
  pageSize: number;
  desde?: string;
  hasta?: string;
  vendedorId?: number;
  metodoPago?: string;
  estado?: string;
}

type VentaBody = Omit<RegistrarVentaInput, "vendedorId">;

ventasRouter.get("/", validate(listVentasQuery, "query"), async (req: AuthedRequest, res) => {
  const q = getValidated<ListQuery>(req, "query");
  const result = await service.list({
    desde: q.desde,
    hasta: q.hasta,
    vendedorId: q.vendedorId,
    metodoPago: q.metodoPago,
    estado: q.estado,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});

ventasRouter.post("/", validate(crearVentaSchema), async (req: AuthedRequest, res) => {
  const body = getValidated<VentaBody>(req, "body");
  created(res, await service.registrarVenta({ ...body, vendedorId: req.user!.id }, req.user!));
});

ventasRouter.get("/por-folio/:folio", async (req: AuthedRequest, res) => {
  ok(res, await service.getByFolio(req.params.folio as string));
});

ventasRouter.get("/:ventaId", validate(ventaIdParams, "params"), async (req: AuthedRequest, res) => {
  const { ventaId } = getValidated<{ ventaId: number }>(req, "params");
  ok(res, await service.getById(ventaId));
});

ventasRouter.post(
  "/:ventaId/pagos",
  validate(ventaIdParams, "params"),
  validate(pagoSchema),
  async (req: AuthedRequest, res) => {
    const { ventaId } = getValidated<{ ventaId: number }>(req, "params");
    const body = getValidated<{ monto?: number; metodo?: string; pagos?: { metodo: string; monto: number }[] }>(req, "body");
    ok(res, await service.registrarAbono(ventaId, body, req.user!));
  }
);

ventasRouter.post(
  "/:ventaId/cancelar",
  requireRole("admin"),
  validate(ventaIdParams, "params"),
  validate(cancelarVentaSchema),
  async (req: AuthedRequest, res) => {
    const { ventaId } = getValidated<{ ventaId: number }>(req, "params");
    const { motivo } = getValidated<{ motivo: string }>(req, "body");
    ok(res, await service.cancelar(ventaId, motivo, req.user!));
  }
);

ventasRouter.post(
  "/:ventaId/devolucion",
  requireRole("vendedor", "admin"),
  validate(ventaIdParams, "params"),
  validate(devolucionSchema),
  async (req: AuthedRequest, res) => {
    const { ventaId } = getValidated<{ ventaId: number }>(req, "params");
    const { lineas, motivo } = getValidated<{ lineas: { productoId: number; cantidad: number }[]; motivo?: string }>(req, "body");
    ok(res, await service.devolucion(ventaId, { lineas, motivo }, req.user!));
  }
);
