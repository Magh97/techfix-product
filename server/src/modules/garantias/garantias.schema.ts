import { z } from "zod";

export const listGarantiasQuery = z.object({
  clienteId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["vigente", "por_vencer", "vencida"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
