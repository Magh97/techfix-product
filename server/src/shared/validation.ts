import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "./errors";

type Source = "body" | "query" | "params";

const store = new WeakMap<Request, Partial<Record<Source, unknown>>>();

export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join("."), reason: i.message }));
      throw AppError.badRequest("VALIDATION_ERROR", "Datos inválidos", details);
    }
    const map = store.get(req) ?? {};
    map[source] = result.data;
    store.set(req, map);
    next();
  };
}

export function getValidated<T>(req: Request, source: Source): T {
  return (store.get(req)?.[source] ?? {}) as T;
}
