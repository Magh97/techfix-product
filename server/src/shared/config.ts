import { query } from "./db";

export async function getIvaRate(): Promise<number> {
  try {
    const r = await query<{ valor: { rate?: number } }>("SELECT valor FROM configuracion WHERE clave = 'iva'");
    const rate = r.rows[0]?.valor?.rate;
    return typeof rate === "number" && rate > 0 ? rate : 0.16;
  } catch {
    return 0.16;
  }
}
