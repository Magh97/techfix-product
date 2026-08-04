import { z } from "zod";

export const importRowSchema = z.object({
  sku: z.string().min(1),
  codigoBarras: z.string().optional().nullable(),
  nombre: z.string().min(1),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  categoriaId: z.coerce.number().int().positive(),
  precioCompra: z.coerce.number().nonnegative(),
  precioVenta: z.coerce.number().nonnegative(),
  stockMinimo: z.coerce.number().int().nonnegative().default(0),
  stock: z.coerce.number().int().nonnegative().default(0),
  catalogoId: z.coerce.number().int().positive().optional().nullable(),
  catalogo: z.string().optional().nullable(),
  especificaciones: z.string().optional().nullable(),
});

export const plantillaQuerySchema = z.object({
  formato: z.enum(["csv", "xlsx"]).default("csv"),
});
