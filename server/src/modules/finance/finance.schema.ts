import { z } from "zod";

export const cerrarCajaSchema = z.object({ efectivoFisico: z.number().nonnegative() });

export const ingresoSchema = z.object({
  concepto: z.string().min(1),
  monto: z.number().nonnegative(),
  metodo: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"]),
});

export const egresoSchema = z.object({
  concepto: z.string().min(1),
  categoria: z.string().min(1),
  monto: z.number().nonnegative(),
  metodo: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"]),
});

export const movimientosQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  tipo: z.string().optional(),
});

export const cxcQuery = z.object({
  estado: z.enum(["vigente", "vencido", "pagado"]).optional(),
});
