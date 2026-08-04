import { query } from "./db";

export interface BusinessConfig {
  ivaRate: number;
  limiteCreditoDefault: number;
  plazoCreditoDefault: number;
  descuentoVendedorMax: number;
  diasDevolucion: number;
  diasGarantiaServicio: number;
  toleranciaRetrasoDias: number;
}

const DEFAULTS: BusinessConfig = {
  ivaRate: 0.16,
  limiteCreditoDefault: 3000,
  plazoCreditoDefault: 15,
  descuentoVendedorMax: 0.1,
  diasDevolucion: 15,
  diasGarantiaServicio: 30,
  toleranciaRetrasoDias: 1,
};

export const CONFIG_KEYS: Record<string, keyof BusinessConfig> = {
  "iva.rate": "ivaRate",
  "credito.limite_default": "limiteCreditoDefault",
  "credito.plazo_default": "plazoCreditoDefault",
  "ventas.descuento_vendedor_max": "descuentoVendedorMax",
  "ventas.dias_devolucion": "diasDevolucion",
  "servicios.dias_garantia": "diasGarantiaServicio",
  "ordenes.tolerancia_retraso_dias": "toleranciaRetrasoDias",
};

function extraer(clave: string, valor: unknown): number | null {
  const v = valor as Record<string, unknown> | null;
  if (!v || typeof v !== "object") return null;
  const n = clave === "iva.rate" ? (v.rate ?? v.value) : v.value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export async function getConfig(): Promise<BusinessConfig> {
  const cfg: BusinessConfig = { ...DEFAULTS };
  try {
    const r = await query<{ clave: string; valor: unknown }>("SELECT clave, valor FROM configuracion");
    for (const row of r.rows) {
      const key = CONFIG_KEYS[row.clave];
      if (!key) continue;
      const n = extraer(row.clave, row.valor);
      if (n !== null) (cfg as unknown as Record<string, unknown>)[key] = n;
    }
  } catch {
    // ante cualquier fallo de BD se usan los defaults
  }
  return cfg;
}

export async function getIvaRate(): Promise<number> {
  return (await getConfig()).ivaRate;
}
