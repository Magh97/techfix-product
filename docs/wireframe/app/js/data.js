/* ============================================================
   data.js — Datos mock + estado mutable del wireframe
   ============================================================ */
"use strict";

const DB = (() => {
  const USERS = [
    { id: 1, nombre: "María González", usuario: "maria", rol: "admin", inicial: "MG" },
    { id: 2, nombre: "Carlos Pérez", usuario: "carlos", rol: "vendedor", inicial: "CP" },
    { id: 3, nombre: "Luis Ramírez", usuario: "luis", rol: "tecnico", inicial: "LR" },
  ];

  const PRODUCTS = [
    { id: 1, sku: "PROC-001", codigo: "7501221234101", nombre: "Procesador Intel i5-12400", marca: "Intel", modelo: "i5-12400", categoria: "componente", pCompra: 2800, pVenta: 3180, stock: 8, stockMin: 3, isKit: false },
    { id: 2, sku: "PROC-002", codigo: "7501221234102", nombre: "Procesador AMD Ryzen 5 5600", marca: "AMD", modelo: "5600", categoria: "componente", pCompra: 2500, pVenta: 2890, stock: 5, stockMin: 3, isKit: false },
    { id: 3, sku: "RAM-001", codigo: "7501221234103", nombre: "Memoria RAM 16GB DDR4 3200", marca: "Kingston", modelo: "KVR32", categoria: "componente", pCompra: 900, pVenta: 1180, stock: 12, stockMin: 5, isKit: false },
    { id: 4, sku: "SSD-001", codigo: "7501221234104", nombre: "SSD NVMe 1TB Gen4", marca: "Crucial", modelo: "P3", categoria: "componente", pCompra: 1100, pVenta: 1390, stock: 6, stockMin: 3, isKit: false },
    { id: 5, sku: "GPU-001", codigo: "7501221234105", nombre: "Tarjeta gráfica RTX 4060 8GB", marca: "NVIDIA", modelo: "RTX 4060", categoria: "componente", pCompra: 6200, pVenta: 6990, stock: 1, stockMin: 2, isKit: false },
    { id: 6, sku: "FUE-001", codigo: "7501221234106", nombre: "Fuente 650W 80+ Bronze", marca: "EVGA", modelo: "650B", categoria: "refaccion", pCompra: 700, pVenta: 950, stock: 7, stockMin: 2, isKit: false },
    { id: 7, sku: "GAB-001", codigo: "7501221234107", nombre: "Gabinete ATX Mid Tower", marca: "NZXT", modelo: "H510", categoria: "componente", pCompra: 800, pVenta: 1050, stock: 4, stockMin: 2, isKit: false },
    { id: 8, sku: "MON-001", codigo: "7501221234108", nombre: "Monitor 24\" FHD 144Hz", marca: "LG", modelo: "24GN60", categoria: "periferico", pCompra: 1800, pVenta: 2350, stock: 5, stockMin: 2, isKit: false },
    { id: 9, sku: "TEC-001", codigo: "7501221234109", nombre: "Teclado mecánico RGB", marca: "Logitech", modelo: "G413", categoria: "periferico", pCompra: 600, pVenta: 850, stock: 10, stockMin: 4, isKit: false },
    { id: 10, sku: "RAT-001", codigo: "7501221234110", nombre: "Mouse gamer 16000 DPI", marca: "Razer", modelo: "Viper", categoria: "periferico", pCompra: 450, pVenta: 690, stock: 2, stockMin: 3, isKit: false },
    { id: 11, sku: "KIT-001", codigo: "7501221234111", nombre: "PC Gamer Básico (armada)", marca: "TechStore", modelo: "GB-2026", categoria: "equipo_completo", pCompra: 9800, pVenta: 12800, stock: 2, stockMin: 1, isKit: true },
    { id: 12, sku: "LAP-001", codigo: "7501221234112", nombre: "Laptop ThinkPad T470 (usada)", marca: "Lenovo", modelo: "T470", categoria: "usado", pCompra: 4200, pVenta: 5000, stock: 1, stockMin: 1, isKit: false },
  ];

  const BOM = {
    11: [
      { productoId: 1, cantidad: 1 },
      { productoId: 3, cantidad: 2 },
      { productoId: 4, cantidad: 1 },
      { productoId: 5, cantidad: 1 },
      { productoId: 6, cantidad: 1 },
      { productoId: 7, cantidad: 1 },
    ],
  };

  const CLIENTES = [
    { id: 1, nombre: "Ana Torres", telefono: "5512345678", correo: "ana.torres@mail.com", direccion: "Av. Reforma 120, CDMX", preferencia: "whatsapp", limiteCredito: 3000, plazoDias: 15, etiquetas: ["frecuente"], isActive: true },
    { id: 2, nombre: "Beto Sánchez", telefono: "5522334455", correo: "beto.sanchez@mail.com", direccion: "Calle 5 de Mayo 33, CDMX", preferencia: "correo", limiteCredito: 5000, plazoDias: 30, etiquetas: ["corporativo"], isActive: true },
    { id: 3, nombre: "Carla Núñez", telefono: "5533445566", correo: null, direccion: null, preferencia: "llamada", limiteCredito: 3000, plazoDias: 15, etiquetas: ["ocasional"], isActive: true },
    { id: 4, nombre: "David Ortiz", telefono: "5544556677", correo: "d.ortiz@mail.com", direccion: "Av. Insurgentes 900, CDMX", preferencia: "whatsapp", limiteCredito: 10000, plazoDias: 30, etiquetas: ["corporativo", "deudor"], isActive: true },
    { id: 5, nombre: "Elena Ruiz", telefono: "5555667788", correo: null, direccion: null, preferencia: "whatsapp", limiteCredito: 3000, plazoDias: 15, etiquetas: ["frecuente"], isActive: true },
  ];

  const PROVEEDORES = [
    { id: 1, nombre: "Distribuidora MX Comp", contacto: "Roberto Díaz", condiciones: "Contado / 30 días", isActive: true },
    { id: 2, nombre: "Importadora IntelTec", contacto: "Sofía Mendoza", condiciones: "Crédito 15 días", isActive: true },
    { id: 3, nombre: "Mayorista Periféricos SA", contacto: "Jorge Lara", condiciones: "Contado", isActive: true },
  ];

  const ORDENES = [
    { id: 1, folio: "2026-0001", clienteId: 1, tipoEquipo: "laptop", marca: "Lenovo", modelo: "ThinkPad T470", serie: "PF1L1234", accesorios: "Cargador", falla: "No enciende, luce LED parpadeando", diagnostico: "", estado: "pendiente", retrasada: false, fechaPrometida: "2026-08-10", fechaEntrega: null, tecnicoId: 3, vendedorId: 2, firma: null, createdAt: "2026-08-03T10:00:00Z", historial: [ { estado: "pendiente", usuarioId: 2, fecha: "2026-08-03T10:00:00Z", nota: "Orden creada" } ] },
    { id: 2, folio: "2026-0002", clienteId: 2, tipoEquipo: "desktop", marca: "HP", modelo: "EliteDesk", serie: "HPX8890", accesorios: "", falla: "Reinicia solo al azar", diagnostico: "Sobrecalentamiento por pasta térmica seca", estado: "en_diagnostico", retrasada: false, fechaPrometida: "2026-08-08", fechaEntrega: null, tecnicoId: 3, vendedorId: 2, firma: null, createdAt: "2026-08-02T11:00:00Z", historial: [ { estado: "pendiente", usuarioId: 2, fecha: "2026-08-02T11:00:00Z", nota: "Orden creada" }, { estado: "en_diagnostico", usuarioId: 3, fecha: "2026-08-03T09:00:00Z", nota: "Diagnóstico iniciado" } ] },
    { id: 3, folio: "2026-0003", clienteId: 3, tipoEquipo: "laptop", marca: "Dell", modelo: "Inspiron 15", serie: "DL4455", accesorios: "Cargador, mouse", falla: "Teclado no responde", diagnostico: "Falla en conector de teclado", estado: "cotizado", retrasada: false, fechaPrometida: "2026-08-09", fechaEntrega: null, tecnicoId: 3, vendedorId: 2, firma: null, createdAt: "2026-08-01T12:00:00Z", historial: [ { estado: "pendiente", usuarioId: 2, fecha: "2026-08-01T12:00:00Z", nota: "Orden creada" }, { estado: "en_diagnostico", usuarioId: 3, fecha: "2026-08-01T14:00:00Z", nota: "Diagnóstico iniciado" }, { estado: "cotizado", usuarioId: 3, fecha: "2026-08-02T10:00:00Z", nota: "Cotización emitida" } ] },
    { id: 4, folio: "2026-0004", clienteId: 4, tipoEquipo: "desktop", marca: "Armada", modelo: "Gaming", serie: "AR7621", accesorios: "", falla: "Pantalla azul al iniciar juegos", diagnostico: "GPU con falla de memoria", estado: "en_reparacion", retrasada: true, fechaPrometida: "2026-08-04", fechaEntrega: null, tecnicoId: 3, vendedorId: 2, firma: null, createdAt: "2026-08-01T09:00:00Z", historial: [ { estado: "pendiente", usuarioId: 2, fecha: "2026-08-01T09:00:00Z", nota: "Orden creada" }, { estado: "en_diagnostico", usuarioId: 3, fecha: "2026-08-01T13:00:00Z", nota: "Diagnóstico iniciado" }, { estado: "cotizado", usuarioId: 3, fecha: "2026-08-02T09:00:00Z", nota: "Cotización emitida" }, { estado: "en_reparacion", usuarioId: 3, fecha: "2026-08-03T08:00:00Z", nota: "Reparación iniciada (retrasada)" } ] },
    { id: 5, folio: "2026-0005", clienteId: 5, tipoEquipo: "all_in_one", marca: "Apple", modelo: "iMac 21.5", serie: "IMC3321", accesorios: "Cable de poder", falla: "Disco lento, actualización de sistema", diagnostico: "SSD degradado, requiere cambio", estado: "listo", retrasada: false, fechaPrometida: "2026-08-06", fechaEntrega: null, tecnicoId: 3, vendedorId: 2, firma: null, createdAt: "2026-07-30T10:00:00Z", historial: [ { estado: "pendiente", usuarioId: 2, fecha: "2026-07-30T10:00:00Z", nota: "Orden creada" }, { estado: "en_diagnostico", usuarioId: 3, fecha: "2026-07-30T16:00:00Z", nota: "Diagnóstico iniciado" }, { estado: "cotizado", usuarioId: 3, fecha: "2026-07-31T09:00:00Z", nota: "Cotización emitida" }, { estado: "en_reparacion", usuarioId: 3, fecha: "2026-07-31T11:00:00Z", nota: "Reparación iniciada" }, { estado: "listo", usuarioId: 3, fecha: "2026-08-02T18:00:00Z", nota: "Equipo listo para entrega" } ] },
    { id: 6, folio: "2026-0006", clienteId: 2, tipoEquipo: "periferico", marca: "Logitech", modelo: "Mouse MX", serie: "LTX0012", accesorios: "", falla: "Click doble defectuoso", diagnostico: "Microswitch gastado", estado: "entregado", retrasada: false, fechaPrometida: "2026-08-02", fechaEntrega: "2026-08-02", tecnicoId: 3, vendedorId: 2, firma: "data:image/png;base64,iVBORw0KGgo=", createdAt: "2026-07-29T10:00:00Z", historial: [ { estado: "pendiente", usuarioId: 2, fecha: "2026-07-29T10:00:00Z", nota: "Orden creada" }, { estado: "en_diagnostico", usuarioId: 3, fecha: "2026-07-29T12:00:00Z", nota: "Diagnóstico iniciado" }, { estado: "cotizado", usuarioId: 3, fecha: "2026-07-29T14:00:00Z", nota: "Cotización emitida" }, { estado: "en_reparacion", usuarioId: 3, fecha: "2026-07-30T09:00:00Z", nota: "Reparación iniciada" }, { estado: "listo", usuarioId: 3, fecha: "2026-07-31T10:00:00Z", nota: "Equipo listo" }, { estado: "entregado", usuarioId: 2, fecha: "2026-08-02T11:00:00Z", nota: "Entregado, cobrado y firmado" } ] },
  ];

  const COTIZACIONES = [
    { id: 1, ordenId: 3, folio: "COT-0001", estado: "emitida", vigenciaHasta: "2026-08-09", subtotal: 1180, iva: 188.8, total: 1368.8, lineas: [ { tipo: "refaccion", nombre: "Teclado interno Dell Inspiron", productoId: null, cantidad: 1, precio: 800 }, { tipo: "mano_obra", descripcion: "Reemplazo de teclado", horas: 1, tarifa: 380, precio: 380 } ] },
    { id: 2, ordenId: 4, folio: "COT-0002", estado: "emitida", vigenciaHasta: "2026-08-10", subtotal: 6990, iva: 1118.4, total: 8108.4, lineas: [ { tipo: "refaccion", nombre: "Tarjeta gráfica RTX 4060 8GB", productoId: 5, cantidad: 1, precio: 6990 }, { tipo: "mano_obra", descripcion: "Sustitución de GPU", horas: 1, tarifa: 380, precio: 380 } ] },
    { id: 3, ordenId: 5, folio: "COT-0003", estado: "convertida", vigenciaHasta: "2026-08-06", subtotal: 1770, iva: 283.2, total: 2053.2, lineas: [ { tipo: "refaccion", nombre: "SSD NVMe 1TB Gen4", productoId: 4, cantidad: 1, precio: 1390 }, { tipo: "mano_obra", descripcion: "Migración de sistema", horas: 1, tarifa: 380, precio: 380 } ] },
  ];

  const VENTAS = [
    { id: 1, folio: "VEN-0001", clienteId: 1, vendedorId: 2, ordenId: null, fecha: "2026-08-03T10:30:00Z", subtotal: 3180, iva: 508.8, total: 3688.8, descuento: 0, motivoDescuento: null, tipoPago: "contado", metodoPago: "efectivo", montoRecibido: 4000, estado: "completada", lineas: [ { nombre: "Procesador Intel i5-12400", cantidad: 1, precio: 3180 } ] },
    { id: 2, folio: "VEN-0002", clienteId: 3, vendedorId: 2, ordenId: null, fecha: "2026-08-03T11:15:00Z", subtotal: 1700, iva: 272, total: 1972, descuento: 0, motivoDescuento: null, tipoPago: "contado", metodoPago: "tarjeta_debito", montoRecibido: 1972, estado: "completada", lineas: [ { nombre: "Teclado mecánico RGB", cantidad: 2, precio: 850 } ] },
    { id: 3, folio: "VEN-0003", clienteId: 4, vendedorId: 2, ordenId: null, fecha: "2026-08-03T12:00:00Z", subtotal: 690, iva: 110.4, total: 800.4, descuento: 0, motivoDescuento: null, tipoPago: "credito", metodoPago: null, montoRecibido: 0, estado: "credito_pendiente", fechaVencimiento: "2026-08-18", plazoDias: 15, lineas: [ { nombre: "Mouse gamer 16000 DPI", cantidad: 1, precio: 690 } ] },
  ];

  const PAGOS = [
    { id: 1, ventaId: 3, monto: 200, metodo: "efectivo", fecha: "2026-08-03T12:05:00Z" },
  ];

  const COMPRAS = [
    { id: 1, folio: "COM-0001", proveedorId: 1, estado: "recibida", fecha: "2026-07-28", total: 18500, fechaVencimiento: "2026-08-12", lineas: [ { productoId: 1, cantidad: 5, precio: 2800 }, { productoId: 3, cantidad: 5, precio: 900 } ] },
    { id: 2, folio: "COM-0002", proveedorId: 2, estado: "enviada", fecha: "2026-08-02", total: 12500, fechaVencimiento: null, lineas: [ { productoId: 5, cantidad: 2, precio: 6200 } ] },
  ];

  const MOVIMIENTOS = [
    { id: 1, productoId: 1, tipo: "ENTRADA", cantidad: 5, fecha: "2026-07-28T09:00:00Z", usuario: "María González", motivo: "Recepción COM-0001" },
    { id: 2, productoId: 1, tipo: "SALIDA_VENTA", cantidad: -1, fecha: "2026-08-03T10:30:00Z", usuario: "Carlos Pérez", motivo: "Venta VEN-0001" },
    { id: 3, productoId: 10, tipo: "SALIDA_VENTA", cantidad: -1, fecha: "2026-08-03T12:00:00Z", usuario: "Carlos Pérez", motivo: "Venta VEN-0003" },
    { id: 4, productoId: 5, tipo: "RESERVA", cantidad: -1, fecha: "2026-08-03T13:00:00Z", usuario: "Carlos Pérez", motivo: "Aprobación COT-0002 (orden 2026-0004)" },
  ];

  const PLANTILLAS = [
    { tipo: "NOT-01", nombre: "Retraso de orden", asunto: "Tu equipo se retrasó", cuerpo: "Hola {cliente}, tu orden {folio} prometida para {fecha} se retrasó. Te contactamos para darte la nueva fecha. Lamento el inconveniente." },
    { tipo: "NOT-02", nombre: "Equipo listo", asunto: "Tu equipo está listo", cuerpo: "Hola {cliente}, tu orden {folio} ya está lista. Pasa a recogerla a la tienda." },
    { tipo: "NOT-03", nombre: "Cotización lista", asunto: "Cotización lista", cuerpo: "Hola {cliente}, la cotización {cotizacion} de tu orden {folio} está lista por {total}. Aprobación presencial en tienda." },
    { tipo: "NOT-04", nombre: "Garantía próxima", asunto: "Tu garantía está por vencer", cuerpo: "Hola {cliente}, la garantía de tu servicio vencerá el {fecha}. Refacciones en garantía." },
  ];

  const CONFIG = {
    iva: 16,
    toleranciaRetraso: 1,
    limiteCreditoDefault: 3000,
    plazoCreditoDefault: 15,
    diasGarantiaProducto: 30,
    diasGarantiaServicio: 30,
    diasGarantiaUsado: 15,
  };

  const CAJA = { id: 1, usuarioId: 2, fecha: "2026-08-03", estado: "abierta", apertura: "2026-08-03T09:00:00Z", cierre: null, efectivoFisico: null, diferencia: null };

  return { USERS, PRODUCTS, BOM, CLIENTES, PROVEEDORES, ORDENES, COTIZACIONES, VENTAS, PAGOS, COMPRAS, MOVIMIENTOS, PLANTILLAS, CONFIG, CAJA };
})();

