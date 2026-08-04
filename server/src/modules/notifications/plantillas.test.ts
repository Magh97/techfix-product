import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPlantilla, tipoNotificacion } from "./plantillas";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tipoNotificacion", () => {
  it("mapea listo a NOT-02 y cotizacion a NOT-03", () => {
    expect(tipoNotificacion("listo")).toBe("NOT-02");
    expect(tipoNotificacion("cotizacion")).toBe("NOT-03");
  });
});

describe("renderPlantilla", () => {
  it("reemplaza variables desde plantilla de BD", () => {
    const { asunto, cuerpo } = renderPlantilla(
      "NOT-02",
      { cliente: "Ana Torres", folio: "2026-0001", fecha: "2026-08-03" },
      { asunto: "Hola {cliente}", cuerpo: "Folio {folio} · {fecha}" }
    );
    expect(asunto).toBe("Hola Ana Torres");
    expect(cuerpo).toBe("Folio 2026-0001 · 2026-08-03");
  });

  it("usa plantilla por defecto si no hay en BD", () => {
    const { cuerpo } = renderPlantilla("NOT-02", { cliente: "Ana", folio: "2026-0002", fecha: "2026-08-03" }, null);
    expect(cuerpo).toContain("Ana");
    expect(cuerpo).toContain("2026-0002");
  });

  it("reemplaza variables desconocidas por cadena vacía", () => {
    const { cuerpo } = renderPlantilla("NOT-02", { cliente: "Ana" }, null);
    expect(cuerpo).not.toContain("{folio}");
  });
});
