import { z } from "zod";

export const plantillaParams = z.object({
  tipo: z.string().min(1).max(40),
});

export const plantillaSchema = z.object({
  asunto: z.string().optional().nullable(),
  cuerpo: z.string().min(1),
});

export const historialQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
