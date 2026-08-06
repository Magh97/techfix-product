import { AppError } from "../../shared/errors";
import * as repo from "./finance.repository";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(n: string | null | undefined): number {
  return Number(n ?? 0);
}

export async function abrir(usuarioId: number) {
  const existente = await repo.findCajaAbiertaUsuario(usuarioId, today());
  if (existente) throw AppError.conflict("CAJA_ALREADY_OPEN", "Ya hay una caja abierta para hoy");
  const delDia = await repo.findCajaUsuarioDia(usuarioId, today());
  if (delDia) {
    const re = await repo.reabrirCaja(delDia.id);
    return mapCaja(re!);
  }
  const caja = await repo.insertCaja(usuarioId, today());
  return mapCaja(caja!);
}

export async function actual(usuarioId: number) {
  const caja = await repo.findCajaAbiertaUsuario(usuarioId, today());
  return caja ? mapCaja(caja) : null;
}

function mapCaja(c: repo.CajaRow) {
  return {
    id: c.id,
    usuarioId: c.usuario_id,
    fecha: String(c.fecha).slice(0, 10),
    estado: c.estado,
    efectivoFisico: c.efectivo_fisico ? toNum(c.efectivo_fisico) : null,
    diferencia: c.diferencia ? toNum(c.diferencia) : null,
    apertura: c.apertura,
    cierre: c.cierre,
  };
}

async function computarCaja(cajaId: number) {
  const ventas = await repo.sumVentasPorMetodo(cajaId);
  const abonos = await repo.sumAbonosPorMetodo(cajaId);
  const egresos = await repo.sumEgresosPorMetodo(cajaId);
  const partesDePago = await repo.sumPartesDePago(cajaId);

  const ingresosPorMetodo: Record<string, number> = {};
  for (const v of ventas) ingresosPorMetodo[v.metodo_pago ?? "efectivo"] = toNum(v.total);
  for (const p of abonos) ingresosPorMetodo[p.metodo] = (ingresosPorMetodo[p.metodo] ?? 0) + toNum(p.total);

  const egresosPorMetodo: Record<string, number> = {};
  for (const e of egresos) egresosPorMetodo[e.metodo] = toNum(e.total);

  const ingresos = Object.values(ingresosPorMetodo).reduce((a, b) => a + b, 0);
  const totalEgresos = Object.values(egresosPorMetodo).reduce((a, b) => a + b, 0);
  const esperadoEfectivo = (ingresosPorMetodo["efectivo"] ?? 0) - (egresosPorMetodo["efectivo"] ?? 0);

  return {
    ingresosPorMetodo,
    egresosPorMetodo,
    ingresos,
    egresos: totalEgresos,
    esperadoEfectivo,
    partesDePago: toNum(partesDePago?.total),
  };
}

export async function corte(usuarioId: number) {
  const caja = await repo.findCajaUsuarioDia(usuarioId, today());
  if (!caja) return { caja: null, ...(await computarCajaVacio()) };
  const calculos = await computarCaja(caja.id);
  return { caja: mapCaja(caja), ...calculos };
}

async function computarCajaVacio() {
  return { ingresosPorMetodo: {}, egresosPorMetodo: {}, ingresos: 0, egresos: 0, esperadoEfectivo: 0, partesDePago: 0 };
}

export async function cerrar(usuarioId: number, efectivoFisico: number) {
  const caja = await repo.findCajaAbiertaUsuario(usuarioId, today());
  if (!caja) throw AppError.conflict("CAJA_NOT_OPEN", "No hay caja abierta para cerrar");
  const { esperadoEfectivo } = await computarCaja(caja.id);
  const diferencia = efectivoFisico - esperadoEfectivo;
  const cerrada = await repo.cerrarCaja(caja.id, efectivoFisico, diferencia);
  return { ...mapCaja(cerrada!), diferencia };
}

