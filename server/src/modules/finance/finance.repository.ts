import { query } from "../../shared/db";
import type { PoolClient } from "pg";

export interface CajaRow {
  id: number;
  usuario_id: number;
  fecha: string;
  estado: "abierta" | "cerrada" | "reabierta";
  efectivo_fisico: string | null;
  diferencia: string | null;
  apertura: string;
  cierre: string | null;
}

export function findCajaAbiertaUsuario(usuarioId: number, fecha: string) {
  return query<CajaRow>(
    "SELECT * FROM cajas WHERE usuario_id = $1 AND fecha = $2 AND estado IN ('abierta','reabierta') ORDER BY id DESC LIMIT 1",
    [usuarioId, fecha]
  ).then((r) => r.rows[0]);
}

export function findCajaUsuarioDia(usuarioId: number, fecha: string) {
  return query<CajaRow>("SELECT * FROM cajas WHERE usuario_id = $1 AND fecha = $2 ORDER BY id DESC LIMIT 1", [
    usuarioId,
    fecha,
  ]).then((r) => r.rows[0]);
}

export function insertCaja(usuarioId: number, fecha: string) {
  return query<CajaRow>(
    "INSERT INTO cajas (usuario_id, fecha) VALUES ($1,$2) RETURNING *",
    [usuarioId, fecha]
  ).then((r) => r.rows[0]);
}

export function reabrirCaja(id: number) {
  return query<CajaRow>(
    "UPDATE cajas SET estado = 'reabierta', cierre = NULL, efectivo_fisico = NULL, diferencia = NULL, apertura = NOW() WHERE id = $1 RETURNING *",
    [id]
  ).then((r) => r.rows[0]);
}

export function cerrarCaja(id: number, efectivoFisico: number, diferencia: number) {
  return query<CajaRow>(
    "UPDATE cajas SET estado = 'cerrada', efectivo_fisico = $2, diferencia = $3, cierre = NOW() WHERE id = $1 RETURNING *",
    [id, efectivoFisico, diferencia]
  ).then((r) => r.rows[0]);
}

export function sumPartesDePago(cajaId: number) {
  return query<{ total: string }>(
    `SELECT COALESCE(SUM(parte_de_pago),0)::numeric AS total FROM ventas
     WHERE caja_id = $1 AND estado IN ('completada','credito_pendiente')`,
    [cajaId]
  ).then((r) => r.rows[0]);
}

export function sumNotasCredito(cajaId: number) {
  return query<{ total: string }>(
    `SELECT COALESCE(SUM(nota_credito),0)::numeric AS total FROM ventas
     WHERE caja_id = $1 AND estado IN ('completada','credito_pendiente')`,
    [cajaId]
  ).then((r) => r.rows[0]);
}

export function sumAbonosPorMetodo(cajaId: number) {
  return query<{ metodo: string; total: string }>(
    `SELECT metodo, COALESCE(SUM(monto),0)::numeric AS total FROM pagos WHERE caja_id = $1 GROUP BY metodo`,
    [cajaId]
  ).then((r) => r.rows);
}

export function sumEgresosPorMetodo(cajaId: number) {
  return query<{ metodo: string; total: string }>(
    `SELECT metodo, COALESCE(SUM(monto),0)::numeric AS total FROM egresos WHERE caja_id = $1 GROUP BY metodo`,
    [cajaId]
  ).then((r) => r.rows);
}

export function listVentasCaja(cajaId: number) {
  return query<{ id: number; folio: string; total: string; metodo_pago: string | null; created_at: string }>(
    "SELECT id, folio, total, metodo_pago, created_at FROM ventas WHERE caja_id = $1 ORDER BY id",
    [cajaId]
  ).then((r) => r.rows);
}

export function listAbonosCaja(cajaId: number) {
  return query<{ id: number; venta_id: number; monto: string; metodo: string; created_at: string }>(
    "SELECT id, venta_id, monto, metodo, created_at FROM pagos WHERE caja_id = $1 ORDER BY id",
    [cajaId]
  ).then((r) => r.rows);
}

export function listEgresosCaja(cajaId: number) {
  return query<{ id: number; concepto: string; categoria: string; monto: string; metodo: string; created_at: string }>(
    "SELECT id, concepto, categoria, monto, metodo, created_at FROM egresos WHERE caja_id = $1 ORDER BY id",
    [cajaId]
  ).then((r) => r.rows);
}

export function insertEgreso(input: {
  concepto: string;
  categoria: string;
  monto: number;
  metodo: string;
  usuarioId: number;
  cajaId: number | null;
}) {
  return query(
    "INSERT INTO egresos (concepto, categoria, monto, metodo, usuario_id, caja_id) VALUES ($1,$2,$3,$4,$5,$6)",
    [input.concepto, input.categoria, input.monto, input.metodo, input.usuarioId, input.cajaId]
  );
}

export function insertEgresoClient(
  client: PoolClient,
  input: {
    concepto: string;
    categoria: string;
    monto: number;
    metodo: string;
    usuarioId: number;
    cajaId: number | null;
  }
) {
  return client.query(
    "INSERT INTO egresos (concepto, categoria, monto, metodo, usuario_id, caja_id) VALUES ($1,$2,$3,$4,$5,$6)",
    [input.concepto, input.categoria, input.monto, input.metodo, input.usuarioId, input.cajaId]
  );
}

export function listEgresos(f: { desde?: string; hasta?: string; limit: number; offset: number }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`created_at::date >= $${params.length}`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`created_at::date <= $${params.length}`);
  }
  params.push(f.limit, f.offset);
  const sql = `SELECT * FROM egresos${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  return query<{ id: number; concepto: string; categoria: string; monto: string; metodo: string; created_at: string }>(sql, params).then((r) => r.rows);
}

export function listVentasCreditoGlobal() {
  return query<{
    id: number;
    folio: string;
    cliente_id: number;
    cliente_nombre: string;
    total: string;
    fecha_vencimiento: string | null;
  }>(
    `SELECT v.id, v.folio, v.cliente_id, c.nombre AS cliente_nombre, v.total, v.fecha_vencimiento
     FROM ventas v JOIN clientes c ON c.id = v.cliente_id
     WHERE v.tipo_pago = 'credito' AND v.estado IN ('completada','credito_pendiente')
     ORDER BY v.id DESC LIMIT 100`,
    []
  ).then((r) => r.rows);
}

export function sumPagosVenta(ventaId: number) {
  return query<{ s: string }>("SELECT COALESCE(SUM(monto),0)::numeric AS s FROM pagos WHERE venta_id = $1", [ventaId]).then(
    (r) => Number(r.rows[0]?.s ?? 0)
  );
}
