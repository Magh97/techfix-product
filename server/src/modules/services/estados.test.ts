import { describe, expect, it } from "vitest";
import { AppError } from "../../shared/errors";
import { validarTransicion } from "./estados";

describe("máquina de estados de orden", () => {
  it("permite transiciones válidas con el rol correcto", () => {
    expect(() => validarTransicion("pendiente", "en_diagnostico", "tecnico")).not.toThrow();
    expect(() => validarTransicion("pendiente", "cancelado", "vendedor")).not.toThrow();
    expect(() => validarTransicion("en_reparacion", "listo", "tecnico")).not.toThrow();
  });

  it("rechaza transición no permitida", () => {
    expect(() => validarTransicion("pendiente", "entregado", "admin")).toThrow(AppError);
    expect(() => validarTransicion("entregado", "listo", "admin")).toThrow(AppError);
  });

  it("rechaza transición con rol no autorizado", () => {
    expect(() => validarTransicion("pendiente", "en_diagnostico", "vendedor")).toThrow(AppError);
  });

  it("exige cotización aprobada para iniciar reparación", () => {
    expect(() => validarTransicion("cotizado", "en_reparacion", "tecnico", false)).toThrow();
    expect(() => validarTransicion("cotizado", "en_reparacion", "tecnico", true)).not.toThrow();
  });
});
