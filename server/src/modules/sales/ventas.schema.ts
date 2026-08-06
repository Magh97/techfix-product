import { z } from "zod";

export const crearVentaSchema = z.object({
  clienteId: z.number().int().positive().optional().nullable(),
  ordenId: z.number().int().positive().optional().nullable(),
  lineas: z
    .array(
      z.object({
        tipo: z.enum(["producto", "servicio"]),
        productoId: z.number().int().positive().optional(),
        nombre: z.string().optional(),
        cantidad: z.number().int().positive(),
        precioNeto: z.number().nonnegative().optional(),
      })
    )
    .min(1),
  descuento: z.number().nonnegative().optional(),
  motivoDescuento: z.string().optional(),
  tipoPago: z.enum(["contado", "credito"]).default("contado"),
  metodoPago: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"]).optional(),
  plazoDias: z.number().int().positive().optional().nullable(),
  montoRecibido: z.number().nonnegative().optional().nullable(),
  // Parte de pago en especie (equipo usado). Solo ventas de contado.
  partesDePago: z
    .array(
      z.object({
        nombre: z.string().min(1),
        marca: z.string().optional().nullable(),
        modelo: z.string().optional().nullable(),
        valor: z.number().nonnegative(),
        precioVenta: z.number().positive(),
        observaciones: z.string().max(500).optional().nullable(),
      })
    )
    .min(1)
    .optional(),
});

export const listVentasQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  metodoPago: z.string().optional(),
  estado: z.string().optional(),
});

export const ventaIdParams = z.object({ ventaId: z.coerce.number().int().positive() });

export const pagoSchema = z.object({
  monto: z.number().positive(),
  metodo: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"]),
});

export const cancelarVentaSchema = z.object({ motivo: z.string().min(1) });

export const devolucionSchema = z.object({
  lineas: z
    .array(z.object({ productoId: z.number().int().positive(), cantidad: z.number().int().positive() }))
    .min(1),
});
