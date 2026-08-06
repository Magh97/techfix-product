import { z } from "zod";

export const crearCatalogoSchema = z.object({
  nombre: z.string().min(1).max(80),
  parentId: z.number().int().positive().optional().nullable(),
  tagsSugeridas: z.array(z.string().min(1).max(80)).optional().default([]),
  tagsCompatibilidad: z.array(z.string().min(1).max(80)).optional().default([]),
});

export const actualizarCatalogoSchema = crearCatalogoSchema.partial();

export const catalogoIdParams = z.object({ catalogoId: z.coerce.number().int().positive() });
