import { z } from "zod";

export const crearQuejaSchema = z.object({
  clienteId: z.number().int().positive(),
  tipo: z.enum(["queja", "reclamacion_garantia"]).default("queja"),
  garantiaId: z.number().int().positive().optional().nullable(),
  ordenId: z.number().int().positive().optional().nullable(),
  ventaId: z.number().int().positive().optional().nullable(),
  descripcion: z.string().min(1).max(1000),
});

export const listQuejasQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  clienteId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["abierta", "en_proceso", "resuelta"]).optional(),
  tipo: z.enum(["queja", "reclamacion_garantia"]).optional(),
});

export const cambiarEstadoQuejaSchema = z.object({
  estado: z.enum(["en_proceso", "resuelta"]),
  resolucion: z.string().max(1000).optional(),
});

export const quejaIdParams = z.object({ quejaId: z.coerce.number().int().positive() });
