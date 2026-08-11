import { z } from "zod";

export const listProductsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
  categoria: z.string().optional(),
  catalogoId: z.coerce.number().int().positive().optional(),
  stockBajo: z.enum(["true", "false"]).optional(),
});

export const createProductSchema = z.object({
  categoriaId: z.number().int().positive(),
  sku: z.string().min(1),
  codigoBarras: z.string().optional().nullable(),
  nombre: z.string().min(1),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  precioCompra: z.number().nonnegative(),
  precioVenta: z.number().nonnegative(),
  stockMinimo: z.number().int().nonnegative().default(0),
  stockMaximo: z.number().int().nonnegative().default(0),
  proveedorFavoritoId: z.number().int().positive().optional().nullable(),
  catalogoId: z.number().int().positive().optional().nullable(),
  especificaciones: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParams = z.object({
  productoId: z.coerce.number().int().positive(),
});

export const ajustarStockSchema = z
  .object({
    cantidad: z.number().int().refine((v) => v !== 0, { message: "La cantidad debe ser distinta de 0" }),
    motivo: z.string().min(1),
    tipo: z.enum(["ajuste", "merma", "dano"]).default("ajuste"),
  })
  .refine((v) => v.tipo !== "merma" || v.cantidad < 0, {
    message: "La merma requiere cantidad negativa",
    path: ["cantidad"],
  })
  .refine((v) => v.tipo !== "dano" || v.cantidad < 0, {
    message: "El daño requiere cantidad negativa",
    path: ["cantidad"],
  });

export const listMovimientosQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const exportProductosQuery = z.object({
  formato: z.enum(["csv", "xlsx"]).default("csv"),
});

export const bomSchema = z.object({
  componentes: z
    .array(z.object({ productoId: z.number().int().positive(), cantidad: z.number().int().positive() }))
    .max(100),
  manoObra: z.number().nonnegative().default(0),
});
