import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_EXPIRED_EVENT } from "./auth";
import { agendarAutoRefresh, api, ventasApi } from "./api";

function jsonRes(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob()),
  } as unknown as Response;
}

const err401 = jsonRes({ error: { code: "UNAUTHORIZED", message: "No autorizado" } }, 401);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("api auto-refresh", () => {
  it("reintenta con refresh tras un 401 y actualiza los tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(err401)
      .mockResolvedValueOnce(jsonRes({ data: { token: "nuevo", refreshToken: "rt2", expiresIn: 900 } }))
      .mockResolvedValueOnce(jsonRes({ data: [{ id: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "viejo");
    localStorage.setItem("ts_refresh", "rt1");

    const r = await api<{ data: unknown }>("/productos");
    expect(r.data).toEqual([{ id: 1 }]);
    expect(localStorage.getItem("ts_token")).toBe("nuevo");
    expect(localStorage.getItem("ts_refresh")).toBe("rt2");

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("single-flight: dos 401 simultáneos comparten un solo refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(err401)
      .mockResolvedValueOnce(err401)
      .mockResolvedValueOnce(jsonRes({ data: { token: "nuevo", refreshToken: "rt2", expiresIn: 900 } }))
      .mockResolvedValueOnce(jsonRes({ data: "ok1" }))
      .mockResolvedValueOnce(jsonRes({ data: "ok2" }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "viejo");
    localStorage.setItem("ts_refresh", "rt1");

    const [a, b] = await Promise.all([api("/a"), api("/b")]);
    expect(a).toEqual({ data: "ok1" });
    expect(b).toEqual({ data: "ok2" });

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("si el refresh falla, limpia la sesión, dispara el evento y lanza SESSION_EXPIRED", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(err401).mockResolvedValueOnce(err401);
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "viejo");
    localStorage.setItem("ts_refresh", "rt1");
    localStorage.setItem("ts_user", JSON.stringify({ id: 1, nombre: "x", rol: "admin" }));
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await expect(api("/productos")).rejects.toThrow("Sesión expirada");
    expect(listener).toHaveBeenCalled();
    expect(localStorage.getItem("ts_token")).toBeNull();
    expect(localStorage.getItem("ts_refresh")).toBeNull();
    expect(localStorage.getItem("ts_user")).toBeNull();
  });

  it("agenda un refresh proactivo antes de la expiración", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ data: { token: "nuevo", refreshToken: "rt2", expiresIn: 120 } }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "t1");
    localStorage.setItem("ts_refresh", "rt1");

    agendarAutoRefresh(120);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    expect(localStorage.getItem("ts_token")).toBe("nuevo");
  });
});

describe("ventasApi.cancelar / devolucion", () => {
  it("cancelar envía POST con motivo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ data: { id: 7, folio: "VEN-0007" } }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "t1");
    localStorage.setItem("ts_refresh", "rt1");

    await ventasApi.cancelar(7, "Error del vendedor");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/ventas/7/cancelar");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ motivo: "Error del vendedor" });
  });

  it("devolucion envía POST con líneas y motivo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ data: { id: 7, folio: "VEN-0007" } }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "t1");
    localStorage.setItem("ts_refresh", "rt1");

    await ventasApi.devolucion(7, [{ productoId: 3, cantidad: 2 }], "Cambio de opinión");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/ventas/7/devolucion");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ lineas: [{ productoId: 3, cantidad: 2 }], motivo: "Cambio de opinión" });
  });

  it("devolucion omite el motivo si no se envía", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ data: { id: 7, folio: "VEN-0007" } }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "t1");
    localStorage.setItem("ts_refresh", "rt1");

    await ventasApi.devolucion(7, [{ productoId: 3, cantidad: 1 }]);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ lineas: [{ productoId: 3, cantidad: 1 }] });
  });

  it("pagar envía desglose mixto cuando se pasan pagos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ data: { ventaId: 7, saldoPendiente: 0 } }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("ts_token", "t1");
    localStorage.setItem("ts_refresh", "rt1");

    await ventasApi.pagar(7, { pagos: [{ metodo: "efectivo", monto: 60 }, { metodo: "tarjeta_credito", monto: 56 }] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/ventas/7/pagos");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ pagos: [{ metodo: "efectivo", monto: 60 }, { metodo: "tarjeta_credito", monto: 56 }] });
  });
});
