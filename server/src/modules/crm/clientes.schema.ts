import { z } from "zod";

export const listClientesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
});

export const createClienteSchema = z.object({
  nombre: z.string().min(1),
  telefono: z.string().min(1),
  correo: z.string().email().optional().nullable(),
  direccion: z.string().optional().nullable(),
  preferenciaContacto: z.enum(["whatsapp", "correo", "llamada"]).optional(),
  limiteCredito: z.number().nonnegative().optional(),
  plazoCreditoDias: z.number().int().positive().optional(),
});
