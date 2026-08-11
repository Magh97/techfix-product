import { afterAll, describe, expect, it } from "vitest";
import { pool } from "../shared/db";
import { bootstrapAdmin } from "./bootstrapAdmin";

const runDb = !!process.env.RUN_DB_TESTS;
const USUARIO = `boot_${Date.now()}`;

describe.skipIf(!runDb)("bootstrapAdmin (DB real)", () => {
  afterAll(async () => {
    await pool.query("DELETE FROM usuarios WHERE usuario = $1", [USUARIO]);
    await pool.end();
  });

  it("crea el primer admin y devuelve la contraseña solo la primera vez", async () => {
    const primero = await bootstrapAdmin(USUARIO, "Bootstrap Test");
    expect(primero.created).toBe(true);
    expect(primero.usuario).toBe(USUARIO);
    expect(primero.password).toBeTruthy();

    const row = await pool.query<{ rol: string; password_hash: string }>(
      "SELECT rol, password_hash FROM usuarios WHERE usuario = $1",
      [USUARIO]
    );
    expect(row.rows[0]?.rol).toBe("admin");
    const hashAntes = row.rows[0]?.password_hash;

    // Segundo run: no sobreescribe y no expone contraseña
    const segundo = await bootstrapAdmin(USUARIO, "Bootstrap Test");
    expect(segundo.created).toBe(false);
    expect(segundo.password).toBeUndefined();

    const row2 = await pool.query<{ password_hash: string }>("SELECT password_hash FROM usuarios WHERE usuario = $1", [USUARIO]);
    expect(row2.rows[0]?.password_hash).toBe(hashAntes);
  });
});