/* ---------- Helpers ---------- */
function fmtMXN(n) {
  return "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) { return Number(n || 0).toLocaleString("es-MX"); }
function fmtFecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtFechaHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
function addDias(iso, dias) {
  const d = new Date(iso);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
function calcMoney(neto, descuento = 0) {
  const base = Math.max(0, neto - descuento);
  const iva = base * (DB.CONFIG.iva / 100);
  return { subtotal: neto, descuento, iva, total: base + iva };
}
function getProducto(id) { return DB.PRODUCTS.find((p) => p.id === id); }
function getCliente(id) { return DB.CLIENTES.find((c) => c.id === id); }
function getUsuario(id) { return DB.USERS.find((u) => u.id === id); }
function getProveedor(id) { return DB.PROVEEDORES.find((p) => p.id === id); }
function getOrden(id) { return DB.ORDENES.find((o) => o.id === id); }
function getCategoriaNombre(tipo) {
  const map = { componente: "Componente", periferico: "Periférico", equipo_completo: "Equipo completo", refaccion: "Refacción", usado: "Usado" };
  return map[tipo] || tipo;
}
function saldoCliente(clienteId) {
  const ventas = DB.VENTAS.filter((v) => v.clienteId === clienteId && (v.estado === "credito_pendiente" || v.estado === "completada") && v.tipoPago === "credito");
  let adeudo = 0;
  for (const v of ventas) {
    const pagado = DB.PAGOS.filter((p) => p.ventaId === v.id).reduce((a, p) => a + p.monto, 0);
    adeudo += Math.max(0, v.total - pagado);
  }
  return adeudo;
}
function estadoCxC(venta) {
  const pagado = DB.PAGOS.filter((p) => p.ventaId === venta.id).reduce((a, p) => a + p.monto, 0);
  const saldo = Math.max(0, venta.total - pagado);
  if (saldo <= 0) return { estado: "pagado", saldo };
  const vencida = venta.fechaVencimiento && venta.fechaVencimiento < new Date().toISOString().slice(0, 10);
  return { estado: vencida ? "vencido" : "vigente", saldo };
}
function folioRetraso(orden) {
  if (orden.estado === "entregado" || orden.estado === "cancelado") return false;
  const limite = addDias(orden.fechaPrometida, DB.CONFIG.toleranciaRetraso);
  return limite < new Date().toISOString().slice(0, 10);
}
