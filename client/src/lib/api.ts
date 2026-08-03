import type {
  Cliente,
  CreateOrden,
  CreateProducto,
  EstadoOrden,
  LoginResponse,
  OrdenServicio,
  Paginated,
  Producto,
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
  create: (input: { nombre: string; telefono: string; correo?: string | null }) =>
    api<{ data: Cliente }>("/clientes", { method: "POST", body: JSON.stringify(input) }),
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
