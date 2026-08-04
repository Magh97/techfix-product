import { z } from "zod";

export const reporteQuerySchema = z.object({
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export const ventasQuerySchema = reporteQuerySchema.extend({
  agrupar: z.enum(["dia", "producto", "vendedor", "metodo"]).default("dia"),
});

export const serviciosQuerySchema = reporteQuerySchema.extend({
  estado: z
    .enum(["pendiente", "en_diagnostico", "cotizado", "en_reparacion", "listo", "entregado", "cancelado"])
    .optional(),
  tecnicoId: z.coerce.number().int().positive().optional(),
});

export const exportQuerySchema = z.object({
  formato: z.enum(["csv", "xlsx"]).default("csv"),
});

export const tipoReporteParams = z.object({
  tipo: z.enum(["inventario", "ventas", "servicios"]),
});

export const tipoProductoExport = z.object({
  formato: z.enum(["csv", "xlsx"]).default("csv"),
});
