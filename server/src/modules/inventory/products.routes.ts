import { Router } from "express";
import multer from "multer";
import { created, ok, paginated } from "../../shared/http";
import { AppError } from "../../shared/errors";
import { requireAuth, requireRole, type AuthedRequest } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import type { CreateProductInput } from "./products.repository";
import { createProductSchema, bomSchema, exportProductosQuery, listProductsQuery, productIdParams, updateProductSchema, ajustarStockSchema, listMovimientosQuery } from "./products.schema";
import { plantillaQuerySchema } from "./import.schema";
import * as importService from "./import.service";
import * as service from "./products.service";

export const productsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

productsRouter.use(requireAuth);

interface ListQuery {
  q?: string;
  categoria?: string;
  stockBajo?: "true" | "false";
  page: number;
  pageSize: number;
}

productsRouter.get("/", validate(listProductsQuery, "query"), async (req, res) => {
  const q = getValidated<ListQuery>(req, "query");
  const result = await service.list({
    q: q.q,
    categoria: q.categoria,
    stockBajo: q.stockBajo === "true" ? true : q.stockBajo === "false" ? false : undefined,
    page: q.page,
    pageSize: q.pageSize,
  });
  paginated(res, result.data, result.meta);
});

productsRouter.get("/por-codigo/:codigo", async (req, res) => {
  ok(res, await service.getByCode(req.params.codigo as string));
});

productsRouter.get("/exportar", validate(exportProductosQuery, "query"), async (req, res) => {
  const { formato } = getValidated<{ formato: "csv" | "xlsx" }>(req, "query");
  await service.exportarCatalogo(res, formato);
});

productsRouter.get("/plantilla", validate(plantillaQuerySchema, "query"), async (req, res) => {
  const { formato } = getValidated<{ formato: "csv" | "xlsx" }>(req, "query");
  await importService.descargarPlantilla(res, formato);
});

productsRouter.get("/:productoId", validate(productIdParams, "params"), async (req, res) => {
  const { productoId } = getValidated<{ productoId: number }>(req, "params");
  ok(res, await service.getById(productoId));
});

productsRouter.get("/:productoId/sugerencias", validate(productIdParams, "params"), async (req, res) => {
  const { productoId } = getValidated<{ productoId: number }>(req, "params");
  ok(res, await service.sugerencias(productoId));
});

productsRouter.post("/importar", requireRole("admin"), upload.single("archivo"), async (req, res) => {
  if (!req.file) throw AppError.badRequest("ARCHIVO_REQUERIDO", "Se requiere un archivo CSV o XLSX");
  ok(res, await importService.importarProductos(req.file.buffer, req.file.originalname));
});

productsRouter.post("/", requireRole("admin"), validate(createProductSchema), async (req, res) => {
  created(res, await service.create(getValidated<CreateProductInput>(req, "body")));
});

productsRouter.put(
  "/:productoId",
  requireRole("admin"),
  validate(productIdParams, "params"),
  validate(updateProductSchema),
  async (req, res) => {
    const { productoId } = getValidated<{ productoId: number }>(req, "params");
    ok(res, await service.update(productoId, getValidated<Record<string, unknown>>(req, "body")));
  }
);

productsRouter.patch(
  "/:productoId/desactivar",
  requireRole("admin"),
  validate(productIdParams, "params"),
  async (req, res) => {
    const { productoId } = getValidated<{ productoId: number }>(req, "params");
    ok(res, await service.deactivate(productoId));
  }
);

productsRouter.post(
  "/:productoId/ajustar",
  requireRole("admin"),
  validate(productIdParams, "params"),
  validate(ajustarStockSchema),
  async (req: AuthedRequest, res) => {
    const { productoId } = getValidated<{ productoId: number }>(req, "params");
    ok(res, await service.ajustar(productoId, getValidated<never>(req, "body"), req.user!));
  }
);

productsRouter.get(
  "/:productoId/movimientos",
  validate(productIdParams, "params"),
  validate(listMovimientosQuery, "query"),
  async (req, res) => {
    const { productoId } = getValidated<{ productoId: number }>(req, "params");
    const q = getValidated<{ page: number; pageSize: number }>(req, "query");
    const result = await service.movimientos(productoId, q.page, q.pageSize);
    paginated(res, result.data, result.meta);
  }
);

productsRouter.get("/:productoId/bom", validate(productIdParams, "params"), async (req, res) => {
  const { productoId } = getValidated<{ productoId: number }>(req, "params");
  ok(res, await service.getBom(productoId));
});

productsRouter.put(
  "/:productoId/bom",
  requireRole("admin"),
  validate(productIdParams, "params"),
  validate(bomSchema),
  async (req, res) => {
    const { productoId } = getValidated<{ productoId: number }>(req, "params");
    ok(res, await service.setBom(productoId, getValidated<never>(req, "body")));
  }
);
