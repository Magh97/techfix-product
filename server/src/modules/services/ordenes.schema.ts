import { z } from "zod";

export const createOrdenSchema = z.object({
  clienteId: z.number().int().positive(),
  tipoEquipo: z.enum(["laptop", "desktop", "all_in_one", "periferico", "componente", "otro"]),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  serie: z.string().optional().nullable(),
  accesorios: z.string().optional().nullable(),
  fallaReportada: z.string().min(1),
  fechaPrometida: z.string().optional(),
  tecnicoId: z.number().int().positive().optional().nullable(),
});

export const listOrdenesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  estado: z
    .enum(["pendiente", "en_diagnostico", "cotizado", "en_reparacion", "listo", "entregado", "cancelado"])
    .optional(),
  retrasadas: z.enum(["true", "false"]).optional(),
  folio: z.string().optional(),
  clienteId: z.coerce.number().int().positive().optional(),
});

export const idParams = z.object({ id: z.coerce.number().int().positive() });

export const cidParams = z.object({
  id: z.coerce.number().int().positive(),
  cid: z.coerce.number().int().positive(),
});

export const changeEstadoSchema = z.object({
  nuevoEstado: z.enum(["en_diagnostico", "cotizado", "en_reparacion", "listo", "entregado", "cancelado"]),
  nota: z.string().optional(),
});

export const diagnosticoSchema = z.object({
  diagnostico: z.string().min(1),
  pendienteCompra: z.boolean().optional(),
});

export const cotizacionLineaSchema = z.object({
  tipoLinea: z.enum(["refaccion", "mano_obra"]),
  productoId: z.number().int().positive().optional(),
  cantidad: z.number().int().positive().optional(),
  horas: z.number().positive().optional(),
  tarifaHora: z.number().nonnegative().optional(),
  descripcion: z.string().optional(),
});

export const crearCotizacionSchema = z.object({
  lineas: z.array(cotizacionLineaSchema).min(1),
});

export const consumoSchema = z.object({
  piezas: z
    .array(z.object({ productoId: z.number().int().positive(), cantidad: z.number().int().positive() }))
    .min(1),
});

export const manoObraSchema = z.object({
  horas: z.number().positive(),
  tarifaHora: z.number().nonnegative(),
  descripcion: z.string().optional(),
});

export const entregarSchema = z.object({
  firma: z.string().min(1),
  metodoPago: z.enum(["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"]).optional(),
});

export const cancelarSchema = z.object({ motivo: z.string().min(1) });

export const notificarSchema = z.object({
  tipo: z.enum(["listo", "cotizacion"]),
  canal: z.enum(["whatsapp", "correo", "llamada"]).optional(),
});
