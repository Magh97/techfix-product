import { query } from "../../shared/db";

export interface InventarioRow {
  id: number;
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  categoria: string;
  stock: number;
  stock_minimo: number;
  precio_compra: string;
  precio_venta: string;
  valoracion_costo: string;
  low_stock: boolean;
}

export interface VentaGrupoRow {
  grupo: string;
  ventas: number;
  total: string;
}

export interface ServicioGrupoRow {
  grupo: string;
  ordenes: number;
}

export interface ResumenServiciosRow {
  total: number;
  en_proceso: number;
  entregadas: number;
  canceladas: number;
  retrasadas: number;
}

const ESTADOS_VENTA_VALIDOS = "('completada', 'credito_pendiente')";

export function reporteInventario() {
  return query<InventarioRow>(
    `SELECT p.id, p.sku, p.codigo_barras, p.nombre, p.marca, p.modelo,
            c.tipo AS categoria, p.stock, p.stock_minimo,
            p.precio_compra, p.precio_venta,
            (p.stock * p.precio_compra)::numeric AS valoracion_costo,
            (p.stock <= p.stock_minimo) AS low_stock
     FROM productos p
     JOIN categorias c ON c.id = p.categoria_id
     WHERE p.is_active = true
     ORDER BY c.tipo, p.nombre`
  ).then((r) => r.rows);
}

