import bcrypt from "bcryptjs";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { pool } from "../shared/db";

// Solo corre con RUN_DB_TESTS=true y una base migrada + seed (ver CI)
const runDb = !!process.env.RUN_DB_TESTS;

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe.skipIf(!runDb)("integración API (DB real)", () => {
  let app: Express;
  let token = "";
  let tecnicoToken = "";
  let clienteId = 0;

  beforeAll(async () => {
    app = createApp();

    const admin = await request(app).post("/api/v1/auth/login").send({ usuario: "admin", password: "admin1234" });
    token = admin.body.data.token;

    // Técnico de prueba (rol tecnico) — se crea idempotente
    const hash = await bcrypt.hash("tecnico1234", 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES ('Técnico Test', 'tecnico', $1, 'tecnico')
       ON CONFLICT (usuario) DO NOTHING`,
      [hash]
    );
    const tecnico = await request(app).post("/api/v1/auth/login").send({ usuario: "tecnico", password: "tecnico1234" });
    tecnicoToken = tecnico.body.data.token;

    const c = await pool.query<{ id: number }>(
      `INSERT INTO clientes (nombre, telefono) VALUES ('Cliente Test', '5511223344') RETURNING id`
    );
    clienteId = c.rows[0]!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("health responde ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("login con credenciales válidas", async () => {
    expect(token).toBeTruthy();
  });

  it("login con credenciales inválidas", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ usuario: "admin", password: "incorrecta" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("lista productos con token", async () => {
    const res = await request(app).get("/api/v1/productos").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("rechaza sin token", async () => {
    const res = await request(app).get("/api/v1/productos");
    expect(res.status).toBe(401);
  });

  it("crea un producto como admin", async () => {
    const sku = `TEST-${Date.now()}`;
    const res = await request(app)
      .post("/api/v1/productos")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoriaId: 1, sku, nombre: "Producto de prueba", precioCompra: 10, precioVenta: 20 });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe(sku);
  });

  it("ciclo completo de orden de servicio (crear → cotizar → reservar → reparar → entregar)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };

    // Producto con stock 5
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `ORD-${Date.now()}`, nombre: "Refacción ciclo", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    const folioProducto = prod.body.data.sku;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);

    // 1. Crear orden (admin)
    const creada = await request(app)
      .post("/api/v1/ordenes")
      .set(auth)
      .send({
        clienteId,
        tipoEquipo: "laptop",
        marca: "Lenovo",
        modelo: "T470",
        fallaReportada: "No enciende",
        fechaPrometida: todayPlus(2),
      });
    expect(creada.status).toBe(201);
    const ordenId = creada.body.data.id;
    expect(creada.body.data.estado).toBe("pendiente");

    // 2. Técnico inicia diagnóstico
    const diag = await request(app)
      .patch(`/api/v1/ordenes/${ordenId}/estado`)
      .set(authT)
      .send({ nuevoEstado: "en_diagnostico" });
    expect(diag.status).toBe(200);
    expect(diag.body.data.estado).toBe("en_diagnostico");

    await request(app).post(`/api/v1/ordenes/${ordenId}/diagnostico`).set(authT).send({ diagnostico: "Falla en fuente de poder" });

    // 3. Cotización (2 piezas del producto)
    const cot = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/cotizaciones`)
      .set(authT)
      .send({ lineas: [{ tipoLinea: "refaccion", productoId, cantidad: 2 }, { tipoLinea: "mano_obra", horas: 1, tarifaHora: 380 }] });
    expect(cot.status).toBe(201);
    const cotizacionId = cot.body.data.id;
    expect(cot.body.data.total).toBeGreaterThan(0);

    // 4. Aprobar → reserva stock (5 → 3)
    const aprobada = await request(app).post(`/api/v1/ordenes/${ordenId}/cotizaciones/${cotizacionId}/aprobar`).set(auth);
    expect(aprobada.status).toBe(200);
    const stockDespuesReserva = await pool.query<{ stock: number }>(
      "SELECT stock FROM productos WHERE id = $1",
      [productoId]
    );
    expect(Number(stockDespuesReserva.rows[0]?.stock)).toBe(3);

    // 5. Reparación
    const repara = await request(app)
      .patch(`/api/v1/ordenes/${ordenId}/estado`)
      .set(authT)
      .send({ nuevoEstado: "en_reparacion" });
    expect(repara.status).toBe(200);

    await request(app)
      .post(`/api/v1/ordenes/${ordenId}/consumo`)
      .set(authT)
      .send({ piezas: [{ productoId, cantidad: 2 }] });

    // 6. Listo (técnico)
    const listo = await request(app).patch(`/api/v1/ordenes/${ordenId}/estado`).set(authT).send({ nuevoEstado: "listo" });
    expect(listo.status).toBe(200);

    // 7. Entregar (admin) → venta + garantía + estado entregado
    const entregada = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/entregar`)
      .set(auth)
      .send({ firma: "data:image/png;base64,AAA", metodoPago: "efectivo" });
    expect(entregada.status).toBe(200);
    expect(entregada.body.data.orden.estado).toBe("entregado");
    expect(entregada.body.data.ventaFolio).toMatch(/^VEN-/);

    const garantia = await pool.query<{ id: number }>(
      "SELECT id FROM garantias WHERE orden_id = $1",
      [ordenId]
    );
    expect(garantia.rowCount).toBe(1);

    const venta = await pool.query<{ total: string }>(
      "SELECT total FROM ventas WHERE orden_id = $1",
      [ordenId]
    );
    expect(Number(venta.rows[0]?.total)).toBeGreaterThan(0);

    // Stock se mantiene en 3 (reservado→consumido, sin doble descuento)
    const stockFinal = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stockFinal.rows[0]?.stock)).toBe(3);
    expect(folioProducto).toBeTruthy();
  });

  it("cancelar una orden libera las reservas de inventario", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };

    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `CAN-${Date.now()}`, nombre: "Refacción cancelar", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 1 WHERE id = $1", [productoId]);

    const creada = await request(app)
      .post("/api/v1/ordenes")
      .set(auth)
      .send({ clienteId, tipoEquipo: "desktop", fallaReportada: "Reinicia solo", fechaPrometida: todayPlus(2) });
    const ordenId = creada.body.data.id;

    await request(app).patch(`/api/v1/ordenes/${ordenId}/estado`).set(authT).send({ nuevoEstado: "en_diagnostico" });
    const cot = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/cotizaciones`)
      .set(authT)
      .send({ lineas: [{ tipoLinea: "refaccion", productoId, cantidad: 1 }] });
    const cotizacionId = cot.body.data.id;
    await request(app).post(`/api/v1/ordenes/${ordenId}/cotizaciones/${cotizacionId}/aprobar`).set(auth);

    const stockReservado = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stockReservado.rows[0]?.stock)).toBe(0);

    const cancelada = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/cancelar`)
      .set(auth)
      .send({ motivo: "Cliente no autorizó la reparación" });
    expect(cancelada.status).toBe(200);
    expect(cancelada.body.data.estado).toBe("cancelado");

    const stockLiberado = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stockLiberado.rows[0]?.stock)).toBe(1);
  });
});
