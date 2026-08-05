import { z } from "zod";

export const crearUsadoSchema = z.object({
  sku: z.string().min(1),
  nombre: z.string().min(1),
  codigoBarras: z.string().optional().nullable(),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  // Valor dado como parte de pago = costo de adquisición (precio_compra)
  valorTradeIn: z.number().nonnegative(),
  precioVenta: z.number().positive(),
  stock: z.number().int().positive().default(1),
  origen: z.enum(["parte_de_pago", "reparacion", "otro"]).default("otro"),
  clienteId: z.number().int().positive().optional().nullable(),
  ordenId: z.number().int().positive().optional().nullable(),
  observaciones: z.string().max(500).optional(),
});

export const listUsadosQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  estado: z.enum(["disponible", "vendido"]).optional(),
  origen: z.enum(["parte_de_pago", "reparacion", "otro"]).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  q: z.string().optional(),
});

export const updateUsadoSchema = z.object({
  valorTradeIn: z.number().nonnegative().optional(),
  precioVenta: z.number().positive().optional(),
  origen: z.enum(["parte_de_pago", "reparacion", "otro"]).optional(),
  observaciones: z.string().max(500).optional().nullable(),
});

export const usadoIdParams = z.object({ usadoId: z.coerce.number().int().positive() });
