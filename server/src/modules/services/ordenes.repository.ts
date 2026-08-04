import type { PoolClient } from "pg";
import { query } from "../../shared/db";
import type { EstadoOrden, TipoEquipo } from "./ordenes.types";

export interface OrdenRow {
  id: number;
  folio: string;
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_equipo: TipoEquipo;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  accesorios: string | null;
  falla_reportada: string;
  diagnostico: string | null;
  estado: EstadoOrden;
  retrasada: boolean;
  fecha_prometida: string;
  fecha_entrega: string | null;
  tecnico_id: number | null;
  vendedor_id: number;
  firma_recepcion: string | null;
  created_at: string;
}

export interface HistorialRow {
  id: number;
  orden_id: number;
  estado: EstadoOrden;
  usuario_id: number;
  usuario_nombre: string;
  nota: string | null;
  created_at: string;
}

export interface CotizacionRow {
  id: number;
  orden_id: number;
  folio: string;
  estado: "emitida" | "aprobada" | "rechazada" | "expirada" | "convertida";
  subtotal: string;
  iva: string;
  total: string;
  vigencia_desde: string;
  vigencia_hasta: string;
  creada_por: number;
  created_at: string;
}

export interface CotizacionLineaRow {
  id: number;
  cotizacion_id: number;
  tipo_linea: "refaccion" | "mano_obra";
  producto_id: number | null;
  cantidad: number | null;
  precio_neto: string;
  descripcion_mano_obra: string | null;
  horas: string | null;
  tarifa_hora: string | null;
  nombre_producto: string | null;
}

export interface DetalleOrdenRow {
  id: number;
  orden_id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  estado_linea: "cotizada" | "reservada" | "consumida" | "liberada";
  costo_unitario: string;
}

interface OrdenFilters {
  estado?: EstadoOrden;
  retrasadas?: boolean;
  folio?: string;
  clienteId?: number;
  limit: number;
  offset: number;
}

const SELECT_ORDEN = `
  SELECT o.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
  FROM ordenes_servicio o
  JOIN clientes c ON c.id = o.cliente_id
`;

function buildOrdenWhere(f: Omit<OrdenFilters, "limit" | "offset">, params: unknown[], prefix = "") {
  const where: string[] = [];
  if (f.estado) {
    params.push(f.estado);
    where.push(`${prefix}o.estado = $${params.length}`);
  }
  if (f.retrasadas) {
    where.push(`${prefix}o.retrasada = true`);
  }
  if (f.folio) {
    params.push(`%${f.folio}%`);
    where.push(`${prefix}o.folio ILIKE $${params.length}`);
  }
  if (f.clienteId) {
    params.push(f.clienteId);
    where.push(`${prefix}o.cliente_id = $${params.length}`);
  }
  return where;
}

