export interface MoneyResult {
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
}

export function calcMoney(subtotal: number, descuento = 0, ivaRate = 0.16): MoneyResult {
  const net = Math.max(0, subtotal - descuento);
  const iva = net * ivaRate;
  return { subtotal, descuento, iva, total: net + iva };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
