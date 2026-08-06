import type { PoolClient } from "pg";
import { query } from "../../shared/db";

export interface UsadoRow {
  id: number;
  producto_id: number;
  sku: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  cliente_origen_id: number | null;
  cliente_origen_nombre: string | null;
  orden_id: number | null;
  valor_trade_in: string;
  origen: string;
  observaciones: string | null;
  creado_por_nombre: string;
  created_at: string;
}

// Raíz del catálogo "Usado" (categoría del producto usado)
export function findCategoriaUsado() {
  return query<{ id: number }>(
    "SELECT id FROM catalogos WHERE parent_id IS NULL AND nombre = 'Usado' LIMIT 1"
  ).then((r) => r.rows[0] ?? null);
}

export function findClienteById(clienteId: number) {
  return query<{ id: number }>("SELECT id FROM clientes WHERE id = $1 AND is_active = true", [clienteId]).then(
    (r) => r.rows[0] ?? null
  );
}

export function insertProductoUsado(
  client: PoolClient,
  input: {
    categoriaId: number;
    sku: string;
    nombre: string;
    codigoBarras?: string | null;
    marca?: string | null;
    modelo?: string | null;
    precioCompra: number;
    precioVenta: number;
    stock: number;
    catalogoId?: number | null;
  }
) {
  return client.query<{ id: number }>(
    `INSERT INTO productos (categoria_id, sku, codigo_barras, nombre, marca, modelo, precio_compra, precio_venta, stock, stock_minimo, catalogo_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10) RETURNING id`,
    [
      input.categoriaId,
      input.sku,
      input.codigoBarras ?? null,
      input.nombre,
      input.marca ?? null,
      input.modelo ?? null,
      input.precioCompra,
      input.precioVenta,
      input.stock,
      input.catalogoId ?? null,
    ]
  ).then((r) => r.rows[0]?.id);
}

export function insertEquipoUsado(
  client: PoolClient,
  input: {
    productoId: number;
    clienteOrigenId: number | null;
    ordenId: number | null;
    ventaId: number | null;
    valorTradeIn: number;
    origen: string;
    observaciones: string | null;
    createdBy: number;
  }
) {
  return client.query<{ id: number }>(
    `INSERT INTO equipos_usados (producto_id, cliente_origen_id, orden_id, venta_id, valor_trade_in, origen, observaciones, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      input.productoId,
      input.clienteOrigenId,
      input.ordenId,
      input.ventaId,
      input.valorTradeIn,
      input.origen,
      input.observaciones,
      input.createdBy,
    ]
  ).then((r) => r.rows[0]?.id);
}

export function insertMovimientoEntrada(
  client: PoolClient,
  input: { productoId: number; cantidad: number; usuarioId: number; equipoId: number }
) {
  return client.query(
    `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, referencia_id, referencia_tipo, usuario_id, motivo)
     VALUES ($1,'ENTRADA',$2,$3,'usado',$4,$5)`,
    [input.productoId, input.cantidad, input.equipoId, input.usuarioId, `Alta equipo usado #${input.equipoId}`]
  );
}

const SELECT_USADO = `
  SELECT eu.*, p.sku, p.nombre, p.marca, p.modelo, p.precio_compra, p.precio_venta, p.stock,
         c.nombre AS cliente_origen_nombre, u.nombre AS creado_por_nombre
  FROM equipos_usados eu
  JOIN productos p ON p.id = eu.producto_id
  LEFT JOIN clientes c ON c.id = eu.cliente_origen_id
  JOIN usuarios u ON u.id = eu.created_by
`;

export interface UsadoFilters {
  estado?: string;
  origen?: string;
  clienteId?: number;
  q?: string;
  limit: number;
  offset: number;
}

function whereUsados(f: Omit<UsadoFilters, "limit" | "offset">) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.estado === "disponible") where.push("p.stock > 0");
  if (f.estado === "vendido") where.push("p.stock <= 0");
  if (f.origen) {
    params.push(f.origen);
    where.push(`eu.origen = $${params.length}`);
  }
  if (f.clienteId) {
    params.push(f.clienteId);
    where.push(`eu.cliente_origen_id = $${params.length}`);
  }
  if (f.q) {
    params.push(`%${f.q}%`);
    where.push(`(p.nombre ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  return { where, params };
}

export function listUsados(f: UsadoFilters) {
  const { where, params } = whereUsados(f);
  params.push(f.limit, f.offset);
  return query<UsadoRow>(
    `${SELECT_USADO}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY eu.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countUsados(f: Omit<UsadoFilters, "limit" | "offset">) {
  const { where, params } = whereUsados(f);
  return query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM equipos_usados eu JOIN productos p ON p.id = eu.producto_id${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`,
    params
  ).then((r) => Number(r.rows[0]?.count ?? 0));
}

export function findEquipoUsado(id: number) {
  return query<UsadoRow>(`${SELECT_USADO} WHERE eu.id = $1`, [id]).then((r) => r.rows[0] ?? null);
}

export function updateEquipoUsado(client: PoolClient, id: number, campos: { valorTradeIn?: number; origen?: string; observaciones?: string | null }) {
  const sets: string[] = [];
  const vals: unknown[] = [id];
  if (campos.valorTradeIn !== undefined) {
    sets.push(`valor_trade_in = $${vals.length + 1}`);
    vals.push(campos.valorTradeIn);
  }
  if (campos.origen !== undefined) {
    sets.push(`origen = $${vals.length + 1}`);
    vals.push(campos.origen);
  }
  if (campos.observaciones !== undefined) {
    sets.push(`observaciones = $${vals.length + 1}`);
    vals.push(campos.observaciones);
  }
  if (!sets.length) return Promise.resolve();
  return client.query(`UPDATE equipos_usados SET ${sets.join(", ")} WHERE id = $1`, vals);
}

export function updateProductoUsadoPrecios(client: PoolClient, productoId: number, campos: { precioCompra?: number; precioVenta?: number }) {
  const sets: string[] = [];
  const vals: unknown[] = [productoId];
  if (campos.precioCompra !== undefined) {
    sets.push(`precio_compra = $${vals.length + 1}`);
    vals.push(campos.precioCompra);
  }
  if (campos.precioVenta !== undefined) {
    sets.push(`precio_venta = $${vals.length + 1}`);
    vals.push(campos.precioVenta);
  }
  if (!sets.length) return Promise.resolve();
  return client.query(`UPDATE productos SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1`, vals);
}
