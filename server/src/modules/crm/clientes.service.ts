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
