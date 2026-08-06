export interface Usuario {
  id: number;
  nombre: string;
  usuario?: string;
  rol: "admin" | "vendedor" | "tecnico";
  isActive?: boolean;
}
export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
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
  stockMaximo: number;
  proveedorFavoritoId: number | null;
  lowStock: boolean;
  isKit: boolean;
  manoObra: number;
  isActive: boolean;
  kitDisponible: number | null;
}

export interface ReabastecimientoLinea {
  productoId: number;
  sku: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  sugerido: number;
  precio: number;
  subtotal: number;
  esFavorito: boolean;
  enOC: boolean;
  folioOC: string | null;
}

export interface ReabastecimientoGrupo {
  proveedorId: number | null;
  proveedorNombre: string;
  totalEstimado: number;
  lineas: ReabastecimientoLinea[];
}

export interface SolicitudReabastecimiento {
  id: number;
  productoId: number;
  sku: string;
  productoNombre: string;
  cantidad: number;
  ordenId: number | null;
  ordenFolio: string | null;
  solicitadoPor: number;
  solicitanteNombre: string;
  motivo: string | null;
  estado: string;
  rechazoMotivo: string | null;
  compraId: number | null;
  compraFolio: string | null;
  resueltoPor: number | null;
  createdAt: string;
  resueltoAt: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface AuditoriaEntry {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  accion: string;
  entidad: string;
  entidadId: number | null;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  fecha: string;
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
  stockMaximo?: number;
  proveedorFavoritoId?: number | null;
  catalogoId?: number | null;
  especificaciones?: string[];
}

export interface Catalogo {
  id: number;
  parentId: number | null;
  nombre: string;
  tagsSugeridas: string[];
  tagsCompatibilidad: string[];
}

export interface Sustituto {
  id: number;
  sku: string;
  nombre: string;
  precioVenta: number;
  stock: number;
  especificaciones: string[];
}

export interface Sugerencias {
  producto: { id: number; nombre: string; catalogoId: number | null; catalogoNombre: string | null };
  componenteCorto: { productoId: number; nombre: string; stock: number; requerido: number } | null;
  sustitutos: Sustituto[];
  sustitutosComponente: Sustituto[];
}

export interface Movimiento {
  id: number;
  tipo: string;
  cantidad: number;
  motivo: string | null;
  usuario: string;
  referenciaId: number | null;
  referenciaTipo: string | null;
  fecha: string;
}

export interface PlantillaInfo {
  tipo: string;
  asunto: string;
  cuerpo: string;
}

export interface NotificacionHistorial {
  id: number;
  tipo: string;
  canal: string;
  estado: string;
  contenido: string | null;
  error: string | null;
  clienteNombre: string | null;
  ordenFolio: string | null;
  fecha: string;
}

export interface BusinessConfig {
  ivaRate: number;
  limiteCreditoDefault: number;
  plazoCreditoDefault: number;
  descuentoVendedorMax: number;
  diasDevolucion: number;
  diasGarantiaServicio: number;
  toleranciaRetrasoDias: number;
}

export interface Garantia {
  id: number;
  clienteId: number;
  clienteNombre: string;
  folio: string | null;
  tipo: string;
  inicio: string;
  fin: string;
  estado: "vigente" | "por_vencer" | "vencida";
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
  | "sustitucion_pendiente"
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
  stock: number | null;
}

export interface Sustitucion {
  id: number;
  ordenId: number;
  cotizacionId: number;
  cotizacionFolio: string;
  lineaId: number;
  productoOriginalId: number;
  skuOriginal: string;
  nombreOriginal: string;
  cantidad: number;
  sustitutoId: number;
  skuSustituto: string;
  nombreSustituto: string;
  precioSustituto: number;
  stockSustituto: number;
  justificacion: string | null;
  clienteAcepta: boolean | null;
  estado: string;
  solicitudId: number | null;
  creadaPor: number;
  creadorNombre: string;
  createdAt: string;
  resueltoAt: string | null;
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

export interface VentaLinea {
  descripcion: string;
  cantidad: number;
  precio: number;
  productoId?: number | null;
}

export interface Venta {
  id: number;
  folio: string;
  clienteId: number | null;
  clienteNombre?: string | null;
  vendedorNombre?: string;
  ordenId: number | null;
  subtotal: number;
  iva: number;
  total: number;
  descuento: number;
  tipoPago: string;
  metodoPago: string | null;
  fechaVencimiento: string | null;
  estado: string;
  cambio?: number;
  createdAt?: string;
  garantias?: { tipo: string; inicio: string; fin: string }[];
  lineas: VentaLinea[];
}

export interface CreateVenta {
  clienteId?: number | null;
  lineas: { tipo: "producto" | "servicio"; productoId?: number; nombre?: string; cantidad: number; precioNeto?: number }[];
  descuento?: number;
  motivoDescuento?: string;
  tipoPago: "contado" | "credito";
  metodoPago?: string;
  plazoDias?: number | null;
  montoRecibido?: number | null;
}

export interface Caja {
  id: number;
  usuarioId: number;
  fecha: string;
  estado: string;
  efectivoFisico: number | null;
  diferencia: number | null;
  apertura: string;
  cierre: string | null;
}

export interface Corte {
  caja: Caja | null;
  ingresosPorMetodo: Record<string, number>;
  egresosPorMetodo: Record<string, number>;
  ingresos: number;
  egresos: number;
  esperadoEfectivo: number;
}

export interface CxcItem {
  ventaId: number;
  folio: string;
  clienteId: number;
  clienteNombre: string;
  total: number;
  saldo: number;
  fechaVencimiento: string | null;
  estado: "vigente" | "vencido" | "pagado";
}

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  condicionesPago: string | null;
}

export type EstadoCompra = "borrador" | "enviada" | "recibida" | "cancelada";

export interface CompraLinea {
  id: number;
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  cantidadRecibida: number;
  pendiente: number;
  recibida: boolean;
  precioUnitario: number;
  subtotal: number;
}

export interface PagoProveedor {
  id: number;
  monto: number;
  metodo: string;
  usuario: string;
  fecha: string;
}

export interface Compra {
  id: number;
  folio: string;
  proveedorId: number;
  proveedorNombre: string;
  estado: EstadoCompra;
  estadoLabel: string;
  total: number;
  totalRecibido: number;
  pagado: number;
  saldo: number;
  fechaVencimiento: string | null;
  creadaPor: number;
  creadorNombre: string;
  createdAt: string;
  lineas: CompraLinea[];
  pagos: PagoProveedor[];
}

export interface CxpItem {
  compraId: number;
  folio: string;
  proveedorId: number;
  proveedorNombre: string;
  total: number;
  saldo: number;
  fechaVencimiento: string | null;
  estado: "vigente" | "vencido" | "pagado";
}

export interface ComparacionProveedor {
  proveedorId: number;
  proveedorNombre: string;
  ultimoPrecio: number;
  ultimaFecha: string;
  folioOC: string;
  cantidad: number;
  esFavorito: boolean;
  esInactivo: boolean;
  esMasBarato: boolean;
  porDebajoDelActual: boolean;
}

export interface ComparacionPrecios {
  producto: { id: number; sku: string; nombre: string; precioCompra: number; proveedorFavoritoId: number | null };
  proveedores: ComparacionProveedor[];
}

export type OrigenUsado = "parte_de_pago" | "reparacion" | "otro";

export interface EquipoUsado {
  id: number;
  productoId: number;
  sku: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  estado: "disponible" | "vendido";
  clienteOrigenId: number | null;
  clienteOrigenNombre: string | null;
  ordenId: number | null;
  valorTradeIn: number;
  origen: OrigenUsado;
  observaciones: string | null;
  creadoPorNombre: string;
  createdAt: string;
}

export interface CrearEquipoUsado {
  sku: string;
  nombre: string;
  codigoBarras?: string | null;
  marca?: string | null;
  modelo?: string | null;
  valorTradeIn: number;
  precioVenta: number;
  stock?: number;
  origen: OrigenUsado;
  clienteId?: number | null;
  observaciones?: string;
}

export interface ReporteInventario {
  id: number;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  categoria: string;
  stock: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  valoracionCosto: number;
  lowStock: boolean;
}

export interface ReporteVenta {
  grupo: string;
  ventas: number;
  total: number;
  unidades?: number;
}

export interface ReporteServicios {
  resumen: {
    total: number;
    enProceso: number;
    entregadas: number;
    canceladas: number;
    retrasadas: number;
    tiempoPromedioReparacionDias: number;
  };
  porEstado: { estado: string; ordenes: number }[];
  porTecnico: { tecnico: string; ordenes: number }[];
  porTipoEquipo: { tipoEquipo: string; ordenes: number }[];
}

export interface ImportResult {
  importados: number;
  omitidos: { fila: number; sku: string; motivo: string }[];
  errores: { fila: number; sku: string; motivo: string }[];
}

export interface BomItem {
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
  stock: number;
}

export interface Bom {
  kitId: number;
  nombre: string;
  manoObra: number;
  precioCompra: number;
  precioVenta: number;
  componentes: BomItem[];
}

export type EstadoCotizacionVenta = "emitida" | "aprobada" | "rechazada" | "convertida" | "cancelada" | "expirada";

export interface CotizacionVentaLinea {
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precioNeto: number;
}

export interface CotizacionVenta {
  id: number;
  folio: string;
  clienteId: number;
  clienteNombre: string;
  estado: EstadoCotizacionVenta;
  subtotal: number;
  iva: number;
  total: number;
  descuento: number;
  motivoDescuento: string | null;
  vigenciaDesde: string;
  vigenciaHasta: string;
  expirada: boolean;
  creadaPor: number;
  creadorNombre: string;
  createdAt: string;
  lineas: CotizacionVentaLinea[];
}

export interface CreateCotizacionVenta {
  clienteId: number;
  lineas: { productoId: number; cantidad: number }[];
  vigenciaDias?: number;
  descuento?: number;
  motivoDescuento?: string;
}

export interface DashboardResumen {
  ventasHoy: { cantidad: number; total: number; ticketPromedio: number };
  ordenes: { activas: number; retrasadas: number };
  inventario: { stockBajo: number; totalProductos: number };
  cajaAbierta: boolean;
  topProductos: { nombre: string; unidades: number; ingreso: number }[];
  topDeudores: { clienteId: number; clienteNombre: string; saldo: number }[];
}

export interface ReporteRentabilidad {
  data: { producto: string; unidades: number; ingreso: number; margen: number; margenPct: number }[];
  resumen: { ingresoTotal: number; margenTotal: number; margenPctPromedio: number };
}

export interface ReporteCliente {
  data: { clienteId: number; cliente: string; ventas: number; totalCompras: number; ticketPromedio: number; saldo: number }[];
  resumen: { totalClientes: number; totalCompras: number; saldoTotal: number };
}

export interface ReporteFinanciero {
  data: { mes: string; ventas: number; ingresos: number; egresos: number; utilidad: number }[];
  resumen: { totalIngresos: number; totalEgresos: number; utilidad: number };
}
