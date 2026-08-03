import type {
  Caja,
  Cliente,
  Corte,
  CreateOrden,
  CreateProducto,
  CreateVenta,
  CxcItem,
  EstadoOrden,
  LoginResponse,
  OrdenServicio,
  Paginated,
  Producto,
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
