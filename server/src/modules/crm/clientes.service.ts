import { AppError } from "../../shared/errors";
import * as repo from "./clientes.repository";

export interface ClienteDTO {
  id: number;
  nombre: string;
  telefono: string;
  correo: string | null;
  direccion: string | null;
  preferenciaContacto: string;
  limiteCredito: number;
  plazoCreditoDias: number;
  etiquetas: string[];
}

function mapCliente(r: repo.ClienteRow): ClienteDTO {
  return {
    id: r.id,
    nombre: r.nombre,
    telefono: r.telefono,
    correo: r.correo,
    direccion: r.direccion,
    preferenciaContacto: r.preferencia_contacto,
    limiteCredito: Number(r.limite_credito),
    plazoCreditoDias: r.plazo_credito_dias,
    etiquetas: r.etiquetas ?? [],
  };
}

export async function list(q?: string, page = 1, pageSize = 20) {
  const [rows, totalItems] = await Promise.all([
    repo.listClientes({ q, limit: pageSize, offset: (page - 1) * pageSize }),
    repo.countClientes(q),
  ]);
  return {
    data: rows.map(mapCliente),
    meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) || 1 },
  };
}

export async function create(input: repo.InsertClienteInput) {
  const row = await repo.insertCliente(input);
  if (!row) throw new Error("No se pudo crear el cliente");
  return mapCliente(row);
}

export async function getById(id: number) {
  const row = await repo.findClienteById(id);
  if (!row) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
  return {
    ...mapCliente(row),
    saldoPendiente: await repo.saldoCliente(id),
  };
}

const FIELD_MAP: Record<string, string> = {
  nombre: "nombre",
  telefono: "telefono",
  correo: "correo",
  direccion: "direccion",
  preferenciaContacto: "preferencia_contacto",
  limiteCredito: "limite_credito",
  plazoCreditoDias: "plazo_credito_dias",
};

export async function update(id: number, fields: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    const col = FIELD_MAP[k];
    if (col) mapped[col] = v;
  }
  const row = await repo.updateCliente(id, mapped);
  if (!row) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
  return mapCliente(row);
}

export async function setEtiquetas(id: number, etiquetas: string[]) {
  const row = await repo.updateEtiquetas(id, etiquetas);
  if (!row) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
  return mapCliente(row);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function historial(id: number) {
  const [ordenes, ventas, cotizaciones] = await Promise.all([
    repo.listClienteOrdenes(id),
    repo.listClienteVentas(id),
    repo.listClienteCotizaciones(id),
  ]);
  return {
    ordenes: ordenes.map((o) => ({ id: o.id, folio: o.folio, estado: o.estado, retrasada: o.retrasada, fecha: o.created_at })),
    ventas: ventas.map((v) => ({ id: v.id, folio: v.folio, total: Number(v.total), estado: v.estado, fecha: v.created_at })),
    cotizaciones: cotizaciones.map((c) => ({ id: c.id, folio: c.folio, total: Number(c.total), estado: c.estado, vigenciaHasta: c.vigencia_hasta })),
  };
}

export async function cxc(id: number) {
  const row = await repo.findClienteById(id);
  if (!row) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
  const ventas = await repo.listClienteCxc(id);
  const hoy = today();
  const items: { ventaId: number; folio: string; total: number; saldo: number; fechaVencimiento: string | null; estado: string }[] = [];
  let saldoTotal = 0;
  for (const v of ventas) {
    const pagado = await repo.sumPagos(v.id);
    const saldo = Math.max(0, Number(v.total) - pagado);
    saldoTotal += saldo;
    const vencido = v.fecha_vencimiento && String(v.fecha_vencimiento).slice(0, 10) < hoy && saldo > 0;
    items.push({
      ventaId: v.id,
      folio: v.folio,
      total: Number(v.total),
      saldo,
      fechaVencimiento: v.fecha_vencimiento ? String(v.fecha_vencimiento).slice(0, 10) : null,
      estado: saldo <= 0 ? "pagado" : vencido ? "vencido" : "vigente",
    });
  }
  return {
    limiteCredito: Number(row.limite_credito),
    saldoTotal,
    items,
  };
}
