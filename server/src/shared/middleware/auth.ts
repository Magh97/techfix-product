import type { NextFunction, Response } from "express";
import type { Request } from "express";
import { AppError } from "../errors";
import { verifyAccess } from "../jwt";

export type Rol = "admin" | "vendedor" | "tecnico";

export interface AuthedRequest extends Request {
  user?: { id: number; usuario: string; rol: Rol };
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw AppError.unauthorized();
  const token = header.slice(7);
  const payload = verifyAccess(token);
  req.user = { id: payload.sub, usuario: payload.usuario, rol: payload.rol as Rol };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.rol)) throw AppError.forbidden();
    next();
  };
}
