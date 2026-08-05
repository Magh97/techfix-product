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

/* --- Recepción parcial por línea de OC --- */

export const recibirLineaSchema = z.object({
  detalleCompraId: z.number().int().positive(),
  cantidadRecibida: z.number().int().positive(),
});

export const recibirSchema = z
  .object({
    // Sin body (o sin `lineas`) se recibe todo lo pendiente de la OC
    lineas: z.array(recibirLineaSchema).optional(),
  })
  .default({});

/* --- Solicitudes de reabastecimiento --- */

export const crearSolicitudSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  ordenId: z.number().int().positive().optional().nullable(),
  motivo: z.string().max(500).optional(),
});

export const listSolicitudesQuery = z.object({
  estado: z.enum(["pendiente", "aprobada", "entregada", "rechazada", "cancelada"]).optional(),
  ordenId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const aprobarSolicitudesSchema = z.object({
  solicitudes: z.array(z.number().int().positive()).min(1),
});

export const resolverSolicitudSchema = z.object({
  motivo: z.string().min(1).max(500),
});

export const solicitudIdParams = z.object({ solicitudId: z.coerce.number().int().positive() });
