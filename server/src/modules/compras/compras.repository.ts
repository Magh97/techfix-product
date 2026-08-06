import type { PoolClient } from "pg";
import { query } from "../../shared/db";

export interface CompraRow {
  id: number;
  folio: string;
  proveedor_id: number;
  proveedor_nombre: string;
  estado: "borrador" | "enviada" | "recibida" | "cancelada";
  total_neto: string;
  total_recibido: string;
  fecha_vencimiento: string | null;
  creada_por: number;
  creador_nombre: string;
  created_at: string;
}

export interface CompraLineaRow {
  id: number;
  compra_id: number;
  producto_id: number;
  sku: string;
  nombre_producto: string;
  cantidad: number;
  cantidad_recibida: number;
  precio_unitario: string;
}

export interface PagoProveedorRow {
  id: number;
  compra_id: number;
  monto: string;
  metodo: string;
  usuario_nombre: string;
  created_at: string;
}

const SELECT_COMPRA = `
  SELECT c.*, p.nombre AS proveedor_nombre, u.nombre AS creador_nombre
  FROM compras c
  JOIN proveedores p ON p.id = c.proveedor_id
  JOIN usuarios u ON u.id = c.creada_por
`;

/* --- Writes (transacción) --- */

export async function nextCompraFolio(client: PoolClient): Promise<string> {
  const r = await client.query<{ n: string }>("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM compras");
  return `OC-${String(Number(r.rows[0]?.n ?? 1)).padStart(6, "0")}`;
}

export async function insertCompra(
  client: PoolClient,
  input: { folio: string; proveedorId: number; fechaVencimiento: string | null; totalNeto: number; creadaPor: number }
) {
  const r = await client.query<{ id: number }>(
    `INSERT INTO compras (proveedor_id, folio, estado, total_neto, fecha_vencimiento, creada_por)
     VALUES ($1,$2,'borrador',$3,$4,$5) RETURNING id`,
    [input.proveedorId, input.folio, input.totalNeto, input.fechaVencimiento, input.creadaPor]
  );
  return r.rows[0]?.id;
}

export function insertDetalleCompra(
  client: PoolClient,
  compraId: number,
  lineas: { productoId: number; cantidad: number; precioUnitario: number }[]
) {
  const valores: unknown[] = [];
  const rows = lineas.map((l, i) => {
    const base = i * 4 + 1;
    valores.push(compraId, l.productoId, l.cantidad, l.precioUnitario);
    return `($${base}, $${base + 1}, $${base + 2}, $${base + 3})`;
  });
  return client.query(
    `INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_unitario) VALUES ${rows.join(", ")}`,
    valores
  );
}

export function updateCompraEstado(client: PoolClient, compraId: number, estado: string) {
  return client.query("UPDATE compras SET estado = $2, updated_at = NOW() WHERE id = $1", [compraId, estado]);
}

export async function findProductoCompra(client: PoolClient, productoId: number) {
  const r = await client.query<{ id: number; nombre: string; precio_compra: string; precio_venta: string }>(
    "SELECT id, nombre, precio_compra, precio_venta FROM productos WHERE id = $1 AND is_active = true FOR UPDATE",
    [productoId]
  );
  return r.rows[0];
}

export function incrementStockClient(client: PoolClient, productoId: number, cantidad: number) {
  return client.query("UPDATE productos SET stock = stock + $2, updated_at = NOW() WHERE id = $1", [productoId, cantidad]);
}

export function updatePrecioCompra(client: PoolClient, productoId: number, precio: number) {
  return client.query("UPDATE productos SET precio_compra = $2, updated_at = NOW() WHERE id = $1", [productoId, precio]);
}

export function insertMovimientoEntrada(
  client: PoolClient,
  input: { productoId: number; cantidad: number; usuarioId: number; compraId: number }
) {
  return client.query(
    `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, referencia_id, referencia_tipo, usuario_id, motivo)
     VALUES ($1,'ENTRADA',$2,$3,'compra',$4,$5)`,
    [input.productoId, input.cantidad, input.compraId, input.usuarioId, `Compra ${input.compraId}`]
  );
}