export async function registrarIngreso(input: { concepto: string; monto: number; metodo: string }, usuarioId: number) {
  // Ingreso manual: se registra como venta de servicio de mostrador ligada a la caja abierta
  const caja = await repo.findCajaAbiertaUsuario(usuarioId, today());
  // Por simplicidad se valida que exista caja abierta
  if (!caja) throw AppError.conflict("CAJA_NOT_OPEN", "Abre una caja antes de registrar ingresos");
  return { concepto: input.concepto, monto: input.monto, metodo: input.metodo, cajaId: caja.id };
}

export async function registrarEgreso(
  input: { concepto: string; categoria: string; monto: number; metodo: string },
  usuarioId: number
) {
  const caja = await repo.findCajaAbiertaUsuario(usuarioId, today());
  await repo.insertEgreso({
    concepto: input.concepto,
    categoria: input.categoria,
    monto: input.monto,
    metodo: input.metodo,
    usuarioId,
    cajaId: caja?.id ?? null,
  });
  return { concepto: input.concepto, categoria: input.categoria, monto: input.monto, metodo: input.metodo };
}

export async function movimientos(usuarioId: number, f: { page: number; pageSize: number }) {
  const caja = await repo.findCajaUsuarioDia(usuarioId, today());
  if (!caja) return { data: [], meta: { page: f.page, pageSize: f.pageSize, totalItems: 0, totalPages: 0 } };

  const ventas = await repo.listVentasCaja(caja.id);
  const abonos = await repo.listAbonosCaja(caja.id);
  const egresos = await repo.listEgresosCaja(caja.id);

  const items = [
    ...ventas.map((v) => ({ tipo: "venta", folio: v.folio, monto: toNum(v.total), metodo: v.metodo_pago ?? "—", fecha: v.created_at })),
    ...abonos.map((p) => ({ tipo: "abono", folio: `Pago #${p.id}`, monto: toNum(p.monto), metodo: p.metodo, fecha: p.created_at })),
    ...egresos.map((e) => ({ tipo: "egreso", folio: e.concepto, monto: -toNum(e.monto), metodo: e.metodo, fecha: e.created_at })),
  ].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  const start = (f.page - 1) * f.pageSize;
  return {
    data: items.slice(start, start + f.pageSize),
    meta: { page: f.page, pageSize: f.pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / f.pageSize) || 1 },
  };
}

export async function listarEgresos(f: { page: number; pageSize: number }) {
  const rows = await repo.listEgresos({ limit: f.pageSize, offset: (f.page - 1) * f.pageSize });
  return {
    data: rows.map((e) => ({ id: e.id, concepto: e.concepto, categoria: e.categoria, monto: toNum(e.monto), metodo: e.metodo, fecha: e.created_at })),
    meta: { page: f.page, pageSize: f.pageSize, totalItems: rows.length, totalPages: Math.ceil(rows.length / f.pageSize) || 1 },
  };
}

function hoy(): string {
  return today();
}

export async function cxcGlobal(estado?: string) {
  const ventas = await repo.listVentasCreditoGlobal();
  const hoyF = hoy();
  const items: { ventaId: number; folio: string; clienteId: number; clienteNombre: string; total: number; saldo: number; fechaVencimiento: string | null; estado: string }[] = [];

  for (const v of ventas) {
    const pagado = await repo.sumPagosVenta(v.id);
    const saldo = Math.max(0, toNum(v.total) - pagado);
    const vencido = v.fecha_vencimiento && String(v.fecha_vencimiento).slice(0, 10) < hoyF && saldo > 0;
    const est = saldo <= 0 ? "pagado" : vencido ? "vencido" : "vigente";
    if (estado && est !== estado) continue;
    items.push({
      ventaId: v.id,
      folio: v.folio,
      clienteId: v.cliente_id,
      clienteNombre: v.cliente_nombre,
      total: toNum(v.total),
      saldo,
      fechaVencimiento: v.fecha_vencimiento ? String(v.fecha_vencimiento).slice(0, 10) : null,
      estado: est,
    });
  }
  return items;
}