export function listOrdenes(f: OrdenFilters) {
  const params: unknown[] = [];
  const where = buildOrdenWhere(f, params);
  params.push(f.limit, f.offset);
  const sql = `${SELECT_ORDEN}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY o.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  return query<OrdenRow>(sql, params).then((r) => r.rows);
}

export function countOrdenes(f: Omit<OrdenFilters, "limit" | "offset">) {
  const params: unknown[] = [];
  const where = buildOrdenWhere(f, params);
  const sql = `SELECT COUNT(*)::int AS count FROM ordenes_servicio o${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  return query<{ count: string }>(sql, params).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function findOrdenById(id: number) {
  return query<OrdenRow>(`${SELECT_ORDEN} WHERE o.id = $1`, [id]).then((r) => r.rows[0]);
}

export function findOrdenByFolio(folio: string) {
  return query<OrdenRow>(`${SELECT_ORDEN} WHERE o.folio = $1`, [folio]).then((r) => r.rows[0]);
}

export async function nextOrdenFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const r = await query<{ n: string }>(
    `SELECT COALESCE(MAX(id), 0) + 1 AS n FROM ordenes_servicio`
  );
  return `${year}-${String(Number(r.rows[0]?.n ?? 1)).padStart(4, "0")}`;
}

export interface InsertOrdenInput {
  folio: string;
  clienteId: number;
  tipoEquipo: TipoEquipo;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  accesorios: string | null;
  fallaReportada: string;
  fechaPrometida: string;
  tecnicoId: number | null;
  vendedorId: number;
}

export function insertOrden(input: InsertOrdenInput) {
  return query<{ id: number }>(
    `INSERT INTO ordenes_servicio
      (cliente_id, folio, tipo_equipo, marca, modelo, serie, accesorios, falla_reportada, fecha_prometida, tecnico_id, vendedor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      input.clienteId,
      input.folio,
      input.tipoEquipo,
      input.marca,
      input.modelo,
      input.serie,
      input.accesorios,
      input.fallaReportada,
      input.fechaPrometida,
      input.tecnicoId,
      input.vendedorId,
    ]
  ).then((r) => r.rows[0]?.id);
}

export function insertHistorial(ordenId: number, estado: EstadoOrden, usuarioId: number, nota?: string) {
  return query(
    "INSERT INTO historial_orden (orden_id, estado, usuario_id, nota) VALUES ($1,$2,$3,$4)",
    [ordenId, estado, usuarioId, nota ?? null]
  );
}

export function listHistorial(ordenId: number) {
  return query<HistorialRow>(
    `SELECT h.*, u.nombre AS usuario_nombre FROM historial_orden h
     JOIN usuarios u ON u.id = h.usuario_id WHERE h.orden_id = $1 ORDER BY h.id`,
    [ordenId]
  ).then((r) => r.rows);
}

export function updateOrdenEstado(id: number, estado: EstadoOrden, retrasada: boolean) {
  return query(
    "UPDATE ordenes_servicio SET estado = $2, retrasada = $3, updated_at = NOW() WHERE id = $1",
    [id, estado, retrasada]
  );
}

// BR-RET: marca retrasada si fecha_prometida + 1 día < hoy y la orden sigue abierta (US-SER-09)
export function marcarRetrasadas() {
  return query(
    `UPDATE ordenes_servicio SET retrasada = true
     WHERE retrasada = false
       AND estado NOT IN ('entregado', 'cancelado')
       AND fecha_prometida < (CURRENT_DATE - INTERVAL '1 day')`
  ).then((r) => r.rowCount ?? 0);
}

export function updateOrdenDiagnostico(id: number, diagnostico: string) {
  return query("UPDATE ordenes_servicio SET diagnostico = $2, updated_at = NOW() WHERE id = $1", [id, diagnostico]);
}

export function clienteExists(id: number) {
  return query<{ id: number }>("SELECT id FROM clientes WHERE id = $1 AND is_active = true", [id]).then(
    (r) => r.rows[0] !== undefined
  );
}

export function tecnicoExists(id: number) {
  return query<{ id: number }>("SELECT id FROM usuarios WHERE id = $1 AND rol = 'tecnico' AND is_active = true", [id]).then(
    (r) => r.rows[0] !== undefined
  );
}

export interface InsertCotizacionInput {
  ordenId: number;
  folio: string;
  subtotal: number;
  iva: number;
  total: number;
  vigenciaDesde: string;
  vigenciaHasta: string;
  creadaPor: number;
}

export function insertCotizacion(input: InsertCotizacionInput) {
  return query<{ id: number }>(
    `INSERT INTO cotizaciones (orden_id, folio, subtotal, iva, total, vigencia_desde, vigencia_hasta, creada_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [input.ordenId, input.folio, input.subtotal, input.iva, input.total, input.vigenciaDesde, input.vigenciaHasta, input.creadaPor]
  ).then((r) => r.rows[0]?.id);
}

export async function nextCotizacionFolio(): Promise<string> {
  const r = await query<{ n: string }>("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM cotizaciones");
  return `COT-${String(Number(r.rows[0]?.n ?? 1)).padStart(4, "0")}`;
}

export function insertDetalleCotizacion(input: {
  cotizacionId: number;
  tipoLinea: "refaccion" | "mano_obra";
  productoId?: number;
  cantidad?: number;
  precioNeto: number;
  descripcion?: string;
  horas?: number;
  tarifaHora?: number;
}) {
  return query(
    `INSERT INTO detalle_cotizacion (cotizacion_id, tipo_linea, producto_id, cantidad, precio_neto, descripcion_mano_obra, horas, tarifa_hora)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      input.cotizacionId,
      input.tipoLinea,
      input.productoId ?? null,
      input.cantidad ?? null,
      input.precioNeto,
      input.descripcion ?? null,
      input.horas ?? null,
      input.tarifaHora ?? null,
    ]
  );
}

export function listCotizaciones(ordenId: number) {
  return query<CotizacionRow>("SELECT * FROM cotizaciones WHERE orden_id = $1 ORDER BY id DESC", [ordenId]).then(
    (r) => r.rows
  );
}

export function findCotizacionById(id: number) {
  return query<CotizacionRow>("SELECT * FROM cotizaciones WHERE id = $1", [id]).then((r) => r.rows[0]);
}

export function listCotizacionLineas(cotizacionId: number) {
  return query<CotizacionLineaRow>(
    `SELECT dc.*, p.nombre AS nombre_producto FROM detalle_cotizacion dc
     LEFT JOIN productos p ON p.id = dc.producto_id
     WHERE dc.cotizacion_id = $1 ORDER BY dc.id`,
    [cotizacionId]
  ).then((r) => r.rows);
}

export function updateCotizacionEstado(id: number, estado: CotizacionRow["estado"]) {
  return query("UPDATE cotizaciones SET estado = $2 WHERE id = $1", [id, estado]);
}

export function updateCotizacionTotales(id: number, subtotal: number, iva: number, total: number) {
  return query("UPDATE cotizaciones SET subtotal = $2, iva = $3, total = $4 WHERE id = $1", [id, subtotal, iva, total]);
}

export function findProducto(id: number) {
  return query<{ id: number; nombre: string; precio_venta: string; stock: number }>(
    "SELECT id, nombre, precio_venta, stock FROM productos WHERE id = $1 AND is_active = true",
    [id]
  ).then((r) => r.rows[0]);
}

export function updateOrdenEntrega(client: PoolClient, id: number, firma: string) {
  return client.query(
    "UPDATE ordenes_servicio SET estado = 'entregado', fecha_entrega = CURRENT_DATE, firma_recepcion = $2, updated_at = NOW() WHERE id = $1",
    [id, firma]
  );
}

export function listDetalleOrden(ordenId: number) {
  return query<DetalleOrdenRow>(
    `SELECT d.*, p.nombre AS producto_nombre FROM detalle_orden d
     JOIN productos p ON p.id = d.producto_id WHERE d.orden_id = $1 ORDER BY d.id`,
    [ordenId]
  ).then((r) => r.rows);
}

/* --- Operaciones transaccionales (reciben cliente) --- */

export function reservarStock(client: PoolClient, productoId: number, cantidad: number) {
  return client.query(
    "UPDATE productos SET stock = stock - $2, updated_at = NOW() WHERE id = $1 AND stock >= $2 RETURNING id",
    [productoId, cantidad]
  );
}

export function liberarStock(client: PoolClient, productoId: number, cantidad: number) {
  return client.query("UPDATE productos SET stock = stock + $2, updated_at = NOW() WHERE id = $1", [productoId, cantidad]);
}

export function insertDetalleOrdenReserva(
  client: PoolClient,
  ordenId: number,
  productoId: number,
  cantidad: number,
  costoUnitario: number
) {
  return client.query(
    `INSERT INTO detalle_orden (orden_id, producto_id, cantidad, estado_linea, costo_unitario)
     VALUES ($1,$2,$3,'reservada',$4)`,
    [ordenId, productoId, cantidad, costoUnitario]
  );
}

export function consumirDetalleOrden(client: PoolClient, ordenId: number, productoId: number, cantidad: number) {
  return client.query(
    `UPDATE detalle_orden SET estado_linea = 'consumida'
     WHERE orden_id = $1 AND producto_id = $2 AND estado_linea = 'reservada'
       AND ctid IN (
         SELECT ctid FROM detalle_orden
         WHERE orden_id = $1 AND producto_id = $2 AND estado_linea = 'reservada'
         ORDER BY id LIMIT $3
       )
     RETURNING id`,
    [ordenId, productoId, cantidad]
  );
}

export function consumirTodasLasReservas(client: PoolClient, ordenId: number) {
  return client.query(`UPDATE detalle_orden SET estado_linea = 'consumida' WHERE orden_id = $1 AND estado_linea = 'reservada'`, [ordenId]);
}

export function listReservasOrden(client: PoolClient, ordenId: number) {
  return client.query<{ producto_id: number; cantidad: number }>(
    "SELECT producto_id, cantidad FROM detalle_orden WHERE orden_id = $1 AND estado_linea = 'reservada'",
    [ordenId]
  ).then((r) => r.rows);
}

export function liberarReservas(client: PoolClient, ordenId: number) {
  return client.query(`UPDATE detalle_orden SET estado_linea = 'liberada' WHERE orden_id = $1 AND estado_linea = 'reservada'`, [ordenId]);
}

export function insertMovimiento(
  client: PoolClient,
  data: {
    productoId: number;
    tipo: string;
    cantidad: number;
    usuarioId: number;
    motivo: string;
  }
) {
  return client.query(
    `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, usuario_id, motivo)
     VALUES ($1,$2,$3,$4,$5)`,
    [data.productoId, data.tipo, data.cantidad, data.usuarioId, data.motivo]
  );
}

export function countReservaDisponible(ordenId: number, productoId: number) {
  return query<{ c: string }>(
    "SELECT COALESCE(SUM(cantidad),0)::int AS c FROM detalle_orden WHERE orden_id = $1 AND producto_id = $2 AND estado_linea = 'reservada'",
    [ordenId, productoId]
  ).then((r) => Number(r.rows[0]?.c ?? 0));
}

/* --- Garantía generada en la entrega --- */

export function insertGarantia(
  client: PoolClient,
  data: { ventaId: number; ordenId: number; clienteId: number; tipo: string; inicio: string; fin: string }
) {
  return client.query(
    `INSERT INTO garantias (venta_id, orden_id, cliente_id, tipo, inicio, fin) VALUES ($1,$2,$3,$4,$5,$6)`,
    [data.ventaId, data.ordenId, data.clienteId, data.tipo, data.inicio, data.fin]
  );
}