export function insertPrecioHistorial(
  client: PoolClient,
  input: { productoId: number; precioCompra: number; precioVenta: number; usuarioId: number }
) {
  return client.query(
    "INSERT INTO precio_historial (producto_id, precio_compra, precio_venta, usuario_id) VALUES ($1,$2,$3,$4)",
    [input.productoId, input.precioCompra, input.precioVenta, input.usuarioId]
  );
}

// Línea de detalle_compra bloqueada (FOR UPDATE) con su pendiente de recepción
export async function findDetalleCompraForUpdate(client: PoolClient, compraId: number, detalleId: number) {
  const r = await client.query<{
    id: number;
    compra_id: number;
    producto_id: number;
    cantidad: number;
    cantidad_recibida: number;
    precio_unitario: string;
  }>(
    `SELECT id, compra_id, producto_id, cantidad, cantidad_recibida, precio_unitario
     FROM detalle_compra WHERE id = $1 AND compra_id = $2 FOR UPDATE`,
    [detalleId, compraId]
  );
  return r.rows[0];
}

export function incrementCantidadRecibida(client: PoolClient, detalleId: number, cantidad: number) {
  return client.query(
    "UPDATE detalle_compra SET cantidad_recibida = cantidad_recibida + $2 WHERE id = $1",
    [detalleId, cantidad]
  );
}

export function incrementTotalRecibido(client: PoolClient, compraId: number, monto: number) {
  return client.query("UPDATE compras SET total_recibido = total_recibido + $2, updated_at = NOW() WHERE id = $1", [
    compraId,
    monto,
  ]);
}

export function insertPagoProveedor(
  client: PoolClient,
  input: { compraId: number; monto: number; metodo: string; usuarioId: number }
) {
  return client.query(
    "INSERT INTO pagos_proveedor (compra_id, monto, metodo, usuario_id) VALUES ($1,$2,$3,$4)",
    [input.compraId, input.monto, input.metodo, input.usuarioId]
  );
}

/* --- Lecturas (pool) --- */

export function findCompraById(id: number) {
  return query<CompraRow>(`${SELECT_COMPRA} WHERE c.id = $1`, [id]).then((r) => r.rows[0]);
}

interface CompraFilters {
  proveedorId?: number;
  estado?: string;
  folio?: string;
  limit: number;
  offset: number;
}

