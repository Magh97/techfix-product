import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "../shared/db";

export interface BootstrapAdminResult {
  created: boolean;
  usuario: string;
  password?: string;
}

// Crea el admin de arranque en producción (SEED_DEMO=false). Idempotente:
// con ON CONFLICT DO NOTHING nunca sobreescribe un admin existente; la
// contraseña generada solo se expone en el primer arranque (logs del operador).
export async function bootstrapAdmin(usuario = "admin", nombre = "Administrador"): Promise<BootstrapAdminResult> {
  const password = crypto.randomBytes(6).toString("base64url");
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    `INSERT INTO usuarios (nombre, usuario, password_hash, rol)
     VALUES ($1,$2,$3,'admin')
     ON CONFLICT (usuario) DO NOTHING`,
    [nombre, usuario, hash]
  );
  const created = (res.rowCount ?? 0) > 0;
  return { created, usuario, ...(created ? { password } : {}) };
}
