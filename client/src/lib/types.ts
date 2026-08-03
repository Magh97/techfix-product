export interface Usuario {
  id: number;
  nombre: string;
  rol: "admin" | "vendedor" | "tecnico";
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface Producto {
  id: number;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  categoriaId: number;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  isKit: boolean;
  isActive: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface CreateProducto {
  categoriaId: number;
  sku: string;
  codigoBarras?: string | null;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  precioCompra: number;
  precioVenta: number;
  stockMinimo?: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  correo: string | null;
  direccion: string | null;
  preferenciaContacto: string;
  limiteCredito: number;
  plazoCreditoDias: number;
  etiquetas: string[];
}

export type EstadoOrden =
  | "pendiente"
  | "en_diagnostico"
  | "cotizado"
  | "en_reparacion"
  | "listo"
  | "entregado"
  | "cancelado";

export interface HistorialOrden {
  id: number;
  estado: EstadoOrden;
  estadoLabel: string;
  usuarioId: number;
  usuarioNombre: string;
  nota: string | null;
  fecha: string;
}

export interface CotizacionLinea {
  id: number;
  tipoLinea: "refaccion" | "mano_obra";
  productoId: number | null;
  nombre: string | null;
  cantidad: number | null;
  precioNeto: number;
  descripcion: string | null;
  horas: number | null;
  tarifaHora: number | null;
}

export interface Cotizacion {
  id: number;
  folio: string;
  ordenId: number;
  estado: "emitida" | "aprobada" | "rechazada" | "expirada" | "convertida";
  subtotal: number;
  iva: number;
  total: number;
  vigenciaDesde: string;
  vigenciaHasta: string;
  lineas: CotizacionLinea[];
}

export interface DetalleOrden {
  id: number;
  ordenId: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  estadoLinea: string;
  costoUnitario: string;
}

export interface OrdenServicio {
  id: number;
  folio: string;
  clienteId: number;
  clienteNombre: string;
  clienteTelefono: string;
  tipoEquipo: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  accesorios: string | null;
  fallaReportada: string;
  diagnostico: string | null;
  estado: EstadoOrden;
  retrasada: boolean;
  fechaPrometida: string;
  fechaEntrega: string | null;
  tecnicoId: number | null;
  vendedorId: number;
  firma: string | null;
  createdAt: string;
  historial: HistorialOrden[];
  cotizaciones: Cotizacion[];
  detalle: DetalleOrden[];
}

export interface CreateOrden {
  clienteId: number;
  tipoEquipo: string;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  accesorios?: string | null;
  fallaReportada: string;
  fechaPrometida?: string;
  tecnicoId?: number | null;
}
