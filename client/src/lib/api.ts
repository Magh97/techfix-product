import type {
  Bom,
  BusinessConfig,
  Caja,
  Catalogo,
  Cliente,
  Compra,
  Corte,
  CotizacionVenta,
  CreateCotizacionVenta,
  CreateOrden,
  CreateProducto,
  CreateVenta,
  CxcItem,
  CxpItem,
  DashboardResumen,
  EspecificacionCampo,
  EstadoOrden,
  Garantia,
  ImportResult,
  LoginResponse,
  Movimiento,
  NotificacionHistorial,
  OrdenServicio,
  Paginated,
  PlantillaInfo,
  Producto,
  Proveedor,
  ReporteCliente,
  ReporteFinanciero,
  ReporteInventario,
  ReporteRentabilidad,
  ReporteVenta,
  ReporteServicios,
  Sugerencias,
  Usuario,
  Venta,
} from "./types";

const API_URL: string = import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("ts_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeader(),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.code ?? "ERROR", err?.message ?? "Error", err?.details);
  }
  return body as T;
}

export const authApi = {
  login: (usuario: string, password: string) =>
    api<{ data: LoginResponse }>("/auth/login", { method: "POST", body: JSON.stringify({ usuario, password }) }),
};

export const usuariosApi = {
  list: (params?: { rol?: "admin" | "vendedor" | "tecnico"; isActive?: boolean; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.rol) qs.set("rol", params.rol);
    if (params?.isActive !== undefined) qs.set("isActive", String(params.isActive));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Usuario>>(`/usuarios${s ? `?${s}` : ""}`);
  },
  create: (input: { nombre: string; usuario: string; password: string; rol: "admin" | "vendedor" | "tecnico" }) =>
    api<{ data: Usuario }>("/usuarios", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: Partial<{ nombre: string; rol: "admin" | "vendedor" | "tecnico"; isActive: boolean; password: string }>) =>
    api<{ data: Usuario }>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => api<{ data: Usuario }>(`/usuarios/${id}`, { method: "DELETE" }),
};

export const dashboardApi = {
  resumen: () => api<{ data: DashboardResumen }>("/dashboard/resumen"),
};

