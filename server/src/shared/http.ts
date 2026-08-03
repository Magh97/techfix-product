import type { Response } from "express";

export function ok<T>(res: Response, data: T) {
  return res.json({ data });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function paginated<T>(res: Response, data: T[], meta: PaginationMeta) {
  return res.json({ data, meta });
}
