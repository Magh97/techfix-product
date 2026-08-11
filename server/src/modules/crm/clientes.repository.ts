import { query } from "../../shared/db";

export interface ClienteRow {
  id: number;
  nombre: string;
  telefono: string;
  correo: string | null;
  direccion: string | null;
  preferencia_contacto: string;
  limite_credito: string;
  plazo_credito_dias: number;
  etiquetas: string[];
}

export function listClientes(f: { q?: string; limit: number; offset: number }) {
  const params: unknown[] = [];
  const where: string[] = ["is_active = true"];
  if (f.q) {
    params.push(`%${f.q}%`);
    where.push(`(nombre ILIKE $${params.length} OR telefono ILIKE $${params.length})`);
  }
  params.push(f.limit, f.offset);
  return query<ClienteRow>(
    `SELECT id, nombre, telefono, correo, direccion, preferencia_contacto, limite_credito, plazo_credito_dias, etiquetas
     FROM clientes WHERE ${where.join(" AND ")} ORDER BY nombre LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).then((r) => r.rows);
}

export function countClientes(q?: string) {
  const params: unknown[] = [];
  const where: string[] = ["is_active = true"];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(nombre ILIKE $${params.length} OR telefono ILIKE $${params.length})`);
  }
  return query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM clientes WHERE ${where.join(" AND ")}`, params).then(
    (r) => Number(r.rows[0]?.count ?? 0)
  );
}

export interface InsertClienteInput {
  nombre: string;
  telefono: string;
  correo?: string | null;
  direccion?: string | null;
  preferenciaContacto?: string;
  limiteCredito?: number;
  plazoCreditoDias?: number;
}

export function insertCliente(input: InsertClienteInput) {
  return query<ClienteRow>(
    `INSERT INTO clientes (nombre, telefono, correo, direccion, preferencia_contacto, limite_credito, plazo_credito_dias)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, nombre, telefono, correo, direccion, preferencia_contacto, limite_credito, plazo_credito_dias, etiquetas`,
    [
      input.nombre,
      input.telefono,
      input.correo ?? null,
      input.direccion ?? null,
      input.preferenciaContacto ?? "whatsapp",
      input.limiteCredito ?? 3000,
      input.plazoCreditoDias ?? 15,
    ]
  ).then((r) => r.rows[0]);
}

export function findClienteById(id: number) {
  return query<ClienteRow>(
    `SELECT id, nombre, telefono, correo, direccion, preferencia_contacto, limite_credito, plazo_credito_dias, etiquetas
     FROM clientes WHERE id = $1 AND is_active = true`,
    [id]
  ).then((r) => r.rows[0]);
}

export function updateCliente(id: number, fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!entries.length) return findClienteById(id);
  const sets = entries.map(([k], i) => `"${k}" = $${i + 1}`);
  const values: unknown[] = entries.map(([, v]) => v);
  values.push(id);
  return query<ClienteRow>(
    `UPDATE clientes SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING
      id, nombre, telefono, correo, direccion, preferencia_contacto, limite_credito, plazo_credito_dias, etiquetas`,
    values
  ).then((r) => r.rows[0]);
}

export function updateEtiquetas(id: number, etiquetas: string[]) {
  return query<ClienteRow>(
    `UPDATE clientes SET etiquetas = $2, updated_at = NOW() WHERE id = $1 RETURNING
      id, nombre, telefono, correo, direccion, preferencia_contacto, limite_credito, plazo_credito_dias, etiquetas`,
    [id, JSON.stringify(etiquetas)]
  ).then((r) => r.rows[0]);
}

export async function saldoCliente(clienteId: number): Promise<number> {
  const ventas = await query<{ id: number; total: string }>(
    `SELECT id, total FROM ventas
     WHERE cliente_id = $1 AND tipo_pago = 'credito' AND estado IN ('completada','credito_pendiente','devuelta')`,
    [clienteId]
  );
  let saldo = 0;
  for (const v of ventas.rows) {
    saldo += Number(v.total) - (await sumPagos(v.id));
  }
  return Math.max(0, saldo);
}

export function sumPagos(ventaId: number) {
  return query<{ s: string }>("SELECT COALESCE(SUM(monto),0)::numeric AS s FROM pagos WHERE venta_id = $1", [ventaId]).then(
    (r) => Number(r.rows[0]?.s ?? 0)
  );
}

export function listClienteOrdenes(clienteId: number) {
  return query<{ id: number; folio: string; estado: string; retrasada: boolean; created_at: string }>(
    `SELECT id, folio, estado, retrasada, created_at FROM ordenes_servicio WHERE cliente_id = $1 ORDER BY id DESC LIMIT 20`,
    [clienteId]
  ).then((r) => r.rows);
}

export function listClienteVentas(clienteId: number) {
  return query<{ id: number; folio: string; total: string; estado: string; fecha_vencimiento: string | null; created_at: string }>(
    `SELECT id, folio, total, estado, fecha_vencimiento, created_at FROM ventas WHERE cliente_id = $1 ORDER BY id DESC LIMIT 20`,
    [clienteId]
  ).then((r) => r.rows);
}

export function listClienteCotizaciones(clienteId: number) {
  return query<{ id: number; folio: string; total: string; estado: string; vigencia_hasta: string | null }>(
    `SELECT c.id, c.folio, c.total, c.estado, c.vigencia_hasta
     FROM cotizaciones c JOIN ordenes_servicio o ON o.id = c.orden_id
     WHERE o.cliente_id = $1 ORDER BY c.id DESC LIMIT 20`,
    [clienteId]
  ).then((r) => r.rows);
}

export function listClienteCxc(clienteId: number) {
  return query<{ id: number; folio: string; total: string; fecha_vencimiento: string | null }>(
    `SELECT id, folio, total, fecha_vencimiento FROM ventas
     WHERE cliente_id = $1 AND tipo_pago = 'credito' AND estado IN ('completada','credito_pendiente')
     ORDER BY id DESC`,
    [clienteId]
  ).then((r) => r.rows);
}
