import { describe, expect, it } from "vitest";
import { signAccess, signRefresh, verifyAccess, verifyRefresh } from "./jwt";

describe("jwt", () => {
  it("firma y verifica un access token", () => {
    const token = signAccess({ sub: 1, usuario: "admin", rol: "admin" });
    const payload = verifyAccess(token);
    expect(payload.sub).toBe(1);
    expect(payload.usuario).toBe("admin");
    expect(payload.rol).toBe("admin");
  });

  it("firma y verifica un refresh token", () => {
    const token = signRefresh({ sub: 7, tipo: "refresh", jti: "test-jti" });
    const payload = verifyRefresh(token);
    expect(payload.sub).toBe(7);
    expect(payload.tipo).toBe("refresh");
    expect(payload.jti).toBe("test-jti");
  });
});
