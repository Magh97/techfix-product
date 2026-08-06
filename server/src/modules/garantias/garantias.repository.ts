import type { PoolClient } from "pg";
import { query } from "../../shared/db";

export interface GarantiaRow {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  orden_folio: string | null;
  venta_folio: string | null;
  tipo: string;
  inicio: string;
  fin: string;
  created_at: string;
}

const SELECT = `
  SELECT g.*, c.nombre AS cliente_nombre, o.folio AS orden_folio, v.folio AS venta_folio
  FROM garantias g
  JOIN clientes c ON c.id = g.cliente_id
  LEFT JOIN ordenes_servicio o ON o.id = g.orden_id
  LEFT JOIN ventas v ON v.id = g.venta_id
`;

function whereEstado(estado?: string): string {
  if (estado === "vigente") return `g.fin >= CURRENT_DATE AND g.fin > (CURRENT_DATE + 3)`;
  if (estado === "por_vencer") return `g.fin >= CURRENT_DATE AND g.fin <= (CURRENT_DATE + 3)`;
  if (estado === "vencida") return `g.fin < CURRENT_DATE`;
  return "";
}

export function listGarantias(f: { clienteId?: number; estado?: string; limit: number; offset: number }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.clienteId) {
    params.push(f.clienteId);
    where.push(`g.cliente_id = $${params.length}`);
  }
  const est = whereEstado(f.estado);
  if (est) where.push(est);
  params.push(f.limit, f.offset);
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  return query<GarantiaRow>(
    `${SELECT}${whereSql} ORDER BY g.fin ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countGarantias(f: { clienteId?: number; estado?: string }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.clienteId) {
    params.push(f.clienteId);
    where.push(`g.cliente_id = $${params.length}`);
  }
  const est = whereEstado(f.estado);
  if (est) where.push(est);
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  return query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM garantias g${whereSql}`,
    params
  ).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function listClienteGarantias(clienteId: number) {
  return query<GarantiaRow>(`${SELECT} WHERE g.cliente_id = $1 ORDER BY g.fin ASC`, [clienteId]).then((r) => r.rows);
}

// NOT-04: garantías que vencen en los próximos 3 días
export function findGarantiasPorVencer() {
  return query<GarantiaRow>(
    `${SELECT} WHERE g.fin >= CURRENT_DATE AND g.fin <= (CURRENT_DATE + 3) ORDER BY g.fin ASC`
  ).then((r) => r.rows);
}

/* --- Garantía por venta de producto (US-GAR-venta) --- */

export function insertGarantiaVenta(
  client: PoolClient,
  data: { ventaId: number; clienteId: number; tipo: string; inicio: string; fin: string }
) {
  return client.query(
    `INSERT INTO garantias (venta_id, cliente_id, tipo, inicio, fin) VALUES ($1,$2,$3,$4,$5)`,
    [data.ventaId, data.clienteId, data.tipo, data.inicio, data.fin]
  );
}

// Productos de la venta cuya categoría raíz es "Usado" (BR-US-01).
// Recibe el client de la transacción: el detalle_venta aún no está commiteado.
export function productosUsadosDeVenta(client: PoolClient, ventaId: number) {
  return client
    .query<{ producto_id: number }>(
      `SELECT DISTINCT dv.producto_id
       FROM detalle_venta dv
       JOIN productos p ON p.id = dv.producto_id
       WHERE dv.venta_id = $1 AND dv.producto_id IS NOT NULL
         AND p.categoria_id IN (SELECT id FROM catalogos WHERE parent_id IS NULL AND nombre = 'Usado')`,
      [ventaId]
    )
    .then((r) => r.rows.map((x) => x.producto_id));
}