export function listCompras(f: CompraFilters) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.proveedorId) {
    params.push(f.proveedorId);
    where.push(`c.proveedor_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`c.estado = $${params.length}`);
  }
  if (f.folio) {
    params.push(`%${f.folio}%`);
    where.push(`c.folio ILIKE $${params.length}`);
  }
  params.push(f.limit, f.offset);
  const sql = `${SELECT_COMPRA}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY c.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  return query<CompraRow>(sql, params).then((r) => r.rows);
}

export function countCompras(f: Omit<CompraFilters, "limit" | "offset">) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.proveedorId) {
    params.push(f.proveedorId);
    where.push(`c.proveedor_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    where.push(`c.estado = $${params.length}`);
  }
  if (f.folio) {
    params.push(`%${f.folio}%`);
    where.push(`c.folio ILIKE $${params.length}`);
  }
  return query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM compras c${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`,
    params
  ).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function listCompraLineas(compraId: number) {
  return query<CompraLineaRow>(
    `SELECT dc.*, p.sku, p.nombre AS nombre_producto FROM detalle_compra dc
     JOIN productos p ON p.id = dc.producto_id WHERE dc.compra_id = $1 ORDER BY dc.id`,
    [compraId]
  ).then((r) => r.rows);
}

export function listPagosProveedor(compraId: number) {
  return query<PagoProveedorRow>(
    `SELECT pp.*, u.nombre AS usuario_nombre FROM pagos_proveedor pp
     JOIN usuarios u ON u.id = pp.usuario_id WHERE pp.compra_id = $1 ORDER BY pp.id`,
    [compraId]
  ).then((r) => r.rows);
}

export function sumPagosCompra(compraId: number) {
  return query<{ s: string }>(
    "SELECT COALESCE(SUM(monto),0)::numeric AS s FROM pagos_proveedor WHERE compra_id = $1",
    [compraId]
  ).then((r) => Number(r.rows[0]?.s ?? 0));
}

export function listComprasConRecepcion() {
  return query<CompraRow>(
    `SELECT c.*, p.nombre AS proveedor_nombre, u.nombre AS creador_nombre
     FROM compras c JOIN proveedores p ON p.id = c.proveedor_id JOIN usuarios u ON u.id = c.creada_por
     WHERE c.total_recibido > 0 AND c.estado <> 'borrador'
     ORDER BY c.id DESC LIMIT 200`
  ).then((r) => r.rows);
}

/* --- Comparación de precios entre proveedores (US-COM-05) --- */

export interface ComparacionPrecioRow {
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_is_active: boolean;
  ultimo_precio: string;
  ultima_fecha: string;
  folio_oc: string;
  cantidad: number;
}

// Último precio por proveedor desde OCs enviadas/recibidas (la más reciente por proveedor)
export function ultimoPrecioPorProveedor(productoId: number) {
  return query<ComparacionPrecioRow>(
    `WITH precios AS (
       SELECT dc.producto_id, c.proveedor_id, p.nombre AS proveedor_nombre, p.is_active AS proveedor_is_active,
              dc.precio_unitario, c.folio AS folio_oc, dc.cantidad, c.created_at,
              ROW_NUMBER() OVER (PARTITION BY c.proveedor_id ORDER BY c.created_at DESC, c.id DESC) AS rn
       FROM detalle_compra dc
       JOIN compras c ON c.id = dc.compra_id
       JOIN proveedores p ON p.id = c.proveedor_id
       WHERE dc.producto_id = $1 AND c.estado IN ('enviada','recibida')
     )
     SELECT proveedor_id, proveedor_nombre, proveedor_is_active, precio_unitario AS ultimo_precio,
            created_at AS ultima_fecha, folio_oc, cantidad
     FROM precios WHERE rn = 1
     ORDER BY precio_unitario ASC, proveedor_nombre ASC`,
    [productoId]
  ).then((r) => r.rows);
}

/* --- Reabastecimiento sugerido --- */

export interface ReabastecimientoRow {
  id: number;
  sku: string;
  nombre: string;
  stock: number;
  stock_minimo: number;
  stock_maximo: number;
  precio_compra: string;
  proveedor_id: number | null;
  proveedor_nombre: string | null;
  es_favorito: boolean;
  es_mas_barato: boolean;
  en_oc_folio: string | null;
}

export function listarReabastecimiento() {
  return query<ReabastecimientoRow>(
    `WITH activos_oc AS (
       SELECT DISTINCT ON (dc.producto_id) dc.producto_id, c.folio
       FROM detalle_compra dc
       JOIN compras c ON c.id = dc.compra_id
       WHERE c.estado IN ('borrador','enviada')
       ORDER BY dc.producto_id, c.id DESC
     ),
     ultimo_proveedor AS (
       SELECT DISTINCT ON (dc.producto_id) dc.producto_id, c.proveedor_id, p.nombre AS proveedor_nombre
       FROM detalle_compra dc
       JOIN compras c ON c.id = dc.compra_id
       JOIN proveedores p ON p.id = c.proveedor_id
       WHERE c.estado IN ('enviada','recibida')
       ORDER BY dc.producto_id, c.id DESC
     ),
     mejor_precio AS (
       SELECT DISTINCT ON (dc.producto_id) dc.producto_id, c.proveedor_id, p.nombre AS proveedor_nombre
       FROM detalle_compra dc
       JOIN compras c ON c.id = dc.compra_id
       JOIN proveedores p ON p.id = c.proveedor_id
       WHERE c.estado IN ('enviada','recibida') AND p.is_active = true
       ORDER BY dc.producto_id, dc.precio_unitario ASC, c.id DESC
     )
     SELECT pr.id, pr.sku, pr.nombre, pr.stock, pr.stock_minimo, pr.stock_maximo, pr.precio_compra,
            CASE
              WHEN pr.proveedor_favorito_id IS NOT NULL
                AND EXISTS (SELECT 1 FROM proveedores pf WHERE pf.id = pr.proveedor_favorito_id AND pf.is_active = true)
                THEN pr.proveedor_favorito_id
              ELSE COALESCE(mp.proveedor_id, up.proveedor_id)
            END AS proveedor_id,
            CASE
              WHEN pr.proveedor_favorito_id IS NOT NULL
                AND EXISTS (SELECT 1 FROM proveedores pf WHERE pf.id = pr.proveedor_favorito_id AND pf.is_active = true)
                THEN (SELECT nombre FROM proveedores WHERE id = pr.proveedor_favorito_id)
              ELSE COALESCE(mp.proveedor_nombre, up.proveedor_nombre)
            END AS proveedor_nombre,
            (pr.proveedor_favorito_id IS NOT NULL
              AND EXISTS (SELECT 1 FROM proveedores pf WHERE pf.id = pr.proveedor_favorito_id AND pf.is_active = true)) AS es_favorito,
            (pr.proveedor_favorito_id IS NULL OR NOT EXISTS (SELECT 1 FROM proveedores pf WHERE pf.id = pr.proveedor_favorito_id AND pf.is_active = true))
              AND mp.proveedor_id IS NOT NULL AS es_mas_barato,
            ao.folio AS en_oc_folio
     FROM productos pr
     LEFT JOIN ultimo_proveedor up ON up.producto_id = pr.id
     LEFT JOIN mejor_precio mp ON mp.producto_id = pr.id
     LEFT JOIN activos_oc ao ON ao.producto_id = pr.id
     WHERE pr.is_active = true AND pr.is_kit = false
       AND pr.stock <= pr.stock_minimo
     ORDER BY proveedor_nombre NULLS FIRST, pr.nombre`
  ).then((r) => r.rows);
}

// Proveedor de un producto: favorito activo → si no, el de menor último precio activo → si no, el último que le vendió
export function proveedorDeProducto(productoId: number) {
  return query<{ proveedor_id: number | null; proveedor_nombre: string | null }>(
    `WITH ultimo AS (
       SELECT c.proveedor_id FROM detalle_compra dc
       JOIN compras c ON c.id = dc.compra_id
       WHERE dc.producto_id = $1 AND c.estado IN ('enviada','recibida')
       ORDER BY c.id DESC LIMIT 1
     ),
     mejor_precio AS (
       SELECT c.proveedor_id FROM detalle_compra dc
       JOIN compras c ON c.id = dc.compra_id
       JOIN proveedores p ON p.id = c.proveedor_id
       WHERE dc.producto_id = $1 AND c.estado IN ('enviada','recibida') AND p.is_active = true
       ORDER BY dc.precio_unitario ASC, c.id DESC LIMIT 1
     )
     SELECT COALESCE(
              CASE WHEN p.proveedor_favorito_id IS NOT NULL
                     AND EXISTS (SELECT 1 FROM proveedores pf WHERE pf.id = p.proveedor_favorito_id AND pf.is_active = true)
                   THEN p.proveedor_favorito_id END,
              mp.proveedor_id,
              u.proveedor_id
            ) AS proveedor_id,
            pr.nombre AS proveedor_nombre
     FROM productos p
     LEFT JOIN ultimo u ON true
     LEFT JOIN mejor_precio mp ON true
     LEFT JOIN proveedores pr ON pr.id = COALESCE(
              CASE WHEN p.proveedor_favorito_id IS NOT NULL
                     AND EXISTS (SELECT 1 FROM proveedores pf WHERE pf.id = p.proveedor_favorito_id AND pf.is_active = true)
                   THEN p.proveedor_favorito_id END,
              mp.proveedor_id,
              u.proveedor_id
            )
     WHERE p.id = $1`,
    [productoId]
  ).then((r) => r.rows[0]);
}

/* --- Solicitudes de reabastecimiento --- */

export interface SolicitudRow {
  id: number;
  producto_id: number;
  sku: string;
  nombre_producto: string;
  cantidad: number;
  orden_id: number | null;
  orden_folio: string | null;
  solicitado_por: number;
  solicitante_nombre: string;
  motivo: string | null;
  estado: string;
  rechazo_motivo: string | null;
  compra_id: number | null;
  compra_folio: string | null;
  resuelto_por: number | null;
  created_at: string;
  resuelto_at: string | null;
}

const SELECT_SOLICITUD = `
  SELECT s.*, p.sku, p.nombre AS nombre_producto, o.folio AS orden_folio,
         u.nombre AS solicitante_nombre, c.folio AS compra_folio
  FROM solicitudes_reabastecimiento s
  JOIN productos p ON p.id = s.producto_id
  LEFT JOIN ordenes_servicio o ON o.id = s.orden_id
  JOIN usuarios u ON u.id = s.solicitado_por
  LEFT JOIN compras c ON c.id = s.compra_id
`;

export function insertSolicitud(input: {
  productoId: number;
  cantidad: number;
  ordenId: number | null;
  solicitadoPor: number;
  motivo: string | null;
}) {
  return query<{ id: number }>(
    `INSERT INTO solicitudes_reabastecimiento (producto_id, cantidad, orden_id, solicitado_por, motivo)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [input.productoId, input.cantidad, input.ordenId, input.solicitadoPor, input.motivo]
  ).then((r) => r.rows[0]?.id);
}

export function findSolicitudById(id: number) {
  return query<SolicitudRow>(`${SELECT_SOLICITUD} WHERE s.id = $1`, [id]).then((r) => r.rows[0]);
}

export function listSolicitudes(f: { estado?: string; ordenId?: number; limit: number; offset: number }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.estado) {
    params.push(f.estado);
    where.push(`s.estado = $${params.length}`);
  }
  if (f.ordenId) {
    params.push(f.ordenId);
    where.push(`s.orden_id = $${params.length}`);
  }
  params.push(f.limit, f.offset);
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  return query<SolicitudRow>(
    `${SELECT_SOLICITUD}${whereSql} ORDER BY s.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countSolicitudes(estado?: string, ordenId?: number) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (estado) {
    params.push(estado);
    where.push(`estado = $${params.length}`);
  }
  if (ordenId) {
    params.push(ordenId);
    where.push(`orden_id = $${params.length}`);
  }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  return query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM solicitudes_reabastecimiento${whereSql}`,
    params
  ).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function resolverSolicitud(
  id: number,
  campos: { estado: string; rechazoMotivo?: string | null; compraId?: number | null; resueltoPor: number }
) {
  const sets = ["estado = $2", "resuelto_por = $3", "resuelto_at = NOW()"];
  const vals: unknown[] = [id, campos.estado, campos.resueltoPor];
  if (campos.rechazoMotivo !== undefined) {
    sets.push(`rechazo_motivo = $${vals.length + 1}`);
    vals.push(campos.rechazoMotivo);
  }
  if (campos.compraId !== undefined) {
    sets.push(`compra_id = $${vals.length + 1}`);
    vals.push(campos.compraId);
  }
  return query(`UPDATE solicitudes_reabastecimiento SET ${sets.join(", ")} WHERE id = $1`, vals);
}

// Al completarse la línea de una OC: las solicitudes aprobadas ligadas a ESA OC pasan a "entregada"
export function entregarSolicitudesProducto(client: PoolClient, productoId: number, compraId: number, usuarioId: number) {
  return client.query<{ orden_id: number | null }>(
    `UPDATE solicitudes_reabastecimiento s
     SET estado = 'entregada', resuelto_por = $3, resuelto_at = NOW()
     WHERE s.producto_id = $1 AND s.compra_id = $2 AND s.estado = 'aprobada'
     RETURNING s.orden_id`,
    [productoId, compraId, usuarioId]
  ).then((r) => r.rows);
}

// Historial de la orden cuando llega una refacción solicitada
export function insertHistorialOrdenEntregada(
  client: PoolClient,
  ordenId: number,
  productoNombre: string,
  folioOC: string,
  usuarioId: number
) {
  return client.query(
    `INSERT INTO historial_orden (orden_id, estado, usuario_id, nota)
     SELECT $1, o.estado, $2, $3 FROM ordenes_servicio o WHERE o.id = $1`,
    [ordenId, usuarioId, `Refacción ${productoNombre} llegó · OC ${folioOC}`]
  );
}
