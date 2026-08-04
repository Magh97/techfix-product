import { query } from "../../shared/db";

export function upsertConfig(clave: string, valor: unknown) {
  return query(
    `INSERT INTO configuracion (clave, valor) VALUES ($1,$2::jsonb)
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`,
    [clave, JSON.stringify(valor)]
  );
}
