import bcrypt from "bcryptjs";
import { AppError } from "../../shared/errors";
import { signAccess, signRefresh, verifyRefresh } from "../../shared/jwt";
import * as repo from "./auth.repository";

export async function login(usuario: string, password: string) {
  const user = await repo.findByUsuario(usuario);
  if (!user) throw AppError.business("UNAUTHORIZED", "Credenciales inválidas");
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw AppError.business("UNAUTHORIZED", "Credenciales inválidas");
  const token = signAccess({ sub: user.id, usuario: user.usuario, rol: user.rol });
  const refreshToken = signRefresh({ sub: user.id, tipo: "refresh" });
  return {
    token,
    refreshToken,
    usuario: { id: user.id, nombre: user.nombre, rol: user.rol },
  };
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefresh(refreshToken);
  const user = await repo.findById(payload.sub);
  if (!user) throw AppError.unauthorized();
  return {
    token: signAccess({ sub: user.id, usuario: user.usuario, rol: user.rol }),
    refreshToken: signRefresh({ sub: user.id, tipo: "refresh" }),
  };
}
