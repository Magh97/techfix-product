import { z } from "zod";

export const createProveedorSchema = z.object({
  nombre: z.string().min(1).max(120),
  contacto: z.string().max(120).optional().nullable(),
  condicionesPago: z.string().optional().nullable(),
});

export const updateProveedorSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  contacto: z.string().max(120).optional().nullable(),
  condicionesPago: z.string().optional().nullable(),
});

export const proveedorIdParams = z.object({ proveedorId: z.coerce.number().int().positive() });

export const listProveedoresQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
