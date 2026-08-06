import { z } from "zod";

export const rolSchema = z.enum(["admin", "vendedor", "tecnico"]);

export const listUsuariosQuery = z.object({
  rol: rolSchema.optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1).max(120),
  usuario: z.string().min(4).max(60),
  password: z.string().min(6).max(100),
  rol: rolSchema,
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  rol: rolSchema.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
});

export const usuarioIdParams = z.object({ usuarioId: z.coerce.number().int().positive() });
