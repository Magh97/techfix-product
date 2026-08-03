import { Router } from "express";
import { ok } from "../../shared/http";
import { getValidated, validate } from "../../shared/validation";
import { loginSchema, refreshSchema } from "./auth.schema";
import * as service from "./auth.service";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), async (req, res) => {
  const { usuario, password } = getValidated<{ usuario: string; password: string }>(req, "body");
  ok(res, await service.login(usuario, password));
});

authRouter.post("/refresh", validate(refreshSchema), async (req, res) => {
  const { refreshToken } = getValidated<{ refreshToken: string }>(req, "body");
  ok(res, await service.refresh(refreshToken));
});
