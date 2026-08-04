import { z } from "zod";

const lineaCompra = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().nonnegative(),
});

export const crearCompraSchema = z.object({
  proveedorId: z.number().int().positive(),
  fechaVencimiento: z.string().optional().nullable(),
  lineas: z.array(lineaCompra).min(1),
});

export const pagoCompraSchema = z.object({
  monto: z.number().positive(),
  metodo: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"]),
});

export const listComprasQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  proveedorId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["borrador", "enviada", "recibida", "cancelada"]).optional(),
  folio: z.string().optional(),
});

export const compraIdParams = z.object({ compraId: z.coerce.number().int().positive() });
