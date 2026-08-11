import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizarE164, sendWhatsApp } from "./whatsapp";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("normalizarE164", () => {
  it("antepone el código de país default (+52) a un teléfono local", () => {
    expect(normalizarE164("5511223344")).toBe("+525511223344");
  });

  it("respeta un teléfono que ya trae +", () => {
    expect(normalizarE164("+14155552671")).toBe("+14155552671");
  });

  it("limpia separadores", () => {
    expect(normalizarE164("55 1122 3344")).toBe("+525511223344");
  });

  it("usa un código de país custom", () => {
    expect(normalizarE164("5511223344", "1")).toBe("+15511223344");
  });

  it("devuelve null si no hay teléfono o es inválido", () => {
    expect(normalizarE164(null)).toBeNull();
    expect(normalizarE164("")).toBeNull();
    expect(normalizarE164("abc")).toBeNull();
  });
});

describe("sendWhatsApp", () => {
  it("simula el envío cuando no hay credenciales Twilio", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "");
    const r = await sendWhatsApp({ to: "+525511223344", body: "Hola" });
    expect(r.ok).toBe(true);
    expect(r.simulated).toBe(true);
  });
});
