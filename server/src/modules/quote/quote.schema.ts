import { z } from "zod";

export const createCotizacionVentaSchema = z.object({
  clienteId: z.number().int().positive(),
  lineas: z
    .array(z.object({ productoId: z.number().int().positive(), cantidad: z.number().int().positive() }))
    .min(1)
    .max(100),
  vigenciaDias: z.number().int().positive().max(90).default(7),
  descuento: z.number().nonnegative().default(0),
  motivoDescuento: z.string().min(1).optional(),
});

export const listCotizacionesVentaQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  estado: z.enum(["emitida", "aprobada", "rechazada", "convertida", "cancelada", "expirada"]).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  folio: z.string().optional(),
});

export const cotizacionVentaIdParams = z.object({ id: z.coerce.number().int().positive() });

export const estadoCotizacionVentaSchema = z.object({
  nuevoEstado: z.enum(["aprobada", "rechazada", "cancelada"]),
  motivo: z.string().optional(),
});

export const convertirCotizacionVentaSchema = z.object({
  metodoPago: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"]),
  tipoPago: z.enum(["contado", "credito"]).default("contado"),
  montoRecibido: z.number().nonnegative().optional().nullable(),
});
