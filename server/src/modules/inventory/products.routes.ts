import { Router } from "express";
import { created, ok, paginated } from "../../shared/http";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";
import type { CreateProductInput } from "./products.repository";
import { createProductSchema, exportProductosQuery, listProductsQuery, productIdParams, updateProductSchema } from "./products.schema";
import * as service from "./products.service";

export const productsRouter = Router();

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
