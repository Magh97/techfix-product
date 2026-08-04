import { query } from "../../shared/db";

export interface UserRow {
  id: number;
  nombre: string;
  usuario: string;
  rol: "admin" | "vendedor" | "tecnico";
  password_hash: string;
}

export function findByUsuario(usuario: string) {
  return query<UserRow>(
    "SELECT id, nombre, usuario, rol, password_hash FROM usuarios WHERE usuario = $1 AND is_active = true",
    [usuario]
  ).then((r) => r.rows[0]);
}

export function findById(id: number) {
  return query<UserRow>("SELECT id, nombre, usuario, rol, password_hash FROM usuarios WHERE id = $1 AND is_active = true", [id]).then(
    (r) => r.rows[0]
  );
}
