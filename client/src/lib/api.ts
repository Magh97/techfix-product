import type { CreateProducto, LoginResponse, Paginated, Producto } from "./types";

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
