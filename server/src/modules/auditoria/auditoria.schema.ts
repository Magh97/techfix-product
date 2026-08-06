import { z } from "zod";

export const listAuditoriaQuery = z.object({
  usuarioId: z.coerce.number().int().positive().optional(),
  entidad: z.string().max(60).optional(),
  accion: z.string().max(60).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