function ventaFilters(f: { desde?: string; hasta?: string }): { where: string[]; params: unknown[] } {
  const where: string[] = [`v.estado IN ${ESTADOS_VENTA_VALIDOS}`];
  const params: unknown[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`v.created_at >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`v.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  return { where, params };
}

const GRUPOS_VENTA = {
  dia: {
    select: "DATE(v.created_at)::text AS grupo, COUNT(*)::int AS ventas, COALESCE(SUM(v.total),0)::numeric AS total",
    from: "FROM ventas v",
    order: "ORDER BY 1",
  },
  vendedor: {
    select: "u.nombre AS grupo, COUNT(*)::int AS ventas, COALESCE(SUM(v.total),0)::numeric AS total",
    from: "FROM ventas v JOIN usuarios u ON u.id = v.vendedor_id",
    order: "ORDER BY 3 DESC",
  },
  metodo: {
    select: "COALESCE(v.metodo_pago::text, 'sin_metodo') AS grupo, COUNT(*)::int AS ventas, COALESCE(SUM(v.total),0)::numeric AS total",
    from: "FROM ventas v",
    order: "ORDER BY 3 DESC",
  },
  producto: {
    select:
      "COALESCE(p.nombre, 'Servicio') AS grupo, COUNT(*)::int AS ventas, COALESCE(SUM(dv.cantidad),0)::int AS unidades, COALESCE(SUM(dv.precio_neto * dv.cantidad),0)::numeric AS total",
    from: "FROM ventas v JOIN detalle_venta dv ON dv.venta_id = v.id LEFT JOIN productos p ON p.id = dv.producto_id",
    order: "ORDER BY 4 DESC",
  },
} as const;

export function reporteVentas(f: { desde?: string; hasta?: string; agrupar: keyof typeof GRUPOS_VENTA }) {
  const g = GRUPOS_VENTA[f.agrupar];
  const { where, params } = ventaFilters(f);
  return query<VentaGrupoRow>(
    `SELECT ${g.select} ${g.from} WHERE ${where.join(" AND ")} GROUP BY 1 ${g.order}`,
    params
  ).then((r) => r.rows);
}

export function resumenServicios(f: { desde?: string; hasta?: string; estado?: string; tecnicoId?: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`created_at >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`estado = $${params.length}`);
  }
  if (f.tecnicoId) {
    params.push(f.tecnicoId);
    where.push(`tecnico_id = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query<ResumenServiciosRow>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE estado NOT IN ('entregado','cancelado'))::int AS en_proceso,
            COUNT(*) FILTER (WHERE estado = 'entregado')::int AS entregadas,
            COUNT(*) FILTER (WHERE estado = 'cancelado')::int AS canceladas,
            COUNT(*) FILTER (WHERE retrasada = true)::int AS retrasadas
     FROM ordenes_servicio ${whereSql}`,
    params
  ).then((r) => r.rows[0]);
}

export function serviciosPorEstado(f: { desde?: string; hasta?: string; estado?: string; tecnicoId?: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`created_at >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`estado = $${params.length}`);
  }
  if (f.tecnicoId) {
    params.push(f.tecnicoId);
    where.push(`tecnico_id = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query<ServicioGrupoRow>(
    `SELECT estado::text AS grupo, COUNT(*)::int AS ordenes FROM ordenes_servicio ${whereSql} GROUP BY 1 ORDER BY 1`,
    params
  ).then((r) => r.rows);
}

export function serviciosPorTecnico(f: { desde?: string; hasta?: string; tecnicoId?: number }) {
  const where: string[] = ["o.tecnico_id IS NOT NULL"];
  const params: unknown[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`o.created_at >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`o.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (f.tecnicoId) {
    params.push(f.tecnicoId);
    where.push(`o.tecnico_id = $${params.length}`);
  }
  return query<ServicioGrupoRow>(
    `SELECT u.nombre AS grupo, COUNT(*)::int AS ordenes
     FROM ordenes_servicio o JOIN usuarios u ON u.id = o.tecnico_id
     WHERE ${where.join(" AND ")} GROUP BY 1 ORDER BY 2 DESC`,
    params
  ).then((r) => r.rows);
}

export function serviciosPorTipoEquipo(f: { desde?: string; hasta?: string }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`created_at >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query<ServicioGrupoRow>(
    `SELECT tipo_equipo::text AS grupo, COUNT(*)::int AS ordenes FROM ordenes_servicio ${whereSql} GROUP BY 1 ORDER BY 2 DESC`,
    params
  ).then((r) => r.rows);
}

export function tiempoPromedioReparacion(f: { desde?: string; hasta?: string }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`d.t >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`d.t < ($${params.length}::date + INTERVAL '1 day')`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query<{ promedio_dias: string }>(
    `WITH diag AS (SELECT orden_id, MIN(created_at) AS t FROM historial_orden WHERE estado = 'en_diagnostico' GROUP BY orden_id),
           listo AS (SELECT orden_id, MIN(created_at) AS t FROM historial_orden WHERE estado = 'listo' GROUP BY orden_id)
     SELECT ROUND(AVG(EXTRACT(EPOCH FROM (l.t - d.t)) / 86400.0)::numeric, 2) AS promedio_dias
     FROM diag d JOIN listo l ON l.orden_id = d.orden_id ${whereSql}`,
    params
  ).then((r) => Number(r.rows[0]?.promedio_dias ?? 0));
}

export interface ServicioDetalleRow {
  folio: string;
  cliente: string;
  tipo_equipo: string;
  marca: string | null;
  modelo: string | null;
  falla_reportada: string;
  estado: string;
  retrasada: boolean;
  tecnico: string | null;
  fecha_prometida: string;
  fecha_entrega: string | null;
}

export function serviciosDetalle(f: { desde?: string; hasta?: string; estado?: string; tecnicoId?: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    params.push(f.desde);
    where.push(`o.created_at >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    where.push(`o.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`o.estado = $${params.length}`);
  }
  if (f.tecnicoId) {
    params.push(f.tecnicoId);
    where.push(`o.tecnico_id = $${params.length}`);
  }
  return query<ServicioDetalleRow>(
    `SELECT o.folio, cl.nombre AS cliente, o.tipo_equipo::text AS tipo_equipo, o.marca, o.modelo,
            o.falla_reportada, o.estado::text AS estado, o.retrasada, u.nombre AS tecnico,
            o.fecha_prometida, o.fecha_entrega
     FROM ordenes_servicio o
     JOIN clientes cl ON cl.id = o.cliente_id
     LEFT JOIN usuarios u ON u.id = o.tecnico_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY o.id DESC`,
    params
  ).then((r) => r.rows);
}
