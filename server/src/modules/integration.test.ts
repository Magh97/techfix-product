import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { pool } from "../shared/db";
import { limpiarRefreshTokens } from "./auth/auth.service";
import { marcarRetrasadas } from "./services/ordenes.service";
import { marcarGarantiasPorVencer } from "./garantias/garantias.service";

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

  it("cotizaciones de venta: ciclo emitida → aprobada → convertir, con reglas", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const vendedorAuth = { Authorization: `Bearer ${vendedorToken}` };

    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `COT-${Date.now()}`, nombre: "Prod cotización", precioCompra: 50, precioVenta: 100 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [productoId]);

    // Descuento >10% con vendedor → 403 (BR-VEN-05)
    const forbidden = await request(app)
      .post("/api/v1/cotizaciones-venta")
      .set(vendedorAuth)
      .send({ clienteId, lineas: [{ productoId, cantidad: 1 }], descuento: 50 });
    expect(forbidden.status).toBe(403);

    // Descuento sin motivo → 400
    const sinMotivo = await request(app)
      .post("/api/v1/cotizaciones-venta")
      .set(auth)
      .send({ clienteId, lineas: [{ productoId, cantidad: 1 }], descuento: 5 });
    expect(sinMotivo.status).toBe(400);

    // Crear cotización: 1×100 → total 116 (IVA 16)
    const creada = await request(app)
      .post("/api/v1/cotizaciones-venta")
      .set(auth)
      .send({ clienteId, lineas: [{ productoId, cantidad: 1 }] });
    expect(creada.status).toBe(201);
    expect(creada.body.data.folio).toMatch(/^CV-/);
    expect(creada.body.data.total).toBe(116);
    expect(creada.body.data.estado).toBe("emitida");
    const cotizacionId = creada.body.data.id;

    // Convertir sin aprobar → 422
    const sinAprobar = await request(app)
      .post(`/api/v1/cotizaciones-venta/${cotizacionId}/convertir`)
      .set(auth)
      .send({ metodoPago: "efectivo" });
    expect(sinAprobar.status).toBe(422);
    expect(sinAprobar.body.error.code).toBe("QUOTE_NOT_APPROVED");

    // Aprobar → convertir → venta + stock descontado + estado convertida
    const aprobada = await request(app)
      .patch(`/api/v1/cotizaciones-venta/${cotizacionId}/estado`)
      .set(auth)
      .send({ nuevoEstado: "aprobada" });
    expect(aprobada.status).toBe(200);
    expect(aprobada.body.data.estado).toBe("aprobada");

    const convertida = await request(app)
      .post(`/api/v1/cotizaciones-venta/${cotizacionId}/convertir`)
      .set(auth)
      .send({ metodoPago: "efectivo" });
    expect(convertida.status).toBe(200);
    expect(convertida.body.data.venta.folio).toMatch(/^VEN-/);
    expect(convertida.body.data.venta.total).toBe(116);

    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [productoId]);
    expect(Number(stock.rows[0]?.stock)).toBe(4);

    const estadoFinal = await pool.query<{ estado: string }>("SELECT estado FROM cotizaciones_venta WHERE id = $1", [cotizacionId]);
    expect(estadoFinal.rows[0]?.estado).toBe("convertida");

    // Cotización expirada → QUOTE_EXPIRED al aprobar
    const creada2 = await request(app)
      .post("/api/v1/cotizaciones-venta")
      .set(auth)
      .send({ clienteId, lineas: [{ productoId, cantidad: 1 }] });
    const cotizacion2Id = creada2.body.data.id;
    await pool.query("UPDATE cotizaciones_venta SET vigencia_hasta = CURRENT_DATE - 1 WHERE id = $1", [cotizacion2Id]);
    const expirada = await request(app)
      .patch(`/api/v1/cotizaciones-venta/${cotizacion2Id}/estado`)
      .set(auth)
      .send({ nuevoEstado: "aprobada" });
    expect(expirada.status).toBe(422);
    expect(expirada.body.error.code).toBe("QUOTE_EXPIRED");
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

  it("COMPRAS: recepción parcial mantiene la OC en enviada, acumula CxP y permite pagar", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const prov = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `Parcial-${suf}` })).body.data.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `PAR-${suf}`, nombre: "Prod recepción parcial", precioCompra: 12, precioVenta: 25 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [prod]);

    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId: prov, lineas: [{ productoId: prod, cantidad: 5, precioUnitario: 12 }] });
    const compraId = oc.body.data.id;
    const detalleCompraId = oc.body.data.lineas[0].id;
    await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);

    // Recibir 2 de 5 → sigue enviada, stock 2, CxP por lo recibido
    const parcial = await request(app)
      .post(`/api/v1/compras/${compraId}/recibir`)
      .set(auth)
      .send({ lineas: [{ detalleCompraId, cantidadRecibida: 2 }] });
    expect(parcial.status).toBe(200);
    expect(parcial.body.data.estado).toBe("enviada");
    expect(parcial.body.data.totalRecibido).toBeCloseTo(24, 2);
    expect(parcial.body.data.lineas[0].cantidadRecibida).toBe(2);
    expect(parcial.body.data.lineas[0].recibida).toBe(false);

    const stock1 = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [prod]);
    expect(Number(stock1.rows[0]?.stock)).toBe(2);

    // CxP acumulada y pago parcial permitido con la OC aún enviada
    const cxp1 = await request(app).get("/api/v1/compras/cxp").set(auth);
    const item1 = cxp1.body.data.find((x: { compraId: number }) => x.compraId === compraId);
    expect(item1.saldo).toBeCloseTo(24, 2);
    const pago = await request(app).post(`/api/v1/compras/${compraId}/pagos`).set(auth).send({ monto: 10, metodo: "transferencia" });
    expect(pago.status).toBe(200);
    expect(pago.body.data.saldoPendiente).toBeCloseTo(14, 2);

    // Completar el resto → recibida, stock 5, CxP 60
    const resto = await request(app)
      .post(`/api/v1/compras/${compraId}/recibir`)
      .set(auth)
      .send({ lineas: [{ detalleCompraId, cantidadRecibida: 3 }] });
    expect(resto.status).toBe(200);
    expect(resto.body.data.estado).toBe("recibida");
    expect(resto.body.data.totalRecibido).toBeCloseTo(60, 2);
    const stock2 = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [prod]);
    expect(Number(stock2.rows[0]?.stock)).toBe(5);
    const cxp2 = await request(app).get("/api/v1/compras/cxp").set(auth);
    const item2 = cxp2.body.data.find((x: { compraId: number }) => x.compraId === compraId);
    expect(item2.saldo).toBeCloseTo(50, 2);
  });

  it("COMPRAS: sobrerecepción rechazada (422 SOBRE_RECEPCION)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const prov = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `Sobre-${suf}` })).body.data.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `SOB-${suf}`, nombre: "Prod sobrerecepción", precioCompra: 10, precioVenta: 20 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [prod]);
    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId: prov, lineas: [{ productoId: prod, cantidad: 5, precioUnitario: 10 }] });
    const compraId = oc.body.data.id;
    const detalleCompraId = oc.body.data.lineas[0].id;
    await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);

    const sobre = await request(app)
      .post(`/api/v1/compras/${compraId}/recibir`)
      .set(auth)
      .send({ lineas: [{ detalleCompraId, cantidadRecibida: 6 }] });
    expect(sobre.status).toBe(422);
    expect(sobre.body.error.code).toBe("SOBRE_RECEPCION");

    // La línea de otra compra no pertenece → 422 LINEA_NO_EN_COMPRA y sin cambios
    const otra = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId: prov, lineas: [{ productoId: prod, cantidad: 2, precioUnitario: 10 }] });
    const otroDetalle = otra.body.data.lineas[0].id;
    const ajeno = await request(app)
      .post(`/api/v1/compras/${compraId}/recibir`)
      .set(auth)
      .send({ lineas: [{ detalleCompraId: otroDetalle, cantidadRecibida: 1 }] });
    expect(ajeno.status).toBe(422);
    expect(ajeno.body.error.code).toBe("LINEA_NO_EN_COMPRA");
    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [prod]);
    expect(Number(stock.rows[0]?.stock)).toBe(0);
  });

  it("COMPRAS: cancelar OC con recepción parcial conserva stock y CxP acumulada", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const prov = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `CancP-${suf}` })).body.data.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `CP-${suf}`, nombre: "Prod cancelar parcial", precioCompra: 8, precioVenta: 20 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [prod]);
    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId: prov, lineas: [{ productoId: prod, cantidad: 4, precioUnitario: 8 }] });
    const compraId = oc.body.data.id;
    const detalleCompraId = oc.body.data.lineas[0].id;
    await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);
    await request(app)
      .post(`/api/v1/compras/${compraId}/recibir`)
      .set(auth)
      .send({ lineas: [{ detalleCompraId, cantidadRecibida: 1 }] });

    const cancelada = await request(app).post(`/api/v1/compras/${compraId}/cancelar`).set(auth);
    expect(cancelada.status).toBe(200);
    expect(cancelada.body.data.estado).toBe("cancelada");
    expect(cancelada.body.data.totalRecibido).toBeCloseTo(8, 2);

    // El stock recibido se conserva y la CxP por lo recibido sigue vigente
    const stock = await pool.query<{ stock: number }>("SELECT stock FROM productos WHERE id = $1", [prod]);
    expect(Number(stock.rows[0]?.stock)).toBe(1);
    const cxp = await request(app).get("/api/v1/compras/cxp").set(auth);
    const item = cxp.body.data.find((x: { compraId: number }) => x.compraId === compraId);
    expect(item.saldo).toBeCloseTo(8, 2);
  });

  it("COMPRAS: solicitud pasa a entregada al completarse la línea (parcial no entrega)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };
    const suf = Date.now();
    const prov = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `Ent-${suf}` })).body.data.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `ENT-${suf}`, nombre: "Refacción entregada", precioCompra: 10, precioVenta: 22 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0, proveedor_favorito_id = $2 WHERE id = $1", [prod, prov]);

    const sol = (await request(app).post("/api/v1/compras/solicitudes").set(authT).send({ productoId: prod, cantidad: 2 })).body.data.id;
    const aprobada = await request(app).post("/api/v1/compras/solicitudes/aprobar").set(auth).send({ solicitudes: [sol] });
    const compraId = aprobada.body.data.compras[0].id;
    const detalle = await request(app).get(`/api/v1/compras/${compraId}`).set(auth);
    const detalleCompraId = detalle.body.data.lineas[0].id;
    await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);

    // Recepción parcial (1 de 2) → la solicitud sigue aprobada
    await request(app)
      .post(`/api/v1/compras/${compraId}/recibir`)
      .set(auth)
      .send({ lineas: [{ detalleCompraId, cantidadRecibida: 1 }] });
    let estado = await pool.query<{ estado: string }>("SELECT estado FROM solicitudes_reabastecimiento WHERE id = $1", [sol]);
    expect(estado.rows[0]?.estado).toBe("aprobada");

    // Completar la línea → solicitud entregada
    await request(app)
      .post(`/api/v1/compras/${compraId}/recibir`)
      .set(auth)
      .send({ lineas: [{ detalleCompraId, cantidadRecibida: 1 }] });
    estado = await pool.query<{ estado: string }>("SELECT estado FROM solicitudes_reabastecimiento WHERE id = $1", [sol]);
    expect(estado.rows[0]?.estado).toBe("entregada");
  });

  it("COMPARACIÓN: devuelve el último precio por proveedor y destaca el más barato/favorito", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const provA = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `CompA-${suf}` })).body.data.id;
    const provB = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `CompB-${suf}` })).body.data.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `CMP-${suf}`, nombre: "Prod comparar", precioCompra: 10, precioVenta: 22, proveedorFavoritoId: provB })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [prod]);

    // OC A (enviada) a $10 y OC B (enviada) a $8 → el más reciente/barato es B
    const ocA = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId: provA, lineas: [{ productoId: prod, cantidad: 3, precioUnitario: 10 }] });
    await request(app).post(`/api/v1/compras/${ocA.body.data.id}/enviar`).set(auth);
    const ocB = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId: provB, lineas: [{ productoId: prod, cantidad: 2, precioUnitario: 8 }] });
    await request(app).post(`/api/v1/compras/${ocB.body.data.id}/enviar`).set(auth);

    const res = await request(app).get(`/api/v1/compras/comparacion-precios?productoId=${prod}`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.producto.precioCompra).toBeCloseTo(10, 2);
    expect(res.body.data.proveedores).toHaveLength(2);
    const [b, a] = res.body.data.proveedores;
    expect(b.proveedorId).toBe(provB);
    expect(b.ultimoPrecio).toBeCloseTo(8, 2);
    expect(b.esMasBarato).toBe(true);
    expect(b.esFavorito).toBe(true);
    expect(b.porDebajoDelActual).toBe(true);
    expect(a.proveedorId).toBe(provA);
    expect(a.ultimoPrecio).toBeCloseTo(10, 2);
    expect(a.esMasBarato).toBe(false);
    expect(a.esFavorito).toBe(false);
  });

  it("COMPARACIÓN: solo admin, 404 de producto inexistente y lista vacía sin historial", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const suf = Date.now();
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `CMV-${suf}`, nombre: "Prod sin historial", precioCompra: 10, precioVenta: 20 })
    ).body.data.id;

    const vendedor = await request(app).get(`/api/v1/compras/comparacion-precios?productoId=${prod}`).set(authV);
    expect(vendedor.status).toBe(403);

    const inexistente = await request(app).get("/api/v1/compras/comparacion-precios?productoId=999999999").set(auth);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error.code).toBe("PRODUCT_NOT_FOUND");

    const sinHistorial = await request(app).get(`/api/v1/compras/comparacion-precios?productoId=${prod}`).set(auth);
    expect(sinHistorial.status).toBe(200);
    expect(sinHistorial.body.data.proveedores).toHaveLength(0);
  });

  it("USADOS: registrar crea producto bajo 'Usado' + metadatos + movimiento ENTRADA (stock editable)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const cliente = (await pool.query<{ id: number }>("INSERT INTO clientes (nombre, telefono) VALUES ($1,$2) RETURNING id", [`Cliente Usado ${suf}`, `55${suf}`.slice(0, 10)])).rows[0]!.id;

    const res = await request(app)
      .post("/api/v1/usados")
      .set(auth)
      .send({
        sku: `USO-${suf}`,
        nombre: "Laptop usada",
        marca: "Dell",
        modelo: "Latitude",
        valorTradeIn: 500,
        precioVenta: 1200,
        stock: 1,
        origen: "parte_de_pago",
        clienteId: cliente,
        observaciones: "Recibida en parte de pago",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.estado).toBe("disponible");
    expect(res.body.data.valorTradeIn).toBeCloseTo(500, 2);
    expect(res.body.data.clienteOrigenNombre).toBe(`Cliente Usado ${suf}`);
    const equipoId = res.body.data.id;
    const productoId = res.body.data.productoId;

    // El producto quedó bajo la raíz "Usado" con el valor como costo y stock editable
    const prod = await pool.query<{ categoria_id: number; stock: number; precio_compra: string }>(
      "SELECT categoria_id, stock, precio_compra FROM productos WHERE id = $1",
      [productoId]
    );
    expect(Number(prod.rows[0]?.precio_compra)).toBeCloseTo(500, 2);
    expect(prod.rows[0]?.stock).toBe(1);
    const raiz = await pool.query<{ nombre: string }>("SELECT c.nombre FROM catalogos c WHERE c.id = $1", [
      prod.rows[0]?.categoria_id,
    ]);
    expect(raiz.rows[0]?.nombre).toBe("Usado");

    // Metadatos y movimiento ENTRADA
    const meta = await pool.query<{ origen: string }>("SELECT origen FROM equipos_usados WHERE id = $1", [equipoId]);
    expect(meta.rows[0]?.origen).toBe("parte_de_pago");
    const mov = await pool.query<{ tipo: string }>(
      "SELECT tipo FROM movimientos_inventario WHERE producto_id = $1 AND referencia_tipo = 'usado'",
      [productoId]
    );
    expect(mov.rows[0]?.tipo).toBe("ENTRADA");

    // Stock editable
    const otro = await request(app)
      .post("/api/v1/usados")
      .set(auth)
      .send({ sku: `USO2-${suf}`, nombre: "Monitores usados", valorTradeIn: 300, precioVenta: 600, stock: 3, origen: "otro" });
    expect(otro.status).toBe(201);
    expect(otro.body.data.stock).toBe(3);
  });

  it("USADOS: listado con estado derivado (disponible/vendido) y filtros", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const base = `LIS-${suf}`;
    const vendido = (await request(app).post("/api/v1/usados").set(auth).send({ sku: `${base}-V`, nombre: "Usado vendido", valorTradeIn: 100, precioVenta: 200, origen: "otro" })).body.data;
    const disponible = (await request(app).post("/api/v1/usados").set(auth).send({ sku: `${base}-D`, nombre: "Usado disponible", valorTradeIn: 100, precioVenta: 200, origen: "reparacion" })).body.data;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [vendido.productoId]);

    const vendidos = await request(app).get("/api/v1/usados?estado=vendido").set(auth);
    expect(vendidos.body.data.some((u: { id: number }) => u.id === vendido.id)).toBe(true);
    expect(vendidos.body.data.some((u: { id: number }) => u.id === disponible.id)).toBe(false);

    const disp = await request(app).get("/api/v1/usados?estado=disponible").set(auth);
    expect(disp.body.data.some((u: { id: number }) => u.id === disponible.id)).toBe(true);
    expect(disp.body.data.some((u: { id: number }) => u.id === vendido.id)).toBe(false);

    const porOrigen = await request(app).get("/api/v1/usados?origen=reparacion").set(auth);
    expect(porOrigen.body.data.some((u: { id: number }) => u.id === disponible.id)).toBe(true);
    expect(porOrigen.body.data.some((u: { id: number }) => u.id === vendido.id)).toBe(false);

    const porQ = await request(app).get(`/api/v1/usados?q=${base}`).set(auth);
    expect(porQ.body.data.length).toBe(2);
    expect(porQ.body.meta.totalItems).toBe(2);
  });

  it("USADOS: vendedor no crea (403) y edición actualiza valores", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const suf = Date.now();

    const vendedor = await request(app)
      .post("/api/v1/usados")
      .set(authV)
      .send({ sku: `NOP-${suf}`, nombre: "Sin permiso", valorTradeIn: 100, precioVenta: 200, origen: "otro" });
    expect(vendedor.status).toBe(403);

    const creado = (await request(app).post("/api/v1/usados").set(auth).send({ sku: `EDI-${suf}`, nombre: "Editable", valorTradeIn: 400, precioVenta: 900, origen: "otro" })).body.data;
    const editado = await request(app).put(`/api/v1/usados/${creado.id}`).set(auth).send({ valorTradeIn: 450, precioVenta: 1300 });
    expect(editado.status).toBe(200);
    expect(editado.body.data.valorTradeIn).toBeCloseTo(450, 2);
    expect(editado.body.data.precioVenta).toBeCloseTo(1300, 2);
    const prod = await pool.query<{ precio_compra: string }>("SELECT precio_compra FROM productos WHERE id = $1", [creado.productoId]);
    expect(Number(prod.rows[0]?.precio_compra)).toBeCloseTo(450, 2);
  });

  it("GARANTÍA: venta con cliente y producto nuevo genera garantía producto_nuevo (30 días)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const cliente = (await pool.query<{ id: number }>("INSERT INTO clientes (nombre, telefono) VALUES ($1,$2) RETURNING id", [`Cliente Garantía ${suf}`, `56${suf}`.slice(0, 10)])).rows[0]!.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `GAR-${suf}`, nombre: "Producto con garantía", precioCompra: 100, precioVenta: 200 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [prod]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ clienteId: cliente, lineas: [{ tipo: "producto", productoId: prod, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(venta.status).toBe(201);
    expect(venta.body.data.garantias).toHaveLength(1);
    expect(venta.body.data.garantias[0].tipo).toBe("producto_nuevo");
    expect(venta.body.data.garantias[0].fin).toBe(todayPlus(30));

    const g = await pool.query<{ tipo: string; cliente_id: number; venta_id: number; fin: string }>(
      "SELECT tipo, cliente_id, venta_id, to_char(fin, 'YYYY-MM-DD') AS fin FROM garantias WHERE venta_id = $1",
      [venta.body.data.id]
    );
    expect(g.rows[0]?.tipo).toBe("producto_nuevo");
    expect(g.rows[0]?.cliente_id).toBe(cliente);
    expect(g.rows[0]?.fin).toBe(todayPlus(30));
  });

  it("GARANTÍA: venta con cliente y producto usado genera garantía usado (15 días)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const cliente = (await pool.query<{ id: number }>("INSERT INTO clientes (nombre, telefono) VALUES ($1,$2) RETURNING id", [`Cliente GarUsado ${suf}`, `57${suf}`.slice(0, 10)])).rows[0]!.id;
    const usado = (
      await request(app).post("/api/v1/usados").set(auth).send({
        sku: `USG-${suf}`,
        nombre: "Monitor usado",
        valorTradeIn: 300,
        precioVenta: 700,
        origen: "parte_de_pago",
        clienteId: cliente,
      })
    ).body.data;

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ clienteId: cliente, lineas: [{ tipo: "producto", productoId: usado.productoId, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(venta.status).toBe(201);
    expect(venta.body.data.garantias).toHaveLength(1);
    expect(venta.body.data.garantias[0].tipo).toBe("usado");
    expect(venta.body.data.garantias[0].fin).toBe(todayPlus(15));
  });

  it("GARANTÍA: venta a mostrador (sin cliente) no genera garantía; venta mixta genera 2", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const cliente = (await pool.query<{ id: number }>("INSERT INTO clientes (nombre, telefono) VALUES ($1,$2) RETURNING id", [`Cliente Mixta ${suf}`, `58${suf}`.slice(0, 10)])).rows[0]!.id;
    const nuevo = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `MIX-${suf}`, nombre: "Producto mixto", precioCompra: 50, precioVenta: 120 })
    ).body.data.id;
    const usado = (
      await request(app).post("/api/v1/usados").set(auth).send({ sku: `USM-${suf}`, nombre: "Usado mixto", valorTradeIn: 40, precioVenta: 100, origen: "otro" })
    ).body.data;
    await pool.query("UPDATE productos SET stock = 3 WHERE id = $1", [nuevo]);

    // Mostrador (sin cliente) → sin garantía
    const mostrador = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId: nuevo, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(mostrador.status).toBe(201);
    expect(mostrador.body.data.garantias).toHaveLength(0);
    const sinGar = await pool.query("SELECT 1 FROM garantias WHERE venta_id = $1", [mostrador.body.data.id]);
    expect(sinGar.rowCount).toBe(0);

    // Mixta con cliente → 2 garantías con tipos correctos
    const mixta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        clienteId: cliente,
        lineas: [
          { tipo: "producto", productoId: nuevo, cantidad: 1 },
          { tipo: "producto", productoId: usado.productoId, cantidad: 1 },
        ],
        tipoPago: "contado",
        metodoPago: "efectivo",
      });
    expect(mixta.status).toBe(201);
    const tipos = mixta.body.data.garantias.map((g: { tipo: string }) => g.tipo).sort();
    expect(tipos).toEqual(["producto_nuevo", "usado"]);
  });

  it("PARTE DE PAGO: venta contado con usado crea el producto usado, registra venta_id y ajusta cambio", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const cliente = (await pool.query<{ id: number }>("INSERT INTO clientes (nombre, telefono) VALUES ($1,$2) RETURNING id", [`Cliente TradeIn ${suf}`, `59${suf}`.slice(0, 10)])).rows[0]!.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `TI-${suf}`, nombre: "Producto con trade-in", precioCompra: 100, precioVenta: 200 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [prod]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        clienteId: cliente,
        lineas: [{ tipo: "producto", productoId: prod, cantidad: 1 }],
        tipoPago: "contado",
        metodoPago: "efectivo",
        partesDePago: [{ nombre: "Monitor usado", marca: "LG", valor: 40, precioVenta: 120 }],
      });
    expect(venta.status).toBe(201);
    expect(venta.body.data.parteDePago).toBeCloseTo(40, 2);
    expect(venta.body.data.totalAPagar).toBeCloseTo(232 - 40, 2);
    expect(venta.body.data.cambio).toBe(0);
    expect(venta.body.data.usadosCreados).toHaveLength(1);
    const ventaId = venta.body.data.id;

    // El usado se creó bajo la raíz "Usado", con venta_id y movimiento ENTRADA
    const usado = venta.body.data.usadosCreados[0];
    const meta = await pool.query<{ venta_id: number; origen: string; valor_trade_in: string }>(
      "SELECT venta_id, origen, valor_trade_in FROM equipos_usados WHERE producto_id = $1",
      [usado.productoId]
    );
    expect(meta.rows[0]?.venta_id).toBe(ventaId);
    expect(meta.rows[0]?.origen).toBe("parte_de_pago");
    expect(Number(meta.rows[0]?.valor_trade_in)).toBeCloseTo(40, 2);
    const prodUsado = await pool.query<{ stock: number; categoria_id: number }>(
      "SELECT stock, categoria_id FROM productos WHERE id = $1",
      [usado.productoId]
    );
    expect(prodUsado.rows[0]?.stock).toBe(1);
    const raiz = await pool.query<{ nombre: string }>("SELECT c.nombre FROM catalogos c WHERE c.id = $1", [prodUsado.rows[0]?.categoria_id]);
    expect(raiz.rows[0]?.nombre).toBe("Usado");
    const mov = await pool.query<{ tipo: string }>(
      "SELECT tipo FROM movimientos_inventario WHERE producto_id = $1 AND referencia_tipo = 'usado'",
      [usado.productoId]
    );
    expect(mov.rows[0]?.tipo).toBe("ENTRADA");
  });

  it("PARTE DE PAGO: corte excluye el trade-in del efectivo y lo desglosa", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const actual = await request(app).get("/api/v1/caja/actual").set(auth);
    const abiertaPorMi = !actual.body.data;
    if (abiertaPorMi) await request(app).post("/api/v1/caja/abrir").set(auth);

    const antes = await request(app).get("/api/v1/caja/corte").set(auth);
    const suf = Date.now();
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `TIC-${suf}`, nombre: "Prod corte trade-in", precioCompra: 50, precioVenta: 100 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [prod]);
    await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        lineas: [{ tipo: "producto", productoId: prod, cantidad: 1 }],
        tipoPago: "contado",
        metodoPago: "efectivo",
        partesDePago: [{ nombre: "Teclado usado", valor: 20, precioVenta: 60 }],
      });

    const despues = await request(app).get("/api/v1/caja/corte").set(auth);
    // total = 116, trade-in = 20 → efectivo esperado sube 96 y partes de pago suben 20
    expect(despues.body.data.partesDePago - antes.body.data.partesDePago).toBeCloseTo(20, 2);
    expect(despues.body.data.esperadoEfectivo - antes.body.data.esperadoEfectivo).toBeCloseTo(96, 2);

    if (abiertaPorMi) {
      await request(app)
        .post("/api/v1/caja/cerrar")
        .set(auth)
        .send({ efectivoFisico: despues.body.data.esperadoEfectivo });
    }
  });

  it("PARTE DE PAGO: validaciones (crédito 422, valor mayor al total 422, sin trade-in no crea usados)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `TIV-${suf}`, nombre: "Prod validación trade-in", precioCompra: 50, precioVenta: 100 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [prod]);

    // Crédito con parte de pago → 422
    const credito = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        clienteId: clienteId,
        lineas: [{ tipo: "producto", productoId: prod, cantidad: 1 }],
        tipoPago: "credito",
        partesDePago: [{ nombre: "Usado crédito", valor: 10, precioVenta: 30 }],
      });
    expect(credito.status).toBe(422);
    expect(credito.body.error.code).toBe("PARTE_DE_PAGO_INVALIDA");

    // Parte de pago mayor al total → 422
    const excede = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        lineas: [{ tipo: "producto", productoId: prod, cantidad: 1 }],
        tipoPago: "contado",
        metodoPago: "efectivo",
        partesDePago: [{ nombre: "Usado caro", valor: 9999, precioVenta: 12000 }],
      });
    expect(excede.status).toBe(422);
    expect(excede.body.error.code).toBe("PARTE_DE_PAGO_INVALIDA");

    // Efectivo menor al total a pagar → 422
    const pocoEfectivo = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({
        lineas: [{ tipo: "producto", productoId: prod, cantidad: 1 }],
        tipoPago: "contado",
        metodoPago: "efectivo",
        montoRecibido: 10,
        partesDePago: [{ nombre: "Usado", valor: 30, precioVenta: 90 }],
      });
    expect(pocoEfectivo.status).toBe(422);

    // Sin trade-in → no crea usados
    const normal = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId: prod, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(normal.status).toBe(201);
    expect(normal.body.data.usadosCreados).toHaveLength(0);
    const sinUsados = await pool.query("SELECT 1 FROM equipos_usados WHERE venta_id = $1", [normal.body.data.id]);
    expect(sinUsados.rowCount).toBe(0);
  });

  it("DASHBOARD: resumen devuelve la estructura esperada", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const res = await request(app).get("/api/v1/dashboard/resumen").set(auth);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(typeof d.ventasHoy.total).toBe("number");
    expect(typeof d.ventasHoy.cantidad).toBe("number");
    expect(typeof d.ventasHoy.ticketPromedio).toBe("number");
    expect(typeof d.ordenes.activas).toBe("number");
    expect(typeof d.ordenes.retrasadas).toBe("number");
    expect(typeof d.inventario.stockBajo).toBe("number");
    expect(typeof d.cajaAbierta).toBe("boolean");
    expect(Array.isArray(d.topProductos)).toBe(true);
    expect(Array.isArray(d.topDeudores)).toBe(true);
  });

  it("USUARIOS: lista por rol solo para admin", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const res = await request(app).get("/api/v1/usuarios?rol=tecnico&pageSize=100").set(auth);
    expect(res.status).toBe(200);
    const encontrado = res.body.data.find((u: { usuario: string }) => u.usuario === "tecnico");
    expect(encontrado).toBeTruthy();
    expect(encontrado.rol).toBe("tecnico");
    const v = await request(app).get("/api/v1/usuarios").set(authV);
    expect(v.status).toBe(403);
  });

  it("PRODUCTOS: kit expone kitDisponible según stock de componentes", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const comp = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `KD-${Date.now()}`, nombre: "Comp kit disp", precioCompra: 5, precioVenta: 10 });
    const compId = comp.body.data.id;
    const kit = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `KITD-${Date.now()}`, nombre: "Kit disp", precioCompra: 5, precioVenta: 10 });
    const kitId = kit.body.data.id;
    await request(app).put(`/api/v1/productos/${kitId}/bom`).set(auth).send({ componentes: [{ productoId: compId, cantidad: 1 }], manoObra: 0 });

    // Componente sin stock → kitDisponible 0
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [compId]);
    const sinStock = await request(app).get(`/api/v1/productos/${kitId}`).set(auth);
    expect(sinStock.body.data.isKit).toBe(true);
    expect(sinStock.body.data.kitDisponible).toBe(0);

    // Componente con stock 3 → kitDisponible 3
    await pool.query("UPDATE productos SET stock = 3 WHERE id = $1", [compId]);
    const conStock = await request(app).get(`/api/v1/productos/${kitId}`).set(auth);
    expect(conStock.body.data.kitDisponible).toBe(3);
  });

  it("PRODUCTOS: limpiar BOM desmarca el kit y conserva el precio", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const comp = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `LKC-${Date.now()}`, nombre: "Comp limpiar kit", precioCompra: 5, precioVenta: 10 });
    const compId = comp.body.data.id;
    const kit = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `LKK-${Date.now()}`, nombre: "Kit limpiar", precioCompra: 5, precioVenta: 999 });
    const kitId = kit.body.data.id;
    await request(app).put(`/api/v1/productos/${kitId}/bom`).set(auth).send({ componentes: [{ productoId: compId, cantidad: 2 }], manoObra: 10 });
    const comoKit = await request(app).get(`/api/v1/productos/${kitId}`).set(auth);
    expect(comoKit.body.data.isKit).toBe(true);
    const precioComoKit = comoKit.body.data.precioVenta;

    const limpiada = await request(app).put(`/api/v1/productos/${kitId}/bom`).set(auth).send({ componentes: [], manoObra: 0 });
    expect(limpiada.status).toBe(200);
    expect(limpiada.body.data.componentes).toHaveLength(0);
    expect(limpiada.body.data.precioVenta).toBe(precioComoKit);

    const final = await request(app).get(`/api/v1/productos/${kitId}`).set(auth);
    expect(final.body.data.isKit).toBe(false);
    expect(final.body.data.kitDisponible).toBeNull();

    const bomEndpoint = await request(app).get(`/api/v1/productos/${kitId}/bom`).set(auth);
    expect(bomEndpoint.status).toBe(400);
  });

  it("REPORTES: rentabilidad calcula margen correcto con una venta conocida", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `RENT-${Date.now()}`, nombre: "Prod rentabilidad", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 100 WHERE id = $1", [productoId]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 2 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(venta.status).toBe(201);

    const res = await request(app).get("/api/v1/reports/rentabilidad").set(auth);
    expect(res.status).toBe(200);
    const fila = res.body.data.data.find((x: { producto: string }) => x.producto === "Prod rentabilidad");
    expect(fila).toBeTruthy();
    expect(fila.unidades).toBe(2);
    expect(fila.ingreso).toBeCloseTo(20, 2);
    expect(fila.margen).toBeCloseTo(10, 2);
  });

  it("REPORTES: clientes muestra total compras y saldo pendiente", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const c = await pool.query<{ id: number }>(
      "INSERT INTO clientes (nombre, telefono, limite_credito) VALUES ('Reporte Cliente', '5599001122', 10000) RETURNING id"
    );
    const clienteId = c.rows[0]!.id;
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `CLI-${Date.now()}`, nombre: "Prod reporte cliente", precioCompra: 5, precioVenta: 100 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 100 WHERE id = $1", [productoId]);

    await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ clienteId, lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "credito" });
    await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ clienteId, lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "credito" });

    const res = await request(app).get("/api/v1/reports/clientes").set(auth);
    expect(res.status).toBe(200);
    const fila = res.body.data.data.find((x: { clienteId: number }) => x.clienteId === clienteId);
    expect(fila).toBeTruthy();
    expect(fila.ventas).toBe(2);
    expect(fila.totalCompras).toBeGreaterThan(0);
    expect(fila.saldo).toBeCloseTo(fila.totalCompras, 2);
  });

  it("REPORTES: financiero refleja egresos e ingresos", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `FIN-${Date.now()}`, nombre: "Prod financiero", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 100 WHERE id = $1", [productoId]);
    await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    await request(app).post("/api/v1/finanzas/egresos").set(auth).send({ concepto: "Renta", categoria: "Operativo", monto: 50, metodo: "efectivo" });

    const res = await request(app).get("/api/v1/reports/financiero").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.resumen.totalIngresos).toBeGreaterThan(0);
    expect(res.body.data.resumen.totalEgresos).toBeGreaterThanOrEqual(50);
    expect(res.body.data.resumen.utilidad).toBeCloseTo(res.body.data.resumen.totalIngresos - res.body.data.resumen.totalEgresos, 2);
  });

  it("REPORTES: export devuelve archivo con Content-Disposition", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const res = await request(app).get("/api/v1/reports/ventas/export?formato=csv").set(auth);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBeTruthy();
  });

  it("CATALOGOS: CRUD, anti-ciclos y RBAC", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const suf = Date.now();

    // Solo admin puede listar
    expect((await request(app).get("/api/v1/catalogos").set(authV)).status).toBe(403);

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `Raiz-${suf}` });
    expect(root.status).toBe(201);
    const rootId = root.body.data.id;

    const ram = await request(app).post("/api/v1/catalogos").set(auth).send({
      nombre: `RAM-${suf}`,
      parentId: rootId,
      tagsSugeridas: ["SO-DIMM", "Capacidad", "Velocidad"],
      tagsCompatibilidad: ["DDR4", "DDR5"],
    });
    expect(ram.status).toBe(201);
    const ramId = ram.body.data.id;

    // Hermano duplicado → 409
    const dup = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `ram-${suf}`, parentId: rootId });
    expect(dup.status).toBe(409);

    // Mover RAM dentro de sí misma → 400 (ciclo)
    const ciclo = await request(app).put(`/api/v1/catalogos/${ramId}`).set(auth).send({ parentId: ramId });
    expect(ciclo.status).toBe(400);
    expect(ciclo.body.error.code).toBe("CICLO_CATALOGO");

    // Eliminar con producto asignado → 409
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `CATPROD-${suf}`, nombre: "Prod con catalogo", precioCompra: 5, precioVenta: 10, catalogoId: ramId });
    expect(prod.status).toBe(201);
    const del = await request(app).delete(`/api/v1/catalogos/${ramId}`).set(auth);
    expect(del.status).toBe(409);
  });

  it("TAXONOMÍA: sustituye producto con misma compatibilidad (32GB → 16GB DDR5)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `RootTax-${suf}` });
    const ram = await request(app).post("/api/v1/catalogos").set(auth).send({
      nombre: `RAM-Tax-${suf}`,
      parentId: root.body.data.id,
      tagsSugeridas: ["SO-DIMM", "Capacidad"],
      tagsCompatibilidad: ["DDR4", "DDR5"],
    });
    const ramId = ram.body.data.id;

    async function crearRam(sku: string, tags: string[], stock: number) {
      const r = await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku, nombre: `RAM ${sku}`, precioCompra: 5, precioVenta: 10, catalogoId: ramId, especificaciones: tags, stockMinimo: 1 });
      await pool.query("UPDATE productos SET stock = $2 WHERE id = $1", [r.body.data.id, stock]);
      return r.body.data.id;
    }

    const a = await crearRam(`A32-${suf}`, ["DDR5", "32GB"], 5);
    const b = await crearRam(`B16-${suf}`, ["DDR5", "16GB"], 3);
    const c = await crearRam(`C-DDR4-${suf}`, ["DDR4", "16GB"], 3);

    const res = await request(app).get(`/api/v1/productos/${a}/sugerencias`).set(auth);
    expect(res.status).toBe(200);
    const ids = res.body.data.sustitutos.map((s: { id: number }) => s.id);
    expect(ids).toContain(b);
    expect(ids).not.toContain(c);
  });

  it("TAXONOMÍA: kit con componente corto sugiere sustituto del componente", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `RootKit-${suf}` });
    const ram = await request(app).post("/api/v1/catalogos").set(auth).send({
      nombre: `RAM-Kit-${suf}`,
      parentId: root.body.data.id,
      tagsSugeridas: ["SO-DIMM"],
      tagsCompatibilidad: ["DDR5"],
    });
    const ramId = ram.body.data.id;

    async function crearRam(sku: string, tags: string[], stock: number) {
      const r = await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku, nombre: `RAM ${sku}`, precioCompra: 5, precioVenta: 10, catalogoId: ramId, especificaciones: tags });
      await pool.query("UPDATE productos SET stock = $2 WHERE id = $1", [r.body.data.id, stock]);
      return r.body.data.id;
    }

    const corto = await crearRam(`Corto-${suf}`, ["DDR5"], 0);
    const sustituto = await crearRam(`Sust-${suf}`, ["DDR5"], 4);

    const kit = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `KITTAX-${suf}`, nombre: "Kit Taxonomía", precioCompra: 5, precioVenta: 10 });
    await request(app).put(`/api/v1/productos/${kit.body.data.id}/bom`).set(auth).send({ componentes: [{ productoId: corto, cantidad: 1 }], manoObra: 0 });

    const res = await request(app).get(`/api/v1/productos/${kit.body.data.id}/sugerencias`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.componenteCorto.productoId).toBe(corto);
    const ids = res.body.data.sustitutosComponente.map((s: { id: number }) => s.id);
    expect(ids).toContain(sustituto);
  });

  it("IMPORT: crea producto con catálogo y especificaciones desde CSV", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `RootImp-${suf}` });
    const imp = await request(app).post("/api/v1/catalogos").set(auth).send({
      nombre: `RAM-Imp-${suf}`,
      parentId: root.body.data.id,
      tagsSugeridas: ["SO-DIMM"],
      tagsCompatibilidad: [],
    });
    const catalogoNombre = imp.body.data.nombre;

    const csv = `SKU,CodigoBarras,Nombre,Marca,Modelo,CategoriaId,Catalogo,Especificaciones,PrecioCompra,PrecioVenta,StockMinimo,Stock\n` +
      `IMP-${suf},,RAM Importada,,,1,${catalogoNombre},["DDR5"],500,800,1,10\n`;
    const res = await request(app)
      .post("/api/v1/productos/importar")
      .set(auth)
      .attach("archivo", Buffer.from(csv, "utf-8"), `import-${suf}.csv`);
    expect(res.status).toBe(200);
    expect(res.body.data.importados).toBe(1);

    const prod = await pool.query<{ catalogo_id: number | null; especificaciones: string[] }>(
      "SELECT catalogo_id, especificaciones FROM productos WHERE sku = $1",
      [`IMP-${suf}`]
    );
    expect(prod.rows[0]?.catalogo_id).toBe(imp.body.data.id);
    expect(prod.rows[0]?.especificaciones).toContain("DDR5");
  });

  it("TAXONOMÍA: la categoría debe ser una raíz y se deriva del catálogo", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `RootCat-${suf}` });
    const child = await request(app)
      .post("/api/v1/catalogos")
      .set(auth)
      .send({ nombre: `Child-${suf}`, parentId: root.body.data.id });
    const childId = child.body.data.id;

    // categoriaId no puede ser un catálogo hijo
    const noRaiz = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: childId, sku: `NORAIZ-${suf}`, nombre: "No raíz", precioCompra: 5, precioVenta: 10 });
    expect(noRaiz.status).toBe(400);
    expect(noRaiz.body.error.code).toBe("CATEGORIA_INVALIDA");

    // La categoría se deriva automáticamente a la raíz del catálogo
    const auto = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `AUTO-${suf}`, nombre: "Auto raíz", precioCompra: 5, precioVenta: 10, catalogoId: childId });
    expect(auto.status).toBe(201);
    expect(auto.body.data.categoriaId).toBe(root.body.data.id);
  });

  it("TAXONOMÍA: filtro por catálogo incluye descendientes", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `RootFiltro-${suf}` });
    const rootId = root.body.data.id;
    const child = await request(app)
      .post("/api/v1/catalogos")
      .set(auth)
      .send({ nombre: `ChildFiltro-${suf}`, parentId: rootId });
    const childId = child.body.data.id;
    const leaf = await request(app)
      .post("/api/v1/catalogos")
      .set(auth)
      .send({ nombre: `LeafFiltro-${suf}`, parentId: childId });
    const leafId = leaf.body.data.id;

    async function crear(sku: string, catalogoId: number) {
      const r = await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: rootId, sku, nombre: sku, precioCompra: 5, precioVenta: 10, catalogoId });
      return r.body.data.id;
    }
    const enChild = await crear(`FILCHILD-${suf}`, childId);
    const enLeaf = await crear(`FILLEAF-${suf}`, leafId);

    const porRaiz = await request(app).get(`/api/v1/productos?catalogoId=${rootId}`).set(auth);
    const idsRaiz = porRaiz.body.data.map((p: { id: number }) => p.id);
    expect(idsRaiz).toContain(enChild);
    expect(idsRaiz).toContain(enLeaf);

    const porChild = await request(app).get(`/api/v1/productos?catalogoId=${childId}`).set(auth);
    const idsChild = porChild.body.data.map((p: { id: number }) => p.id);
    expect(idsChild).toContain(enChild);
    expect(idsChild).toContain(enLeaf);

    const porLeaf = await request(app).get(`/api/v1/productos?catalogoId=${leafId}`).set(auth);
    const idsLeaf = porLeaf.body.data.map((p: { id: number }) => p.id);
    expect(idsLeaf).toContain(enLeaf);
    expect(idsLeaf).not.toContain(enChild);
  });

  it("TAXONOMÍA: límite de profundidad de 4 niveles", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();

    const n1 = (await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `N1-${suf}` })).body.data.id;
    const n2 = (await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `N2-${suf}`, parentId: n1 })).body.data.id;
    const n3 = (await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `N3-${suf}`, parentId: n2 })).body.data.id;
    const n4 = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `N4-${suf}`, parentId: n3 });
    expect(n4.status).toBe(201);
    expect(n4.body.data.id).toBeTruthy();

    const n5 = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `N5-${suf}`, parentId: n4.body.data.id });
    expect(n5.status).toBe(400);
    expect(n5.body.error.code).toBe("PROFUNDIDAD_MAXIMA");
  });

  it("REABASTECIMIENTO: sugiere por proveedor (favorito → último → sin proveedor) y excluye kits/OC", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();

    const provFav = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `Fav-${suf}` })).body.data.id;
    const provLast = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `Last-${suf}` })).body.data.id;

    async function crear(sku: string, stock: number, stockMin: number, stockMax = 0) {
      const r = await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku, nombre: sku, precioCompra: 10, precioVenta: 20, stockMinimo: stockMin, stockMaximo: stockMax });
      await pool.query("UPDATE productos SET stock = $2 WHERE id = $1", [r.body.data.id, stock]);
      return r.body.data.id;
    }

    // A: bajo mínimo con proveedor favorito
    const a = await crear(`REA-FAV-${suf}`, 1, 5, 8);
    await pool.query("UPDATE productos SET proveedor_favorito_id = $1 WHERE id = $2", [provFav, a]);

    // B: bajo mínimo sin favorito pero con último proveedor (OC recibida)
    const b = await crear(`REA-LAST-${suf}`, 0, 3);
    const ocB = await request(app).post("/api/v1/compras").set(auth).send({ proveedorId: provLast, lineas: [{ productoId: b, cantidad: 2, precioUnitario: 10 }] });
    await request(app).post(`/api/v1/compras/${ocB.body.data.id}/enviar`).set(auth);
    await request(app).post(`/api/v1/compras/${ocB.body.data.id}/recibir`).set(auth);
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [b]);

    // C: sobre mínimo → excluido
    const c = await crear(`REA-OK-${suf}`, 20, 5);

    // D: kit bajo mínimo → excluido
    const kit = await crear(`REA-KIT-${suf}`, 0, 2);
    await pool.query("UPDATE productos SET is_kit = true WHERE id = $1", [kit]);

    // E: bajo mínimo con OC activa (borrador)
    const e = await crear(`REA-OC-${suf}`, 0, 3, 6);
    await pool.query("UPDATE productos SET proveedor_favorito_id = $1 WHERE id = $2", [provFav, e]);
    await request(app).post("/api/v1/compras").set(auth).send({ proveedorId: provFav, lineas: [{ productoId: e, cantidad: 3, precioUnitario: 10 }] });

    const res = await request(app).get("/api/v1/compras/reabastecimiento").set(auth);
    expect(res.status).toBe(200);
    const grupos = res.body.data.grupos;

    const gFav = grupos.find((g: { proveedorId: number }) => g.proveedorId === provFav);
    expect(gFav).toBeTruthy();
    const fav = gFav.lineas.find((l: { productoId: number }) => l.productoId === a);
    expect(fav.sugerido).toBe(8 - 1);
    expect(fav.enOC).toBe(false);
    expect(fav.esFavorito).toBe(true);
    const enOC = gFav.lineas.find((l: { productoId: number }) => l.productoId === e);
    expect(enOC.enOC).toBe(true);
    expect(enOC.folioOC).toBeTruthy();

    const gLast = grupos.find((g: { proveedorId: number }) => g.proveedorId === provLast);
    const last = gLast.lineas.find((l: { productoId: number }) => l.productoId === b);
    expect(last.sugerido).toBe(3 * 2);
    expect(last.esFavorito).toBe(false);

    const todos = grupos.flatMap((g: { lineas: { productoId: number }[] }) => g.lineas);
    expect(todos.some((l: { productoId: number }) => l.productoId === c)).toBe(false);
    expect(todos.some((l: { productoId: number }) => l.productoId === kit)).toBe(false);

    // RBAC: vendedor no puede
    const v = await request(app).get("/api/v1/compras/reabastecimiento").set({ Authorization: `Bearer ${vendedorToken}` });
    expect(v.status).toBe(403);
  });

  it("SOLICITUDES: técnico crea (regla de stock), admin aprueba creando OC y rechaza", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const suf = Date.now();

    const prov = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `SolProv-${suf}` })).body.data.id;
    const prod = (
      await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `SOL-${suf}`, nombre: "Refacción", precioCompra: 15, precioVenta: 25, stockMinimo: 2, stockMaximo: 4 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0, proveedor_favorito_id = $2 WHERE id = $1", [prod, prov]);

    // Vendedor no puede crear
    const v = await request(app).post("/api/v1/compras/solicitudes").set(authV).send({ productoId: prod, cantidad: 2 });
    expect(v.status).toBe(403);

    // Con stock suficiente → 422
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [prod]);
    const conStock = await request(app).post("/api/v1/compras/solicitudes").set(authT).send({ productoId: prod, cantidad: 2 });
    expect(conStock.status).toBe(422);
    expect(conStock.body.error.code).toBe("STOCK_SUFICIENTE");

    // Técnico crea (sin stock)
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [prod]);
    const creada = await request(app)
      .post("/api/v1/compras/solicitudes")
      .set(authT)
      .send({ productoId: prod, cantidad: 2, motivo: "Falta para orden" });
    expect(creada.status).toBe(201);
    const solId = creada.body.data.id;
    expect(creada.body.data.estado).toBe("pendiente");

    // Técnico lista sin orden → 400
    const sinOrden = await request(app).get("/api/v1/compras/solicitudes").set(authT);
    expect(sinOrden.status).toBe(400);

    // Admin lista
    const lista = await request(app).get("/api/v1/compras/solicitudes?estado=pendiente").set(auth);
    expect(lista.status).toBe(200);
    expect(lista.body.data.some((s: { id: number }) => s.id === solId)).toBe(true);

    // NOT-05 registrada
    const notif = await pool.query("SELECT 1 FROM notificaciones WHERE tipo = 'NOT-05' ORDER BY id DESC LIMIT 1");
    expect(notif.rowCount).toBeGreaterThan(0);

    // Aprobar → crea OC y marca aprobada
    const aprobada = await request(app).post("/api/v1/compras/solicitudes/aprobar").set(auth).send({ solicitudes: [solId] });
    expect(aprobada.status).toBe(200);
    expect(aprobada.body.data.compras.length).toBe(1);
    const estado = await pool.query("SELECT estado, compra_id FROM solicitudes_reabastecimiento WHERE id = $1", [solId]);
    expect(estado.rows[0]?.estado).toBe("aprobada");
    expect(estado.rows[0]?.compra_id).toBeTruthy();

    // Rechazar otra solicitud
    const sol2 = (await request(app).post("/api/v1/compras/solicitudes").set(authT).send({ productoId: prod, cantidad: 1 })).body.data.id;
    const rechazada = await request(app).post(`/api/v1/compras/solicitudes/${sol2}/rechazar`).set(auth).send({ motivo: "Ya cubierta" });
    expect(rechazada.status).toBe(200);
    expect(rechazada.body.data.estado).toBe("rechazada");

    // Técnico no puede aprobar
    const noPermiso = await request(app).post("/api/v1/compras/solicitudes/aprobar").set(authT).send({ solicitudes: [sol2] });
    expect(noPermiso.status).toBe(403);
  });

  it("SOLICITUDES: sin proveedor queda pendiente al aprobar", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };
    const suf = Date.now();

    const prod = (
      await request(app).post("/api/v1/productos").set(auth).send({ categoriaId: 1, sku: `SOLSP-${suf}`, nombre: "R sin prov", precioCompra: 5, precioVenta: 10 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [prod]);

    const s = (await request(app).post("/api/v1/compras/solicitudes").set(authT).send({ productoId: prod, cantidad: 1 })).body.data.id;
    const res = await request(app).post("/api/v1/compras/solicitudes/aprobar").set(auth).send({ solicitudes: [s] });
    expect(res.status).toBe(200);
    expect(res.body.data.sinProveedor).toContain(s);
    const estado = await pool.query("SELECT estado FROM solicitudes_reabastecimiento WHERE id = $1", [s]);
    expect(estado.rows[0]?.estado).toBe("pendiente");
  });

  it("SOLICITUDES: cancelación por dueño (pendiente) y por admin", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const suf = Date.now();

    const prod = (
      await request(app).post("/api/v1/productos").set(auth).send({ categoriaId: 1, sku: `SOLC-${suf}`, nombre: "R", precioCompra: 5, precioVenta: 10 })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [prod]);

    // Dueño (técnico) cancela su solicitud pendiente
    const s1 = (await request(app).post("/api/v1/compras/solicitudes").set(authT).send({ productoId: prod, cantidad: 2, motivo: "x" })).body.data.id;
    const can = await request(app).post(`/api/v1/compras/solicitudes/${s1}/cancelar`).set(authT).send({ motivo: "Ya no la necesito" });
    expect(can.status).toBe(200);
    expect(can.body.data.estado).toBe("cancelada");

    // Vendedor no puede cancelar
    const s2 = (await request(app).post("/api/v1/compras/solicitudes").set(authT).send({ productoId: prod, cantidad: 1 })).body.data.id;
    const vend = await request(app).post(`/api/v1/compras/solicitudes/${s2}/cancelar`).set(authV).send({ motivo: "x" });
    expect(vend.status).toBe(403);

    // Admin cancela cualquier solicitud
    const adminCan = await request(app).post(`/api/v1/compras/solicitudes/${s2}/cancelar`).set(auth).send({ motivo: "La cancela admin" });
    expect(adminCan.status).toBe(200);
    expect(adminCan.body.data.estado).toBe("cancelada");
  });

  it("SUSTITUCIÓN: proponer y aceptar reemplaza la pieza en la cotización (precio nuevo)", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const suf = Date.now();

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `RootSub-${suf}` });
    const ram = await request(app).post("/api/v1/catalogos").set(auth).send({
      nombre: `RAMSub-${suf}`,
      parentId: root.body.data.id,
      tagsCompatibilidad: ["DDR5"],
    });
    const ramId = ram.body.data.id;

    const a = (
      await request(app).post("/api/v1/productos").set(auth).send({
        categoriaId: 1, sku: `SUBA-${suf}`, nombre: "RAM original", precioCompra: 5, precioVenta: 10, catalogoId: ramId, especificaciones: ["DDR5"],
      })
    ).body.data.id;
    const b = (
      await request(app).post("/api/v1/productos").set(auth).send({
        categoriaId: 1, sku: `SUBB-${suf}`, nombre: "RAM sustituta", precioCompra: 6, precioVenta: 12, catalogoId: ramId, especificaciones: ["DDR5"],
      })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 1 WHERE id = $1", [a]);
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [b]);

    const orden = await request(app).post("/api/v1/ordenes").set(auth).send({ clienteId, tipoEquipo: "laptop", marca: "Lenovo", modelo: "X1", fallaReportada: "No enciende", fechaPrometida: todayPlus(3) });
    const ordenId = orden.body.data.id;
    const cot = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/cotizaciones`)
      .set(authT)
      .send({ lineas: [{ tipoLinea: "refaccion", productoId: a, cantidad: 1 }] });
    expect(cot.status).toBe(201);
    const cotizacionId = cot.body.data.id;
    const lineaId = (await request(app).get(`/api/v1/ordenes/${ordenId}`).set(auth)).body.data.cotizaciones[0].lineas[0].id;

    // Sin stock del original → se propone sustitución
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [a]);
    const prop = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/sustituciones`)
      .set(authT)
      .send({ cotizacionId, lineaId, sustitutoId: b, justificacion: "Sin stock" });
    expect(prop.status).toBe(201);
    const sid = prop.body.data.id;
    expect(prop.body.data.estado).toBe("pendiente");
    let det = (await request(app).get(`/api/v1/ordenes/${ordenId}`).set(auth)).body.data;
    expect(det.estado).toBe("sustitucion_pendiente");

    // Vendedor no puede crear sustitución
    const v = await request(app).post(`/api/v1/ordenes/${ordenId}/sustituciones`).set(authV).send({ cotizacionId, lineaId, sustitutoId: b });
    expect(v.status).toBe(403);

    // Cliente acepta → la pieza se reemplaza con el precio nuevo
    const aceptada = await request(app).post(`/api/v1/ordenes/${ordenId}/sustituciones/${sid}/aceptar`).set(authT);
    expect(aceptada.status).toBe(200);
    expect(aceptada.body.data.estado).toBe("aceptada");
    det = (await request(app).get(`/api/v1/ordenes/${ordenId}`).set(auth)).body.data;
    expect(det.estado).toBe("cotizado");
    const linea = det.cotizaciones[0].lineas[0];
    expect(linea.productoId).toBe(b);
    expect(linea.precioNeto).toBe(12);
    expect(det.cotizaciones[0].total).toBeCloseTo(12 * 1.16, 2);
  });

  it("SUSTITUCIÓN: rechazar genera solicitud y al recibir la OC se marca entregada", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authT = { Authorization: `Bearer ${tecnicoToken}` };
    const suf = Date.now();

    const prov = (await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `SubProv-${suf}` })).body.data.id;

    const root = await request(app).post("/api/v1/catalogos").set(auth).send({ nombre: `RootSub2-${suf}` });
    const ram = await request(app).post("/api/v1/catalogos").set(auth).send({
      nombre: `RAMSub2-${suf}`,
      parentId: root.body.data.id,
      tagsCompatibilidad: ["DDR5"],
    });
    const ramId = ram.body.data.id;

    const a = (
      await request(app).post("/api/v1/productos").set(auth).send({
        categoriaId: 1, sku: `SUB2A-${suf}`, nombre: "RAM orig 2", precioCompra: 5, precioVenta: 10, catalogoId: ramId, especificaciones: ["DDR5"],
      })
    ).body.data.id;
    const b = (
      await request(app).post("/api/v1/productos").set(auth).send({
        categoriaId: 1, sku: `SUB2B-${suf}`, nombre: "RAM sust 2", precioCompra: 6, precioVenta: 12, catalogoId: ramId, especificaciones: ["DDR5"],
      })
    ).body.data.id;
    await pool.query("UPDATE productos SET stock = 1 WHERE id = $1", [a]);
    await pool.query("UPDATE productos SET stock = 5 WHERE id = $1", [b]);
    await pool.query("UPDATE productos SET proveedor_favorito_id = $1 WHERE id = $2", [prov, a]);

    const orden = await request(app).post("/api/v1/ordenes").set(auth).send({ clienteId, tipoEquipo: "laptop", marca: "Dell", modelo: "XPS", fallaReportada: "Falla", fechaPrometida: todayPlus(3) });
    const ordenId = orden.body.data.id;
    await request(app)
      .post(`/api/v1/ordenes/${ordenId}/cotizaciones`)
      .set(authT)
      .send({ lineas: [{ tipoLinea: "refaccion", productoId: a, cantidad: 1 }] });
    const det = (await request(app).get(`/api/v1/ordenes/${ordenId}`).set(auth)).body.data;
    const lineaId = det.cotizaciones[0].lineas[0].id;
    const cotizacionId = det.cotizaciones[0].id;
    await pool.query("UPDATE productos SET stock = 0 WHERE id = $1", [a]);

    const prop = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/sustituciones`)
      .set(authT)
      .send({ cotizacionId, lineaId, sustitutoId: b });
    const sid = prop.body.data.id;

    // Cliente rechaza → se genera solicitud de reabastecimiento del original
    const rechazada = await request(app)
      .post(`/api/v1/ordenes/${ordenId}/sustituciones/${sid}/rechazar`)
      .set(authT)
      .send({ motivo: "Prefiere la original" });
    expect(rechazada.status).toBe(200);
    expect(rechazada.body.data.estado).toBe("rechazada");
    const solId = rechazada.body.data.solicitudId;
    expect(solId).toBeTruthy();
    const ordenAfter = (await request(app).get(`/api/v1/ordenes/${ordenId}`).set(auth)).body.data;
    expect(ordenAfter.estado).toBe("cotizado");

    // Admin aprueba la solicitud → crea OC; se envía y se recibe
    const aprobada = await request(app).post("/api/v1/compras/solicitudes/aprobar").set(auth).send({ solicitudes: [solId] });
    expect(aprobada.status).toBe(200);
    expect(aprobada.body.data.compras.length).toBe(1);
    const compraId = aprobada.body.data.compras[0].id;
    await request(app).post(`/api/v1/compras/${compraId}/enviar`).set(auth);
    const recibida = await request(app).post(`/api/v1/compras/${compraId}/recibir`).set(auth);
    expect(recibida.status).toBe(200);

    // La solicitud queda "entregada" y la orden se actualiza en su historial
    const sol = await pool.query("SELECT estado FROM solicitudes_reabastecimiento WHERE id = $1", [solId]);
    expect(sol.rows[0]?.estado).toBe("entregada");
    const hist = await pool.query("SELECT nota FROM historial_orden WHERE orden_id = $1 ORDER BY id DESC LIMIT 1", [ordenId]);
    expect(String(hist.rows[0]?.nota ?? "")).toContain("llegó");
  });

  it("USUARIOS: alta, login, edición, desactivación y RBAC", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const suf = Date.now();
    const usuario = `nuevo-${suf}`;

    // Solo admin puede crear
    expect((await request(app).post("/api/v1/usuarios").set(authV).send({ nombre: "X", usuario: `x-${suf}`, password: "123456", rol: "vendedor" })).status).toBe(403);

    // Alta
    const creado = await request(app)
      .post("/api/v1/usuarios")
      .set(auth)
      .send({ nombre: "Nuevo Vendedor", usuario, password: "secreto123", rol: "vendedor" });
    expect(creado.status).toBe(201);
    const nuevoId = creado.body.data.id;

    // Login con la nueva credencial
    const login = await request(app).post("/api/v1/auth/login").send({ usuario, password: "secreto123" });
    expect(login.status).toBe(200);
    expect(login.body.data.usuario.rol).toBe("vendedor");

    // Usuario duplicado → 409
    const dup = await request(app).post("/api/v1/usuarios").set(auth).send({ nombre: "Otro", usuario, password: "secreto123", rol: "vendedor" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("USERNAME_TAKEN");

    // Desactivar self → 422
    const yoId = (await pool.query<{ id: number }>("SELECT id FROM usuarios WHERE usuario = 'admin'")).rows[0]!.id;
    const selfDes = await request(app).delete(`/api/v1/usuarios/${yoId}`).set(auth);
    expect(selfDes.status).toBe(422);
    expect(selfDes.body.error.code).toBe("SELF_DEACTIVATE");

    // Editar rol
    const editado = await request(app)
      .put(`/api/v1/usuarios/${nuevoId}`)
      .set(auth)
      .send({ rol: "tecnico", nombre: "Nuevo Técnico" });
    expect(editado.status).toBe(200);
    expect(editado.body.data.rol).toBe("tecnico");

    // Desactivar → login falla
    await request(app).delete(`/api/v1/usuarios/${nuevoId}`).set(auth);
    const loginDes = await request(app).post("/api/v1/auth/login").send({ usuario, password: "secreto123" });
    expect(loginDes.status).toBe(422);
  });

  it("INVENTARIO: ajuste cambia stock y registra movimiento AJUSTE", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `AJU-${Date.now()}`, nombre: "Prod ajuste", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 10 WHERE id = $1", [productoId]);

    // Ajuste negativo (merma)
    const neg = await request(app)
      .post(`/api/v1/productos/${productoId}/ajustar`)
      .set(auth)
      .send({ cantidad: -3, motivo: "Merma" });
    expect(neg.status).toBe(200);
    expect(neg.body.data.stock).toBe(7);

    // Ajuste positivo (inventario físico)
    const pos = await request(app)
      .post(`/api/v1/productos/${productoId}/ajustar`)
      .set(auth)
      .send({ cantidad: 5, motivo: "Inventario físico" });
    expect(pos.status).toBe(200);
    expect(pos.body.data.stock).toBe(12);

    // Movimiento AJUSTE registrado
    const mov = await pool.query<{ tipo: string; cantidad: number }>(
      "SELECT tipo, cantidad FROM movimientos_inventario WHERE producto_id = $1 AND tipo = 'AJUSTE' ORDER BY id",
      [productoId]
    );
    expect(mov.rows).toHaveLength(2);
    expect(Number(mov.rows[0]?.cantidad)).toBe(-3);

    // Ajuste que deja stock negativo → 422
    const sobre = await request(app)
      .post(`/api/v1/productos/${productoId}/ajustar`)
      .set(auth)
      .send({ cantidad: -999, motivo: "Merma" });
    expect(sobre.status).toBe(422);
    expect(sobre.body.error.code).toBe("STOCK_NEGATIVO");

    // Vendedor no puede ajustar → 403
    const v = await request(app)
      .post(`/api/v1/productos/${productoId}/ajustar`)
      .set(authV)
      .send({ cantidad: 1, motivo: "x" });
    expect(v.status).toBe(403);
  });

  it("INVENTARIO: historial de movimientos por producto", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `MOV-${Date.now()}`, nombre: "Prod movimientos", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 10 WHERE id = $1", [productoId]);
    await request(app).post(`/api/v1/productos/${productoId}/ajustar`).set(auth).send({ cantidad: 2, motivo: "Físico" });

    const res = await request(app).get(`/api/v1/productos/${productoId}/movimientos`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.meta.totalItems).toBe(1);
    expect(res.body.data[0].tipo).toBe("AJUSTE");
    expect(res.body.data[0].cantidad).toBe(2);
  });

  it("NOTIFICACIONES: worker dispara NOT-01 (retraso) por correo simulado", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const c = await pool.query<{ id: number }>(
      "INSERT INTO clientes (nombre, telefono, correo) VALUES ('Cliente Retraso', '5522113344', 'retraso@correo.test') RETURNING id"
    );
    const clienteId = c.rows[0]!.id;
    const orden = await request(app)
      .post("/api/v1/ordenes")
      .set(auth)
      .send({ clienteId, tipoEquipo: "laptop", fallaReportada: "Sobrecalienta", fechaPrometida: todayPlus(-4) });
    const ordenId = orden.body.data.id;

    await marcarRetrasadas();

    const notif = await pool.query<{ tipo: string; estado: string; canal: string }>(
      "SELECT tipo, estado, canal FROM notificaciones WHERE orden_id = $1 ORDER BY id DESC LIMIT 1",
      [ordenId]
    );
    expect(notif.rows[0]?.tipo).toBe("NOT-01");
    expect(notif.rows[0]?.canal).toBe("correo");
    expect(notif.rows[0]?.estado).toBe("enviado");
  });

  it("NOTIFICACIONES: plantillas y historial con RBAC", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };

    // Solo admin
    expect((await request(app).get("/api/v1/notificaciones/plantillas").set(authV)).status).toBe(403);

    const put = await request(app)
      .put("/api/v1/notificaciones/plantillas/NOT-01")
      .set(auth)
      .send({ asunto: "Retraso custom", cuerpo: "Hola {cliente}, tu orden {folio} se retrasa." });
    expect(put.status).toBe(200);

    const list = await request(app).get("/api/v1/notificaciones/plantillas").set(auth);
    expect(list.status).toBe(200);
    const not1 = list.body.data.find((p: { tipo: string }) => p.tipo === "NOT-01");
    expect(not1.asunto).toBe("Retraso custom");
    expect(not1.cuerpo).toContain("{folio}");

    const hist = await request(app).get("/api/v1/notificaciones/historial").set(auth);
    expect(hist.status).toBe(200);
    expect(Array.isArray(hist.body.data)).toBe(true);
  });

  it("CONFIG: GET devuelve parámetros, PUT valida y respeta RBAC", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };

    const get = await request(app).get("/api/v1/configuracion").set(auth);
    expect(get.status).toBe(200);
    expect(typeof get.body.data.ivaRate).toBe("number");
    expect(typeof get.body.data.limiteCreditoDefault).toBe("number");
    expect(typeof get.body.data.descuentoVendedorMax).toBe("number");
    expect(typeof get.body.data.diasDevolucion).toBe("number");
    expect(typeof get.body.data.diasGarantiaServicio).toBe("number");
    expect(typeof get.body.data.toleranciaRetrasoDias).toBe("number");

    // Vendedor no puede escribir
    const v = await request(app).put("/api/v1/configuracion").set(authV).send({ clave: "iva.rate", valor: 0.1 });
    expect(v.status).toBe(403);

    // Fuera de rango → 400
    const bad = await request(app).put("/api/v1/configuracion").set(auth).send({ clave: "iva.rate", valor: 1.5 });
    expect(bad.status).toBe(400);

    try {
      const put = await request(app).put("/api/v1/configuracion").set(auth).send({ clave: "iva.rate", valor: 0.08 });
      expect(put.status).toBe(200);
      const get2 = await request(app).get("/api/v1/configuracion").set(auth);
      expect(get2.body.data.ivaRate).toBe(0.08);
    } finally {
      await request(app).put("/api/v1/configuracion").set(auth).send({ clave: "iva.rate", valor: 0.16 });
    }
  });

  it("CONFIG: descuento vendedor y límite crédito default usan configuración", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const authV = { Authorization: `Bearer ${vendedorToken}` };

    try {
      await request(app).put("/api/v1/configuracion").set(auth).send({ clave: "credito.limite_default", valor: 800 });
      await request(app).put("/api/v1/configuracion").set(auth).send({ clave: "ventas.descuento_vendedor_max", valor: 0.5 });

      // Cliente sin límite explícito usa el default configurado
      const c = await request(app)
        .post("/api/v1/clientes")
        .set(auth)
        .send({ nombre: "Cliente Default", telefono: "5588990011" });
      expect(c.status).toBe(201);
      expect(c.body.data.limiteCredito).toBe(800);

      // Vendedor puede aplicar 50% con el límite ampliado
      const prod = await request(app)
        .post("/api/v1/productos")
        .set(auth)
        .send({ categoriaId: 1, sku: `CFG-${Date.now()}`, nombre: "Prod config", precioCompra: 5, precioVenta: 100 });
      const productoId = prod.body.data.id;
      await pool.query("UPDATE productos SET stock = 10 WHERE id = $1", [productoId]);
      const body = { lineas: [{ tipo: "producto", productoId, cantidad: 1 }], descuento: 50, tipoPago: "contado", metodoPago: "efectivo" };
      const resV = await request(app).post("/api/v1/ventas").set(authV).send(body);
      expect(resV.status).toBe(201);
    } finally {
      await request(app).put("/api/v1/configuracion").set(auth).send({ clave: "credito.limite_default", valor: 3000 });
      await request(app).put("/api/v1/configuracion").set(auth).send({ clave: "ventas.descuento_vendedor_max", valor: 0.1 });
    }
  });

  it("GARANTÍAS: listado con filtros y por cliente", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const c = await pool.query<{ id: number }>(
      "INSERT INTO clientes (nombre, telefono, correo) VALUES ('Cliente Garantía', '5522114455', 'garantia@correo.test') RETURNING id"
    );
    const clienteId = c.rows[0]!.id;
    await pool.query(
      "INSERT INTO garantias (cliente_id, tipo, inicio, fin) VALUES ($1,'servicio',CURRENT_DATE,CURRENT_DATE + 10)",
      [clienteId]
    );

    const res = await request(app).get(`/api/v1/garantias?estado=vigente&clienteId=${clienteId}`).set(auth);
    expect(res.status).toBe(200);
    const item = res.body.data.find((g: { clienteId: number }) => g.clienteId === clienteId);
    expect(item).toBeTruthy();
    expect(item.estado).toBe("vigente");

    const porCliente = await request(app).get(`/api/v1/clientes/${clienteId}/garantias`).set(auth);
    expect(porCliente.status).toBe(200);
    expect(porCliente.body.data.length).toBeGreaterThan(0);
  });

  it("NOTIFICACIONES: worker NOT-04 recuerda garantía por vencer y no duplica", async () => {
    const c = await pool.query<{ id: number }>(
      "INSERT INTO clientes (nombre, telefono, correo) VALUES ('Cliente Garantía Notif', '5522116677', 'garantianotif@correo.test') RETURNING id"
    );
    const clienteId = c.rows[0]!.id;
    const g = await pool.query<{ id: number }>(
      "INSERT INTO garantias (cliente_id, tipo, inicio, fin) VALUES ($1,'servicio',CURRENT_DATE,CURRENT_DATE + 1) RETURNING id",
      [clienteId]
    );
    const garantiaId = g.rows[0]!.id;

    await marcarGarantiasPorVencer();
    const n1 = await pool.query<{ id: number }>(
      "SELECT id FROM notificaciones WHERE garantia_id = $1 AND tipo = 'NOT-04'",
      [garantiaId]
    );
    expect(n1.rowCount).toBe(1);

    await marcarGarantiasPorVencer();
    const n2 = await pool.query<{ id: number }>(
      "SELECT id FROM notificaciones WHERE garantia_id = $1 AND tipo = 'NOT-04'",
      [garantiaId]
    );
    expect(n2.rowCount).toBe(1);
  });

  it("POS: por-codigo y por-folio exponen datos para escaneo y reimpresión", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const suf = Date.now();
    const codigo = `750${suf}`;

    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `SCAN-${suf}`, codigoBarras: codigo, nombre: "Prod escaneo", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 10 WHERE id = $1", [productoId]);

    const porCodigo = await request(app).get(`/api/v1/productos/por-codigo/${codigo}`).set(auth);
    expect(porCodigo.status).toBe(200);
    expect(porCodigo.body.data.sku).toBe(`SCAN-${suf}`);
    expect(porCodigo.body.data.stock).toBe(10);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(venta.status).toBe(201);

    const porFolio = await request(app).get(`/api/v1/ventas/por-folio/${venta.body.data.folio}`).set(auth);
    expect(porFolio.status).toBe(200);
    expect(porFolio.body.data.id).toBe(venta.body.data.id);
  });

  it("AUTH: rotación de refresh con detección de reuso", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ usuario: "admin", password: "admin1234" });
    const refresh1 = login.body.data.refreshToken;

    // Rotación correcta
    const rotado = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: refresh1 });
    expect(rotado.status).toBe(200);
    expect(rotado.body.data.refreshToken).toBeTruthy();
    const refresh2 = rotado.body.data.refreshToken;

    // Reuso del token anterior → 401 y revoca la familia
    const reuso = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: refresh1 });
    expect(reuso.status).toBe(401);
    expect(reuso.body.error.code).toBe("UNAUTHORIZED");

    // El token recién emitido también queda revocado (familia)
    const familia = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: refresh2 });
    expect(familia.status).toBe(401);
  });

  it("AUDITORÍA: se registran ventas y compras", async () => {
    const auth = { Authorization: `Bearer ${token}` };

    const prod = await request(app)
      .post("/api/v1/productos")
      .set(auth)
      .send({ categoriaId: 1, sku: `AUD-${Date.now()}`, nombre: "Prod auditoría", precioCompra: 5, precioVenta: 10 });
    const productoId = prod.body.data.id;
    await pool.query("UPDATE productos SET stock = 10 WHERE id = $1", [productoId]);

    const venta = await request(app)
      .post("/api/v1/ventas")
      .set(auth)
      .send({ lineas: [{ tipo: "producto", productoId, cantidad: 1 }], tipoPago: "contado", metodoPago: "efectivo" });
    expect(venta.status).toBe(201);
    const ventaId = venta.body.data.id;

    const auditVenta = await pool.query<{ accion: string }>(
      "SELECT accion FROM auditoria WHERE entidad = 'venta' AND entidad_id = $1 ORDER BY id DESC LIMIT 1",
      [ventaId]
    );
    expect(auditVenta.rows[0]?.accion).toBe("CREAR");

    const prov = await request(app).post("/api/v1/proveedores").set(auth).send({ nombre: `Prov Audit ${Date.now()}` });
    const proveedorId = prov.body.data.id;
    const oc = await request(app)
      .post("/api/v1/compras")
      .set(auth)
      .send({ proveedorId, lineas: [{ productoId, cantidad: 2, precioUnitario: 5 }] });
    expect(oc.status).toBe(201);
    const compraId = oc.body.data.id;

    const auditCompra = await pool.query<{ accion: string }>(
      "SELECT accion FROM auditoria WHERE entidad = 'compra' AND entidad_id = $1 ORDER BY id DESC LIMIT 1",
      [compraId]
    );
    expect(auditCompra.rows[0]?.accion).toBe("CREAR");
  });

  it("AUDITORÍA: GET /auditoria lista con filtros (admin) y RBAC (vendedor → 403)", async () => {
    // Hay al menos una venta auditada del test anterior
    const lista = await request(app).get("/api/v1/auditoria").set("Authorization", `Bearer ${token}`);
    expect(lista.status).toBe(200);
    expect(lista.body.data.length).toBeGreaterThan(0);
    expect(lista.body.meta.totalItems).toBeGreaterThan(0);
    expect(lista.body.data[0]).toHaveProperty("usuarioNombre");
    expect(lista.body.data[0]).toHaveProperty("fecha");

    const porEntidad = await request(app)
      .get("/api/v1/auditoria?entidad=venta")
      .set("Authorization", `Bearer ${token}`);
    expect(porEntidad.status).toBe(200);
    expect(porEntidad.body.data.every((r: { entidad: string }) => r.entidad === "venta")).toBe(true);

    // RBAC: vendedor no puede consultar auditoría
    const sinPermiso = await request(app).get("/api/v1/auditoria").set("Authorization", `Bearer ${vendedorToken}`);
    expect(sinPermiso.status).toBe(403);
  });

  it("AUTH: housekeeping de refresh tokens respeta retención", async () => {
    const usuarioId = (await pool.query<{ id: number }>("SELECT id FROM usuarios WHERE usuario = 'admin'")).rows[0]!.id;

    const viejo = await pool.query<{ id: number }>(
      `INSERT INTO refresh_tokens (usuario_id, jti, token_hash, expires_at, revoked, created_at)
       VALUES ($1, gen_random_uuid(), 'x', NOW() - interval '1 day', true, NOW() - interval '60 days') RETURNING id`,
      [usuarioId]
    );
    const reciente = await pool.query<{ id: number }>(
      `INSERT INTO refresh_tokens (usuario_id, jti, token_hash, expires_at, revoked)
       VALUES ($1, gen_random_uuid(), 'x', NOW() - interval '1 day', true) RETURNING id`,
      [usuarioId]
    );

    const borradas = await limpiarRefreshTokens(30);
    expect(borradas).toBeGreaterThanOrEqual(1);

    const sigueViejo = await pool.query("SELECT 1 FROM refresh_tokens WHERE id = $1", [viejo.rows[0]!.id]);
    const sigueReciente = await pool.query("SELECT 1 FROM refresh_tokens WHERE id = $1", [reciente.rows[0]!.id]);
    expect(sigueViejo.rowCount).toBe(0);
    expect(sigueReciente.rowCount).toBe(1);
  });

  it("AUTH: login y refresh exponen expiresIn", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ usuario: "admin", password: "admin1234" });
    expect(login.status).toBe(200);
    expect(login.body.data.expiresIn).toBeGreaterThan(0);

    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: login.body.data.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.token).toBeTruthy();
    expect(refresh.body.data.refreshToken).toBeTruthy();
    expect(refresh.body.data.expiresIn).toBeGreaterThan(0);
  });
});
