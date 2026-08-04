import { Router } from "express";
import { z } from "zod";
import { ok } from "../../shared/http";
import { query } from "../../shared/db";
import { requireAuth, requireRole } from "../../shared/middleware/auth";
import { getValidated, validate } from "../../shared/validation";

export const usuariosRouter = Router();

const listQuerySchema = z.object({
  rol: z.enum(["admin", "vendedor", "tecnico"]).optional(),
});

usuariosRouter.use(requireAuth, requireRole("admin"));

usuariosRouter.get("/", validate(listQuerySchema, "query"), async (req, res) => {
  const { rol } = getValidated<{ rol?: string }>(req, "query");
  const params: unknown[] = [];
  const where: string[] = ["is_active = true"];
  if (rol) {
    params.push(rol);
    where.push(`rol = $${params.length}`);
  }
  const r = await query<{ id: number; nombre: string; usuario: string; rol: string }>(
    `SELECT id, nombre, usuario, rol FROM usuarios WHERE ${where.join(" AND ")} ORDER BY nombre`,
    params
  );
  ok(res, r.rows);
});
