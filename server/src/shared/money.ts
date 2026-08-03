export interface MoneyResult {
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
}

const IVA_RATE = 0.16;

export function calcMoney(subtotal: number, descuento = 0): MoneyResult {
  const net = Math.max(0, subtotal - descuento);
  const iva = net * IVA_RATE;
  return { subtotal, descuento, iva, total: net + iva };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
