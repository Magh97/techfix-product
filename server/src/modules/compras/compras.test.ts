import { describe, expect, it } from "vitest";
import { AppError } from "../../shared/errors";
import { calcularTotalCompra } from "./compras.service";
import { validarTransicionCompra } from "./estadosCompra";

describe("máquina de estados de compra", () => {
  it("permite transiciones válidas con rol admin", () => {
    expect(() => validarTransicionCompra("borrador", "enviada", "admin")).not.toThrow();
    expect(() => validarTransicionCompra("borrador", "cancelada", "admin")).not.toThrow();
    expect(() => validarTransicionCompra("enviada", "recibida", "admin")).not.toThrow();
    expect(() => validarTransicionCompra("enviada", "cancelada", "admin")).not.toThrow();
  });

  it("rechaza transición no permitida", () => {
    expect(() => validarTransicionCompra("recibida", "enviada", "admin")).toThrow(AppError);
    expect(() => validarTransicionCompra("cancelada", "recibida", "admin")).toThrow(AppError);
    expect(() => validarTransicionCompra("borrador", "recibida", "admin")).toThrow(AppError);
  });

  it("rechaza transición con rol no autorizado (vendedor/técnico)", () => {
    expect(() => validarTransicionCompra("borrador", "enviada", "vendedor")).toThrow(AppError);
    expect(() => validarTransicionCompra("enviada", "recibida", "tecnico")).toThrow(AppError);
  });
});

describe("cálculo del total de una compra", () => {
  it("suma cantidad × precio unitario por línea", () => {
    const total = calcularTotalCompra([
      { productoId: 1, cantidad: 2, precioUnitario: 100 },
      { productoId: 2, cantidad: 1, precioUnitario: 350 },
    ]);
    expect(total).toBe(550);
  });

  it("retorna 0 para una compra sin líneas", () => {
    expect(calcularTotalCompra([])).toBe(0);
  });
});