export const catalogosApi = {
  list: () => api<{ data: Catalogo[] }>("/catalogos"),
  create: (input: { nombre: string; parentId?: number | null; camposEspecificacion?: EspecificacionCampo[]; clavesCompatibilidad?: string[] }) =>
    api<{ data: Catalogo }>("/catalogos", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: { nombre?: string; parentId?: number | null; camposEspecificacion?: EspecificacionCampo[]; clavesCompatibilidad?: string[] }) =>
    api<{ data: Catalogo }>(`/catalogos/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => api<{ data: { id: number } }>(`/catalogos/${id}`, { method: "DELETE" }),
};

export const productsApi = {
  list: (params?: { q?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Producto>>(`/productos${s ? `?${s}` : ""}`);
  },
  create: (input: CreateProducto) => api<{ data: Producto }>("/productos", { method: "POST", body: JSON.stringify(input) }),
  exportar: (formato: "csv" | "xlsx") => downloadExport("/productos/exportar", `catalogo-productos.${formato}`, { formato }),
  plantilla: (formato: "csv" | "xlsx") => downloadExport("/productos/plantilla", `plantilla-productos.${formato}`, { formato }),
  importar: (file: File) => uploadFile<ImportResult>("/productos/importar", "archivo", file),
  getBom: (id: number) => api<{ data: Bom }>(`/productos/${id}/bom`),
  setBom: (id: number, input: { componentes: { productoId: number; cantidad: number }[]; manoObra?: number }) =>
    api<{ data: Bom }>(`/productos/${id}/bom`, { method: "PUT", body: JSON.stringify(input) }),
  sugerencias: (id: number) => api<{ data: Sugerencias }>(`/productos/${id}/sugerencias`),
  porCodigo: (codigo: string) => api<{ data: Producto }>(`/productos/por-codigo/${encodeURIComponent(codigo)}`),
  ajustar: (id: number, input: { cantidad: number; motivo: string }) =>
    api<{ data: Producto }>(`/productos/${id}/ajustar`, { method: "POST", body: JSON.stringify(input) }),
  movimientos: (id: number, params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Movimiento>>(`/productos/${id}/movimientos${s ? `?${s}` : ""}`);
  },
};

export const clientesApi = {
  list: (params?: { q?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Cliente>>(`/clientes${s ? `?${s}` : ""}`);
  },
  create: (input: { nombre: string; telefono: string; correo?: string | null; limiteCredito?: number; plazoCreditoDias?: number }) =>
    api<{ data: Cliente }>("/clientes", { method: "POST", body: JSON.stringify(input) }),
  get: (id: number) => api<{ data: Cliente & { saldoPendiente: number } }>(`/clientes/${id}`),
  update: (id: number, input: Partial<{ nombre: string; telefono: string; correo: string | null; limiteCredito: number; plazoCreditoDias: number }>) =>
    api<{ data: Cliente }>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  historial: (id: number) =>
    api<{ data: { ordenes: { id: number; folio: string; estado: string; retrasada: boolean; fecha: string }[]; ventas: { id: number; folio: string; total: number; estado: string; fecha: string }[]; cotizaciones: { id: number; folio: string; total: number; estado: string }[] } }>(`/clientes/${id}/historial`),
  cxc: (id: number) =>
    api<{ data: { limiteCredito: number; saldoTotal: number; items: { ventaId: number; folio: string; total: number; saldo: number; fechaVencimiento: string | null; estado: string }[] } }>(`/clientes/${id}/cxc`),
};

export const ventasApi = {
  create: (input: CreateVenta) => api<{ data: Venta }>("/ventas", { method: "POST", body: JSON.stringify(input) }),
  list: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Venta>>(`/ventas${s ? `?${s}` : ""}`);
  },
  get: (id: number) => api<{ data: Venta }>(`/ventas/${id}`),
  getByFolio: (folio: string) => api<{ data: Venta }>(`/ventas/por-folio/${encodeURIComponent(folio)}`),
  pagar: (id: number, input: { monto: number; metodo: string }) =>
    api<{ data: unknown }>(`/ventas/${id}/pagos`, { method: "POST", body: JSON.stringify(input) }),
  cancelar: (id: number, motivo: string) => api<{ data: Venta }>(`/ventas/${id}/cancelar`, { method: "POST", body: JSON.stringify({ motivo }) }),
};

export const cajaApi = {
  abrir: () => api<{ data: Caja }>("/caja/abrir", { method: "POST" }),
  actual: () => api<{ data: Caja | null }>("/caja/actual"),
  corte: () => api<{ data: Corte }>("/caja/corte"),
  cerrar: (efectivoFisico: number) => api<{ data: Caja & { diferencia: number } }>("/caja/cerrar", { method: "POST", body: JSON.stringify({ efectivoFisico }) }),
};

export const finanzasApi = {
  movimientos: () => api<Paginated<{ tipo: string; folio: string; monto: number; metodo: string; fecha: string }>>("/finanzas/movimientos"),
  egresos: () => api<Paginated<{ id: number; concepto: string; categoria: string; monto: number; metodo: string; fecha: string }>>("/finanzas/egresos"),
  registrarEgreso: (input: { concepto: string; categoria: string; monto: number; metodo: string }) =>
    api<{ data: unknown }>("/finanzas/egresos", { method: "POST", body: JSON.stringify(input) }),
  cxc: () => api<{ data: CxcItem[] }>("/finanzas/cxc"),
};

export const proveedoresApi = {
  list: (params?: { q?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Proveedor>>(`/proveedores${s ? `?${s}` : ""}`);
  },
  create: (input: { nombre: string; contacto?: string | null; condicionesPago?: string | null }) =>
    api<{ data: Proveedor }>("/proveedores", { method: "POST", body: JSON.stringify(input) }),
  get: (id: number) => api<{ data: Proveedor }>(`/proveedores/${id}`),
  update: (id: number, input: { nombre?: string; contacto?: string | null; condicionesPago?: string | null }) =>
    api<{ data: Proveedor }>(`/proveedores/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => api<{ data: { id: number } }>(`/proveedores/${id}`, { method: "DELETE" }),
};

export const comprasApi = {
  list: (params?: { proveedorId?: number; estado?: string; folio?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.proveedorId) qs.set("proveedorId", String(params.proveedorId));
    if (params?.estado) qs.set("estado", params.estado);
    if (params?.folio) qs.set("folio", params.folio);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Compra>>(`/compras${s ? `?${s}` : ""}`);
  },
  get: (id: number) => api<{ data: Compra }>(`/compras/${id}`),
  create: (input: { proveedorId: number; fechaVencimiento?: string | null; lineas: { productoId: number; cantidad: number; precioUnitario: number }[] }) =>
    api<{ data: Compra }>("/compras", { method: "POST", body: JSON.stringify(input) }),
  enviar: (id: number) => api<{ data: Compra }>(`/compras/${id}/enviar`, { method: "POST" }),
  recibir: (id: number) => api<{ data: Compra }>(`/compras/${id}/recibir`, { method: "POST" }),
  cancelar: (id: number) => api<{ data: Compra }>(`/compras/${id}/cancelar`, { method: "POST" }),
  pagar: (id: number, input: { monto: number; metodo: string }) =>
    api<{ data: { compraId: number; monto: number; saldoPendiente: number } }>(`/compras/${id}/pagos`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cxp: () => api<{ data: CxpItem[] }>("/compras/cxp"),
};

export const notificacionesApi = {
  plantillas: () => api<{ data: PlantillaInfo[] }>("/notificaciones/plantillas"),
  guardarPlantilla: (tipo: string, input: { asunto?: string | null; cuerpo: string }) =>
    api<{ data: { tipo: string; asunto: string | null; cuerpo: string } }>(`/notificaciones/plantillas/${tipo}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  historial: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<NotificacionHistorial>>(`/notificaciones/historial${s ? `?${s}` : ""}`);
  },
};

export const CONFIG_CLAVES = [
  "iva.rate",
  "credito.limite_default",
  "credito.plazo_default",
  "ventas.descuento_vendedor_max",
  "ventas.dias_devolucion",
  "servicios.dias_garantia",
  "ordenes.tolerancia_retraso_dias",
] as const;

export type ConfigClave = (typeof CONFIG_CLAVES)[number];

export const configuracionApi = {
  get: () => api<{ data: BusinessConfig }>("/configuracion"),
  update: (clave: ConfigClave, valor: number) =>
    api<{ data: { clave: string; valor: number } }>("/configuracion", {
      method: "PUT",
      body: JSON.stringify({ clave, valor }),
    }),
};

export const garantiasApi = {
  list: (params?: { clienteId?: number; estado?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.clienteId) qs.set("clienteId", String(params.clienteId));
    if (params?.estado) qs.set("estado", params.estado);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<Garantia>>(`/garantias${s ? `?${s}` : ""}`);
  },
};

export const ordenesApi = {
  list: (params?: { estado?: string; retrasadas?: boolean; folio?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.estado) qs.set("estado", params.estado);
    if (params?.retrasadas) qs.set("retrasadas", "true");
    if (params?.folio) qs.set("folio", params.folio);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<OrdenServicio>>(`/ordenes${s ? `?${s}` : ""}`);
  },
  get: (id: number) => api<{ data: OrdenServicio }>(`/ordenes/${id}`),
  create: (input: CreateOrden) => api<{ data: OrdenServicio }>("/ordenes", { method: "POST", body: JSON.stringify(input) }),
  changeEstado: (id: number, nuevoEstado: EstadoOrden, nota?: string) =>
    api<{ data: OrdenServicio }>(`/ordenes/${id}/estado`, { method: "PATCH", body: JSON.stringify({ nuevoEstado, nota }) }),
  setDiagnostico: (id: number, diagnostico: string) =>
    api<{ data: OrdenServicio }>(`/ordenes/${id}/diagnostico`, { method: "POST", body: JSON.stringify({ diagnostico }) }),
  crearCotizacion: (id: number, lineas: unknown[]) =>
    api<{ data: OrdenServicio }>(`/ordenes/${id}/cotizaciones`, { method: "POST", body: JSON.stringify({ lineas }) }),
  aprobarCotizacion: (id: number, cotizacionId: number) =>
    api<{ data: OrdenServicio }>(`/ordenes/${id}/cotizaciones/${cotizacionId}/aprobar`, { method: "POST" }),
  registrarConsumo: (id: number, piezas: { productoId: number; cantidad: number }[]) =>
    api<{ data: OrdenServicio }>(`/ordenes/${id}/consumo`, { method: "POST", body: JSON.stringify({ piezas }) }),
  registrarManoObra: (id: number, input: { horas: number; tarifaHora: number; descripcion?: string }) =>
    api<{ data: OrdenServicio }>(`/ordenes/${id}/mano-obra`, { method: "POST", body: JSON.stringify(input) }),
  entregar: (id: number, input: { firma: string; metodoPago?: string }) =>
    api<{ data: { orden: OrdenServicio; ventaFolio: string } }>(`/ordenes/${id}/entregar`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancelar: (id: number, motivo: string) =>
    api<{ data: OrdenServicio }>(`/ordenes/${id}/cancelar`, { method: "POST", body: JSON.stringify({ motivo }) }),
  notificar: (id: number, tipo: "listo" | "cotizacion") =>
    api<{ data: unknown }>(`/ordenes/${id}/notificar`, { method: "POST", body: JSON.stringify({ tipo }) }),
};

export async function downloadExport(
  path: string,
  filename: string,
  params?: Record<string, string | number | undefined>
) {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  const res = await fetch(`${API_URL}${path}${s ? `?${s}` : ""}`, { headers: authHeader() });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? "ERROR", body?.error?.message ?? "Error al exportar");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function uploadFile<T>(path: string, field: string, file: File): Promise<T> {
  const fd = new FormData();
  fd.append(field, file);
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: authHeader(), body: fd });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? "ERROR", body?.error?.message ?? "Error", body?.error?.details);
  }
  return body.data as T;
}

export const reportsApi = {
  inventario: () => api<{ data: { data: ReporteInventario[]; resumen: { totalArticulos: number; valorTotalCosto: number; stockBajo: number } } }>("/reports/inventario"),
  ventas: (params: { desde?: string; hasta?: string; agrupar: string }) => {
    const qs = new URLSearchParams();
    if (params.desde) qs.set("desde", params.desde);
    if (params.hasta) qs.set("hasta", params.hasta);
    qs.set("agrupar", params.agrupar);
    return api<{ data: { data: ReporteVenta[]; resumen: { totalVentas: number; totalImporte: number } } }>(`/reports/ventas?${qs.toString()}`);
  },
  servicios: (params: { desde?: string; hasta?: string; estado?: string; tecnicoId?: number }) => {
    const qs = new URLSearchParams();
    if (params.desde) qs.set("desde", params.desde);
    if (params.hasta) qs.set("hasta", params.hasta);
    if (params.estado) qs.set("estado", params.estado);
    if (params.tecnicoId) qs.set("tecnicoId", String(params.tecnicoId));
    return api<{ data: ReporteServicios }>(`/reports/servicios?${qs.toString()}`);
  },
  rentabilidad: (params: { desde?: string; hasta?: string }) => {
    const qs = new URLSearchParams();
    if (params.desde) qs.set("desde", params.desde);
    if (params.hasta) qs.set("hasta", params.hasta);
    const s = qs.toString();
    return api<{ data: ReporteRentabilidad }>(`/reports/rentabilidad${s ? `?${s}` : ""}`);
  },
  clientes: (params: { desde?: string; hasta?: string }) => {
    const qs = new URLSearchParams();
    if (params.desde) qs.set("desde", params.desde);
    if (params.hasta) qs.set("hasta", params.hasta);
    const s = qs.toString();
    return api<{ data: ReporteCliente }>(`/reports/clientes${s ? `?${s}` : ""}`);
  },
  financiero: (params: { desde?: string; hasta?: string }) => {
    const qs = new URLSearchParams();
    if (params.desde) qs.set("desde", params.desde);
    if (params.hasta) qs.set("hasta", params.hasta);
    const s = qs.toString();
    return api<{ data: ReporteFinanciero }>(`/reports/financiero${s ? `?${s}` : ""}`);
  },
  exportar: (tipo: "inventario" | "ventas" | "servicios" | "rentabilidad" | "clientes" | "financiero", formato: "csv" | "xlsx", params?: Record<string, string | number | undefined>) =>
    downloadExport(`/reports/${tipo}/export`, `reporte-${tipo}.${formato}`, { ...params, formato }),
};

export const quoteApi = {
  list: (params?: { estado?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.estado) qs.set("estado", params.estado);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const s = qs.toString();
    return api<Paginated<CotizacionVenta>>(`/cotizaciones-venta${s ? `?${s}` : ""}`);
  },
  get: (id: number) => api<{ data: CotizacionVenta }>(`/cotizaciones-venta/${id}`),
  create: (input: CreateCotizacionVenta) => api<{ data: CotizacionVenta }>("/cotizaciones-venta", { method: "POST", body: JSON.stringify(input) }),
  changeEstado: (id: number, nuevoEstado: "aprobada" | "rechazada" | "cancelada", motivo?: string) =>
    api<{ data: CotizacionVenta }>(`/cotizaciones-venta/${id}/estado`, { method: "PATCH", body: JSON.stringify({ nuevoEstado, motivo }) }),
  convertir: (id: number, input: { metodoPago: string; tipoPago?: "contado" | "credito"; montoRecibido?: number | null }) =>
    api<{ data: { cotizacionId: number; folioCotizacion: string; venta: Venta } }>(`/cotizaciones-venta/${id}/convertir`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
