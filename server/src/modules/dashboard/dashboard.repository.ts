import { query } from "../../shared/db";

export function ventasHoy(fecha: string) {
  return query<{ cantidad: number; total: string }>(
    `SELECT COUNT(*)::int AS cantidad, COALESCE(SUM(total),0)::numeric AS total
     FROM ventas WHERE created_at::date = $1 AND estado IN ('completada','credito_pendiente')`,
    [fecha]
  ).then((r) => r.rows[0]);
}

export function resumenOrdenes() {
  return query<{ activas: number; retrasadas: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE estado NOT IN ('entregado','cancelado'))::int AS activas,
       COUNT(*) FILTER (WHERE retrasada = true AND estado NOT IN ('entregado','cancelado'))::int AS retrasadas
     FROM ordenes_servicio`
  ).then((r) => r.rows[0]);
}

export function resumenInventario() {
  return query<{ stock_bajo: number; total_productos: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE is_active = true AND stock <= stock_minimo)::int AS stock_bajo,
       COUNT(*) FILTER (WHERE is_active = true)::int AS total_productos
     FROM productos`
  ).then((r) => r.rows[0]);
}

export function cajaAbierta(usuarioId: number, fecha: string) {
  return query<{ id: number }>(
    "SELECT id FROM cajas WHERE usuario_id = $1 AND fecha = $2 AND estado IN ('abierta','reabierta') LIMIT 1",
    [usuarioId, fecha]
  ).then((r) => r.rows[0] !== undefined);
}

export function topProductos(limit = 5) {
  return query<{ nombre: string; unidades: number; ingreso: string }>(
    `SELECT COALESCE(p.nombre, dv.descripcion_servicio) AS nombre,
            SUM(dv.cantidad)::int AS unidades,
            COALESCE(SUM(dv.precio_neto),0)::numeric AS ingreso
     FROM detalle_venta dv
     JOIN ventas v ON v.id = dv.venta_id
     LEFT JOIN productos p ON p.id = dv.producto_id
     WHERE v.estado IN ('completada','credito_pendiente')
     GROUP BY dv.producto_id, dv.descripcion_servicio, p.nombre
     ORDER BY unidades DESC
     LIMIT $1`,
    [limit]
  ).then((r) => r.rows);
}

export function topDeudores(limit = 5) {
  return query<{ cliente_id: number; cliente_nombre: string; saldo_total: string }>(
    `SELECT x.cliente_id, x.cliente_nombre, SUM(x.saldo)::numeric AS saldo_total
     FROM (
       SELECT v.id, v.cliente_id, c.nombre AS cliente_nombre,
              (v.total - COALESCE(SUM(p.monto),0)) AS saldo
       FROM ventas v
       JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN pagos p ON p.venta_id = v.id
       WHERE v.tipo_pago = 'credito' AND v.estado IN ('completada','credito_pendiente','devuelta')
       GROUP BY v.id, v.cliente_id, c.nombre, v.total
     ) x
     WHERE x.saldo > 0
     GROUP BY x.cliente_id, x.cliente_nombre
     ORDER BY saldo_total DESC
     LIMIT $1`,
    [limit]
  ).then((r) => r.rows);
}
