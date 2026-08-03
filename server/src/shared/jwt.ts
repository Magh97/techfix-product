import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errors";

export interface AccessPayload {
  sub: number;
  usuario: string;
  rol: string;
}

export interface RefreshPayload {
  sub: number;
  tipo: "refresh";
}

export function signAccess(payload: AccessPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function signRefresh(payload: RefreshPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyAccess(token: string): AccessPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    return { sub: Number(decoded.sub), usuario: String(decoded.usuario), rol: String(decoded.rol) };
  } catch {
    throw AppError.unauthorized("Token inválido o expirado");
  }
}

export function verifyRefresh(token: string): RefreshPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    if (decoded.tipo !== "refresh") throw new Error("bad token type");
    return { sub: Number(decoded.sub), tipo: "refresh" };
  } catch {
    throw AppError.unauthorized("Refresh token inválido o expirado");
  }
}
