import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly details?: unknown[]
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(code: string, message: string, details?: unknown[]) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = "No autorizado") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "Sin permisos") {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(code = "NOT_FOUND", message = "Recurso no encontrado") {
    return new AppError(message, 404, code);
  }

  static conflict(code: string, message: string) {
    return new AppError(message, 409, code);
  }

  static business(code: string, message: string, details?: unknown[]) {
    return new AppError(message, 422, code, details);
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Ruta no encontrada", 404, "NOT_FOUND"));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(e);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } });
}
