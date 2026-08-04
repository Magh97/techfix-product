import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { pool } from "../shared/db";
import { marcarRetrasadas } from "./services/ordenes.service";

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
  let vendedorToken = "";
  let tecnicoToken = "";
  let clienteId = 0;

  beforeAll(async () => {
    app = createApp();

    const admin = await request(app).post("/api/v1/auth/login").send({ usuario: "admin", password: "admin1234" });
    token = admin.body.data.token;

    const vendedor = await request(app).post("/api/v1/auth/login").send({ usuario: "vendedor", password: "vendedor1234" });
    vendedorToken = vendedor.body.data.token;

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

  it("notificaciones: valida estado, envía por correo y registra fallo sin contacto", async () => {
    const auth = { Authorization: `Bearer ${token}` };

    const cli = await pool.query<{ id: number }>(
      `INSERT INTO clientes (nombre, telefono, correo) VALUES ('Cliente Correo', '5522001199', 'cliente@correo.test') RETURNING id`
    );
    const cCorreo = cli.rows[0]!.id;

    const creada = await request(app)
      .post("/api/v1/ordenes")
      .set(auth)
      .send({ clienteId: cCorreo, tipoEquipo: "laptop", fallaReportada: "Batería", fechaPrometida: todayPlus(2) });
    const ordenId = creada.body.data.id;

    // Notificar "listo" sobre una orden que no está en listo → 422
    const rechazo = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/notificar`)
      .set(auth)
      .send({ tipo: "listo" });
    expect(rechazo.status).toBe(422);
    expect(rechazo.body.error.code).toBe("ORDER_NOT_READY");

    // Poner la orden en listo (directo en BD para aislar el flujo de notificación)
    await pool.query("UPDATE ordenes_servicio SET estado = 'listo' WHERE id = $1", [ordenId]);

    // Envío por correo (simulado: sin SMTP en tests)
    const envio = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/notificar`)
      .set(auth)
      .send({ tipo: "listo", canal: "correo" });
    expect(envio.status).toBe(200);
    expect(envio.body.data.enviado).toBe(true);
    expect(envio.body.data.simulated).toBe(true);

    const row = await pool.query<{ estado: string; tipo: string; canal: string }>(
      "SELECT estado, tipo, canal FROM notificaciones WHERE orden_id = $1 ORDER BY id DESC LIMIT 1",
      [ordenId]
    );
    expect(row.rows[0]?.estado).toBe("enviado");
    expect(row.rows[0]?.tipo).toBe("NOT-02");
    expect(row.rows[0]?.canal).toBe("correo");

    // Cliente sin correo → se registra fallido y no lanza error
    const sinCorreo = await request(app)
      .post("/api/v1/ordenes")
      .set(auth)
      .send({ clienteId, tipoEquipo: "desktop", fallaReportada: "Pantalla", fechaPrometida: todayPlus(2) });
    const ordenSinCorreo = sinCorreo.body.data.id;
    await pool.query("UPDATE ordenes_servicio SET estado = 'listo' WHERE id = $1", [ordenSinCorreo]);

    const resSinCorreo = await request(app)
      .post(`/api/v1/ordenes/${ordenSinCorreo}/notificar`)
      .set(auth)
      .send({ tipo: "listo" });
    expect(resSinCorreo.status).toBe(200);
    expect(resSinCorreo.body.data.enviado).toBe(false);
    expect(resSinCorreo.body.data.motivo).toBe("SIN_CORREO");

    const fallida = await pool.query<{ estado: string; error: string }>(
      "SELECT estado, error FROM notificaciones WHERE orden_id = $1 ORDER BY id DESC LIMIT 1",
      [ordenSinCorreo]
    );
    expect(fallida.rows[0]?.estado).toBe("fallido");
    expect(fallida.rows[0]?.error).toBe("cliente sin correo");
  });

  it("worker: marca como retrasada una orden con fecha prometida vencida", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const creada = await request(app)
      .post("/api/v1/ordenes")
      .set(auth)
      .send({ clienteId, tipoEquipo: "laptop", fallaReportada: "Ruido en ventilador", fechaPrometida: todayPlus(-3) });
    const ordenId = creada.body.data.id;

    const n = await marcarRetrasadas();
    expect(n).toBeGreaterThan(0);

    const row = await pool.query<{ retrasada: boolean }>(
      "SELECT retrasada FROM ordenes_servicio WHERE id = $1",
      [ordenId]
    );
    expect(row.rows[0]?.retrasada).toBe(true);
  });

  it("reportes: inventario, ventas, servicios y exportación (solo admin)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const vendedorAuth = { Authorization: `Bearer ${vendedorToken}` };

    // No-admin → 403
    const forbidden = await request(app).get("/api/v1/reports/inventario").set(vendedorAuth);
    expect(forbidden.status).toBe(403);

    // Crear una venta para que exista data
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `REP-${Date.now()}`, nombre: "Prod reporte", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);
    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        lineas: [{ tipo: "producto", productoId, cantidad: 1 }],
        tipoPago: "contado",
        metodoPago: "efectivo",
        montoRecibido: 10,
      });
    expect(venta.status).toBe(201);

    const inv = await request(app).get("/api/v1/reports/inventario").set(auth);
    expect(inv.status).toBe(200);
    expect(inv.body.data.resumen.totalArticulos).toBeGreaterThan(0);

    const ven = await request(app).get("/api/v1/reports/ventas?agrupar=dia").set(auth);
    expect(ven.status).toBe(200);
    expect(Array.isArray(ven.body.data.data)).toBe(true);
    expect(ven.body.data.resumen.totalImporte).toBeGreaterThan(0);

    const ser = await request(app).get("/api/v1/reports/servicios").set(auth);
    expect(ser.status).toBe(200);
    expect(ser.body.data.resumen).toHaveProperty("total");

    // Export CSV
    const csv = await request(app).get("/api/v1/reports/inventario/export?formato=csv").set(auth);
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain("SKU");

    // Export XLSX
    const xlsx = await request(app).get("/api/v1/reports/ventas/export?formato=xlsx").set(auth);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers["content-type"]).toContain("spreadsheetml");
  });

  it("importación de productos: plantilla y archivo CSV con duplicados y errores (solo admin)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const vendedorAuth = { Authorization: `Bearer ${vendedorToken}` };

    // Solo admin
    const forbidden = await request(app)
      .post("/api/v1/productos/importar")
      .set(vendedorAuth)
      .attach("archivo", Buffer.from("x"), "x.csv");
    expect(forbidden.status).toBe(403);

    // Plantilla descargable
    const plantilla = await request(app).get("/api/v1/productos/plantilla?formato=csv").set(auth);
    expect(plantilla.status).toBe(200);
    expect(plantilla.headers["content-type"]).toContain("text/csv");

    const sku = `IMP-${Date.now()}`;
    const sufijo = String(Date.now()).slice(-9);
    const codigo = `75${sufijo}1`;
    const codigoSinSku = `75${sufijo}2`;
    const codigoStockNeg = `75${sufijo}3`;
    const codigoXlsx = `75${sufijo}4`;
    const csv = [
      "SKU,CodigoBarras,Nombre,Marca,Modelo,CategoriaId,PrecioCompra,PrecioVenta,StockMinimo,Stock",
      `${sku},${codigo},Producto importado,MarcaX,M1,1,10,20,2,5`,
      `${sku},${codigo},Duplicado,MarcaX,M1,1,10,20,2,5`,
      `,${codigoSinSku},Sin sku,MarcaX,M1,1,10,20,2,5`,
      `IMP-ERR-${Date.now()},${codigoStockNeg},Stock negativo,MarcaX,M1,1,-5,20,2,5`,
    ].join("\n");

    const res = await request(app)
      .post("/api/v1/productos/importar")
      .set(auth)
      .attach("archivo", Buffer.from(csv), { filename: "productos.csv", contentType: "text/csv" });
    expect(res.status).toBe(200);
    expect(res.body.data.importados).toBe(1);
    expect(res.body.data.omitidos.some((o: { sku: string }) => o.sku === sku)).toBe(true);
    expect(res.body.data.errores.length).toBe(2);

    // El producto importado quedó con el stock inicial indicado
    const creado = await request(app).get(`/api/v1/productos/por-codigo/${codigo}`).set(auth);
    expect(creado.status).toBe(200);
    expect(creado.body.data.stock).toBe(5);

    // Importación desde XLSX real
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Productos");
    ws.addRow(["SKU", "CodigoBarras", "Nombre", "Marca", "Modelo", "CategoriaId", "PrecioCompra", "PrecioVenta", "StockMinimo", "Stock"]);
    const skuXlsx = `IMPX-${Date.now()}`;
    ws.addRow([skuXlsx, codigoXlsx, "Producto xlsx", "MarcaX", "M2", "1", "10", "20", "2", "3"]);
    const xlsxBuffer = Buffer.from(await wb.xlsx.writeBuffer());
    const resX = await request(app)
      .post("/api/v1/productos/importar")
      .set(auth)
      .attach("archivo", xlsxBuffer, {
        filename: "productos.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    expect(resX.status).toBe(200);
    expect(resX.body.data.importados).toBe(1);
  });

  it("BOM: define kit, recalcula precio, desglosa en la venta y restaura stock al cancelar", async () => {
    const auth = { Authorization: `Bearer ${token}` };

    const crearProd = async (sku: string, nombre: string, pc: number, pv: number) => {
      const r = await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku, nombre, precioCompra: pc, precioVenta: pv });
      return r.body.data.id;
    };

    const kitId = await crearProd(`KIT-${Date.now()}`, "Kit test", 0, 0);
    const compA = await crearProd(`CA-${Date.now()}`, "Comp A", 50, 100);
    const compB = await crearProd(`CB-${Date.now()}`, "Comp B", 100, 200);
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [compA]);
    await pool.query("UPDATE productos SET stock = 3 WHERE id = $1", [compB]);

    // Validaciones antes de definir
    const selfRef = await request(app)
      .put(`/api/v1/productos/${kitId}/bom`)
      .set(auth)
      .send({ componentes: [{ productoId: kitId, cantidad: 1 }] });
    expect(selfRef.status).toBe(400);

    const missing = await request(app)
      .put(`/api/v1/productos/${kitId}/bom`)
      .set(auth)
      .send({ componentes: [{ productoId: 999999, cantidad: 1 }] });
    expect(missing.status).toBe(404);

    // Definir BOM: 1×compA + 2×compB + 50 de mano de obra
    const definido = await request(app)
      .put(`/api/v1/productos/${kitId}/bom`)
      .set(auth)
      .send({
        componentes: [
          { productoId: compA, cantidad: 1 },
          { productoId: compB, cantidad: 2 },
        ],
        manoObra: 50,
      });
    expect(definido.status).toBe(200);
    expect(definido.body.data.componentes.length).toBe(2);
    // costo = 50 + 100*2 = 250 · venta = 100 + 200*2 + 50 = 550
    expect(definido.body.data.precioCompra).toBe(250);
    expect(definido.body.data.precioVenta).toBe(550);
    expect(definido.body.data.manoObra).toBe(50);

    // Kit anidado rechazado
    const nested = await request(app)
      .put(`/api/v1/productos/${compA}/bom`)
      .set(auth)
      .send({ componentes: [{ productoId: kitId, cantidad: 1 }] });
    expect(nested.status).toBe(400);

    // Venta del kit
    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        lineas: [{ tipo: "producto", productoId: kitId, cantidad: 1 }],
        tipoPago: "contado",
        metodoPago: "efectivo",
        montoRecibido: 1000,
      });
    expect(venta.status).toBe(201);
    expect(venta.body.data.lineas.length).toBe(3);
    expect(venta.body.data.subtotal).toBe(550);
    expect(venta.body.data.total).toBe(638); // 550 + IVA 88

    // Stocks de componentes decrementados: A 5→4, B 3→1
    const stockA = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [compA]);
    const stockB = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [compB]);
    expect(Number(stockA.rows[0]?.stock)).toBe(4);
    expect(Number(stockB.rows[0]?.stock)).toBe(1);

    // Movimientos de salida por componente
    const movs = await pool.query<{ tipo: string }>(
      "SELECT tipo FROM movimientos_inventario WHERE producto_id = ANY($1) AND tipo = 'SALIDA_VENTA' ORDER BY producto_id",
      [[compA, compB]]
    );
    expect(movs.rowCount).toBe(2);

    // Stock insuficiente en un componente → 422
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [compB]);
    const sinStock = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId: kitId, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(sinStock.status).toBe(422);
    expect(sinStock.body.error.code).toBe("INSUFFICIENT_STOCK");

    // Cancelación restaura stock de componentes
    const cancelada = await request(app).post(`/api/v1/ventas/${venta.body.data.id}/cancelar`).set(auth).send({ motivo: "Test BOM" });
    expect(cancelada.status).toBe(200);
    const stockA2 = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [compA]);
    const stockB2 = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [compB]);
    expect(Number(stockA2.rows[0]?.stock)).toBe(5);
    expect(Number(stockB2.rows[0]?.stock)).toBe(2); // estaba en 0 → se restauran las 2 del kit
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

  it("POS: venta de contado descuenta stock y asigna la caja", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post("/api/v1/caja/abrir").set(auth);

    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `POS-${Date.now()}`, nombre: "Prod POS", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 2 }], tipoPago: "contado", metodoPago: "efectivo", montoRecibido: 50 });
    expect(venta.status).toBe(201);
    expect(venta.body.data.folio).toMatch(/^VEN-/);

    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stock.rows[0]?.stock)).toBe(3);
    const caja = await pool.query<{ caja_id: number | null }>("SELECT caja_id FROM ventas WHERE id = $1", [venta.body.data.id]);
    expect(caja.rows[0]?.caja_id).toBeTruthy();
  });

  it("POS: venta a crédito respeta el límite del cliente", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const c = await pool.query<{ id: number }>(
      "INSERT INTO clientes (nombre, telefono, limite_credito) VALUES ('Credit Test', '5599887766', 500) RETURNING id"
    );
    const clienteId = c.rows[0]!.id;
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `CRED-${Date.now()}`, nombre: "Prod crédito", precioCompra: 5, precioVenta: 100 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 100 WHERE id = $1", [productoId]);

    const okVenta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ clienteId, lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "credito" });
    expect(okVenta.status).toBe(201);
    expect(okVenta.body.data.fechaVencimiento).toBeTruthy();

    const over = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ clienteId, lineas: [{ tipo: "producto", productoId, cantidad: 5 }], tipoPago: "credito" });
    expect(over.status).toBe(422);
    expect(over.body.error.code).toBe("CREDIT_LIMIT_EXCEEDED");
  });

  it("POS: descuento superior al 10% requiere admin", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `DESC-${Date.now()}`, nombre: "Prod descuento", precioCompra: 5, precioVenta: 100 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);

    const body = { lineas: [{ tipo: "producto", productoId, cantidad: 1 }], descuento: 50, tipoPago: "contado", metodoPago: "efectivo" };
    const resV = await request(app).post("/api/v1/ventas").set(authV).send(body);
    expect(resV.status).toBe(403);
    const resA = await request(app).post("/api/v1/ventas").set(auth).send(body);
    expect(resA.status).toBe(201);
  });

  it("FINANZAS: abono reduce la CxC", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const c = await pool.query<{ id: number }>(
      "INSERT INTO clientes (nombre, telefono, limite_credito) VALUES ('Abono Test', '5599776655', 5000) RETURNING id"
    );
    const clienteId = c.rows[0]!.id;
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `ABONO-${Date.now()}`, nombre: "Prod abono", precioCompra: 5, precioVenta: 100 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ clienteId, lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "credito" });
    const ventaId = venta.body.data.id;

    const abono = await request(app).post(`/api/v1/ventas/${ventaId}/pagos`).set(auth).send({ monto: 40, metodo: "efectivo" });
    expect(abono.status).toBe(200);

    const cxc = await request(app).get("/api/v1/finanzas/cxc").set(auth);
    const item = cxc.body.data.find((x: { ventaId: number }) => x.ventaId === ventaId);
    expect(item.saldo).toBeCloseTo(venta.body.data.total - 40, 2);
  });

  it("POS: cancelar venta revierte el stock", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `CANV-${Date.now()}`, nombre: "Prod cancelar venta", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 2 }], tipoPago: "contado", metodoPago: "efectivo" });
    const ventaId = venta.body.data.id;

    const cancelada = await request(app).post(`/api/v1/ventas/${ventaId}/cancelar`).set(auth).send({ motivo: "Prueba" });
    expect(cancelada.status).toBe(200);

    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stock.rows[0]?.stock)).toBe(5);
  });

  it("POS: devolución restituye el stock", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `DEV-${Date.now()}`, nombre: "Prod devolución", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 2 }], tipoPago: "contado", metodoPago: "efectivo" });
    const ventaId = venta.body.data.id;
    const intermedio = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(intermedio.rows[0]?.stock)).toBe(3);

    const dev = await request(app)
      .post(`/api/v1/ventas/${ventaId}/devolucion`)
      .set(auth)
      .send({ lineas: [{ productoId, cantidad: 2 }] });
    expect(dev.status).toBe(200);

    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stock.rows[0]?.stock)).toBe(5);
  });

  it("CAJA: corte y cierre con arqueo", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const actual = await request(app).get("/api/v1/caja/actual").set(auth);
    if (!actual.body.data) {
      await request(app).post("/api/v1/caja/abrir").set(auth);
    }

    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `CAJA-${Date.now()}`, nombre: "Prod caja", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);
    await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo", montoRecibido: 100 });

    const corte = await request(app).get("/api/v1/caja/corte").set(auth);
    expect(corte.status).toBe(200);
    expect(corte.body.data.ingresos).toBeGreaterThan(0);

    const cerrada = await request(app)
      .post("/api/v1/caja/cerrar")
      .set(auth)
      .send({ efectivoFisico: corte.body.data.esperadoEfectivo });
    expect(cerrada.status).toBe(200);
    expect(Math.abs(cerrada.body.data.diferencia)).toBeLessThan(0.001);
  });

  it("COMPRAS: ciclo proveedor → OC → enviar → recibir aumenta stock y genera CxP", async () => {
    const auth = { Authorization: `Bearer ${token}` };

    // 1. Crear proveedor
    const prov = await request(app)
      .post("/api/v1/proveedores")
      .set(auth)
      .send({ nombre: `Proveedor ${Date.now()}`, contacto: "contacto@mail.com", condicionesPago: "Crédito 30 días" });
    expect(prov.status).toBe(201);
    const proveedorId = prov.body.data.id;

    // 2. Producto con stock inicial 0
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `COMP-${Date.now()}`, nombre: "Prod compra", precioCompra: 10, precioVenta: 25 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [productoId]);

    // 3. Crear OC (borrador)
    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId, lineas: [{ productoId, cantidad: 5, precioUnitario: 12 }] });
    expect(oc.status).toBe(201);
    expect(oc.body.data.folio).toMatch(/^OC-/);
    expect(oc.body.data.estado).toBe("borrador");
    expect(oc.body.data.total).toBe(60);
    const compraId = oc.body.data.id;

    // 4. Enviar
    const enviada = await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);
    expect(enviada.status).toBe(200);
    expect(enviada.body.data.estado).toBe("enviada");

    // 5. Recibir → stock sube a 5, movimiento ENTRADA, CxP con saldo = total
    const recibida = await request(app).post(`/api/v1/compras/${compraId}/recibir`).set(auth);
    expect(recibida.status).toBe(200);
    expect(recibida.body.data.estado).toBe("recibida");

    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stock.rows[0]?.stock)).toBe(5);
    const mov = await pool.query<{ tipo: string }>(
      "SELECT tipo FROM movimientos_inventario WHERE producto_id = $1 AND referencia_id = $2 AND referencia_tipo = 'compra'",
      [productoId, compraId]
    );
    expect(mov.rows[0]?.tipo).toBe("ENTRADA");
    const precio = await pool.query<{ precio_compra: string }>("SELECT precio_compra FROM productos WHERE id = $1", [productoId]);
    expect(Number(precio.rows[0]?.precio_compra)).toBeCloseTo(12, 2);

    const cxp = await request(app).get("/api/v1/compras/cxp").set(auth);
    const item = cxp.body.data.find((x: { compraId: number }) => x.compraId === compraId);
    expect(item.saldo).toBeCloseTo(60, 2);
  });

  it("COMPRAS: pagos parciales reducen el saldo de CxP", async () => {
    const auth = { Authorization: `Bearer ${token}` };

    const prov = await request(app)
      .post("/api/v1/proveedores")
      .set(auth)
      .send({ nombre: `Proveedor Pago ${Date.now()}` });
    const proveedorId = prov.body.data.id;
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `PAGO-${Date.now()}`, nombre: "Prod pago compra", precioCompra: 10, precioVenta: 25 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [productoId]);

    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId, lineas: [{ productoId, cantidad: 10, precioUnitario: 10 }] });
    const compraId = oc.body.data.id;
    await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);
    await request(app).post(`/api/v1/compras/${compraId}/recibir`).set(auth);

    const pago1 = await request(app).post(`/api/v1/compras/${compraId}/pagos`).set(auth).send({ monto: 40, metodo: "transferencia" });
    expect(pago1.status).toBe(200);
    expect(pago1.body.data.saldoPendiente).toBeCloseTo(60, 2);

    const pago2 = await request(app).post(`/api/v1/compras/${compraId}/pagos`).set(auth).send({ monto: 60, metodo: "transferencia" });
    expect(pago2.status).toBe(200);
    expect(pago2.body.data.saldoPendiente).toBeCloseTo(0, 2);

    const cxp = await request(app).get("/api/v1/compras/cxp").set(auth);
    const item = cxp.body.data.find((x: { compraId: number }) => x.compraId === compraId);
    expect(item.estado).toBe("pagado");
  });

  it("COMPRAS: no permite recibir en borrador, pagar de más, ni crear con vendedor", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };

    const prov = await request(app)
      .post("/api/v1/proveedores")
      .set(auth)
      .send({ nombre: `Proveedor Inválido ${Date.now()}` });
    const proveedorId = prov.body.data.id;
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `INV-${Date.now()}`, nombre: "Prod inválido compra", precioCompra: 10, precioVenta: 25 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [productoId]);

    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId, lineas: [{ productoId, cantidad: 5, precioUnitario: 10 }] });
    const compraId = oc.body.data.id;

    // Recibir en borrador → 409
    const recv = await request(app).post(`/api/v1/compras/${compraId}/recibir`).set(auth);
    expect(recv.status).toBe(409);

    // Crear OC como vendedor → 403
    const creadaV = await request(app)
      .post("/api/v1/compras")
      .set(authV)
      .send({ proveedorId, lineas: [{ productoId, cantidad: 1, precioUnitario: 10 }] });
    expect(creadaV.status).toBe(403);

    // Pagar antes de recibir → 409
    const pago = await request(app).post(`/api/v1/compras/${compraId}/pagos`).set(auth).send({ monto: 10, metodo: "efectivo" });
    expect(pago.status).toBe(409);

    // Pagar de más → 422
    await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);
    await request(app).post(`/api/v1/compras/${compraId}/recibir`).set(auth);
    const sobrepago = await request(app).post(`/api/v1/compras/${compraId}/pagos`).set(auth).send({ monto: 9999, metodo: "efectivo" });
    expect(sobrepago.status).toBe(422);
  });

  it("COMPRAS: cancelar una OC no recibida no afecta inventario", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const prov = await request(app)
      .post("/api/v1/proveedores")
      .set(auth)
      .send({ nombre: `Proveedor Cancel ${Date.now()}` });
    const proveedorId = prov.body.data.id;
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `CANP-${Date.now()}`, nombre: "Prod cancelar compra", precioCompra: 10, precioVenta: 25 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [productoId]);

    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId, lineas: [{ productoId, cantidad: 3, precioUnitario: 10 }] });
    const compraId = oc.body.data.id;

    const cancelada = await request(app).post(`/api/v1/compras/${compraId}/cancelar`).set(auth);
    expect(cancelada.status).toBe(200);
    expect(cancelada.body.data.estado).toBe("cancelada");

    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stock.rows[0]?.stock)).toBe(0);

    const cxp = await request(app).get("/api/v1/compras/cxp").set(auth);
    expect(cxp.body.data.find((x: { compraId: number }) => x.compraId === compraId)).toBeUndefined();
  });
});
