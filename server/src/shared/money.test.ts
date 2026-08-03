import { describe, expect, it } from "vitest";
import { calcMoney, round2 } from "./money";

describe("calcMoney", () => {
  it("calcula IVA y total sobre el subtotal neto", () => {
    const r = calcMoney(1000);
    expect(r.iva).toBeCloseTo(160, 10);
    expect(r.total).toBeCloseTo(1160, 10);
    expect(r.descuento).toBe(0);
  });

  it("aplica el descuento antes del IVA", () => {
    const r = calcMoney(1000, 100);
    expect(r.iva).toBeCloseTo(144, 10);
    expect(r.total).toBeCloseTo(1044, 10);
  });

  it("nunca devuelve un total negativo", () => {
    const r = calcMoney(100, 500);
    expect(r.total).toBe(0);
  });
});

describe("round2", () => {
  it("redondea a 2 decimales", () => {
    expect(round2(123.456)).toBe(123.46);
    expect(round2(10)).toBe(10);
  });
});
