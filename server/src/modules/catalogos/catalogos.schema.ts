import { z } from "zod";

export const campoEspecificacionSchema = z.object({
  clave: z.string().min(1).max(60),
  etiqueta: z.string().min(1).max(80),
});

export const crearCatalogoSchema = z.object({
  nombre: z.string().min(1).max(80),
  parentId: z.number().int().positive().optional().nullable(),
  camposEspecificacion: z.array(campoEspecificacionSchema).optional().default([]),
  clavesCompatibilidad: z.array(z.string().min(1)).optional().default([]),
});

export const actualizarCatalogoSchema = crearCatalogoSchema.partial();

export const catalogoIdParams = z.object({ catalogoId: z.coerce.number().int().positive() });
