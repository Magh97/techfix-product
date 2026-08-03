import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { pool } from "../shared/db";

// Solo corre con RUN_DB_TESTS=true y una base migrada + seed (ver CI)
const runDb = !!process.env.RUN_DB_TESTS;

describe.skipIf(!runDb)("integración API (DB real)", () => {
  let token = "";
  let usuarioRol = "";

  beforeAll(async () => {
    const res = await request(createApp()).post("/api/v1/auth/login").send({ usuario: "admin", password: "admin1234" });
    token = res.body.data.token;
    usuarioRol = res.body.data.usuario.rol;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("health responde ok", async () => {
    const res = await request(createApp()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("login con credenciales válidas", async () => {
    expect(token).toBeTruthy();
    expect(usuarioRol).toBe("admin");
  });

  it("login con credenciales inválidas", async () => {
    const res = await request(createApp()).post("/api/v1/auth/login").send({ usuario: "admin", password: "incorrecta" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("lista productos con token", async () => {
    const res = await request(createApp()).get("/api/v1/productos").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.meta.totalPages).toBe("number");
  });

  it("rechaza sin token", async () => {
    const res = await request(createApp()).get("/api/v1/productos");
    expect(res.status).toBe(401);
  });

  it("crea un producto como admin", async () => {
    const sku = `TEST-${Date.now()}`;
    const res = await request(createApp())
      .post("/api/v1/productos")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoriaId: 1, sku, nombre: "Producto de prueba", precioCompra: 10, precioVenta: 20 });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe(sku);
  });
});
