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
