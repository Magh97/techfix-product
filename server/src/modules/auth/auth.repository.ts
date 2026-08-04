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

export interface RefreshTokenRow {
  id: number;
  usuario_id: number;
  token_hash: string;
  expires_at: string;
  revoked: boolean;
}

export function insertRefreshToken(input: { usuarioId: number; jti: string; tokenHash: string; expiresAt: Date }) {
  return query(
    "INSERT INTO refresh_tokens (usuario_id, jti, token_hash, expires_at) VALUES ($1,$2,$3,$4)",
    [input.usuarioId, input.jti, input.tokenHash, input.expiresAt]
  );
}

export function findRefreshTokenByJti(jti: string) {
  return query<RefreshTokenRow>(
    "SELECT id, usuario_id, token_hash, expires_at, revoked FROM refresh_tokens WHERE jti = $1",
    [jti]
  ).then((r) => r.rows[0]);
}

export function revokeRefreshToken(id: number) {
  return query("UPDATE refresh_tokens SET revoked = true WHERE id = $1", [id]);
}

export function revokeRefreshTokensByUser(usuarioId: number) {
  return query("UPDATE refresh_tokens SET revoked = true WHERE usuario_id = $1 AND revoked = false", [usuarioId]);
}
