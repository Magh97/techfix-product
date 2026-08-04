import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors";
import { signAccess, signRefresh, verifyRefresh } from "../../shared/jwt";
import * as repo from "./auth.repository";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días (env.JWT_REFRESH_TTL)

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function ttlToSeconds(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 900;
  const n = Number(m[1]);
  const unit = m[2];
  const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (unit ? (mult[unit] ?? 60) : 60);
}

const ACCESS_EXPIRES_IN = ttlToSeconds(env.JWT_ACCESS_TTL);

async function emitirRefresh(usuarioId: number): Promise<string> {
  const jti = randomUUID();
  const refreshToken = signRefresh({ sub: usuarioId, tipo: "refresh", jti });
  await repo.insertRefreshToken({
    usuarioId,
    jti,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return refreshToken;
}

export async function login(usuario: string, password: string) {
  const user = await repo.findByUsuario(usuario);
  if (!user) throw AppError.business("UNAUTHORIZED", "Credenciales inválidas");
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw AppError.business("UNAUTHORIZED", "Credenciales inválidas");
  const token = signAccess({ sub: user.id, usuario: user.usuario, rol: user.rol });
  const refreshToken = await emitirRefresh(user.id);
  return {
    token,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_IN,
    usuario: { id: user.id, nombre: user.nombre, rol: user.rol },
  };
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefresh(refreshToken);
  const stored = await repo.findRefreshTokenByJti(payload.jti);
  if (!stored) throw AppError.unauthorized();

  // Detección de reuso: un token ya rotado indica posible robo → revoca la familia
  if (stored.revoked) {
    await repo.revokeRefreshTokensByUser(stored.usuario_id);
    throw AppError.unauthorized("Refresh token reutilizado");
  }
  if (new Date(stored.expires_at).getTime() < Date.now()) {
    throw AppError.unauthorized("Refresh token expirado");
  }

  const user = await repo.findById(payload.sub);
  if (!user) throw AppError.unauthorized();

  await repo.revokeRefreshToken(stored.id);
  const nuevo = await emitirRefresh(user.id);
  return {
    token: signAccess({ sub: user.id, usuario: user.usuario, rol: user.rol }),
    refreshToken: nuevo,
    expiresIn: ACCESS_EXPIRES_IN,
  };
}

export async function logout(refreshToken: string) {
  try {
    const payload = verifyRefresh(refreshToken);
    const stored = await repo.findRefreshTokenByJti(payload.jti);
    if (stored && !stored.revoked) await repo.revokeRefreshToken(stored.id);
  } catch {
    // logout idempotente: no falla si el token ya no es válido
  }
  return { ok: true };
}