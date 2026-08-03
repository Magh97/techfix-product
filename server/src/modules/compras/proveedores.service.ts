import { AppError } from "../../shared/errors";
import * as repo from "./proveedores.repository";

export interface ProveedorDTO {
  id: number;
  nombre: string;
  contacto: string | null;
  condicionesPago: string | null;
}

function mapProveedor(r: repo.ProveedorRow): ProveedorDTO {
  return {
    id: r.id,
    nombre: r.nombre,
    contacto: r.contacto,
    condicionesPago: r.condiciones_pago,
  };
}

export async function list(q?: string, page = 1, pageSize = 20) {
  const [rows, totalItems] = await Promise.all([
    repo.listProveedores({ q, limit: pageSize, offset: (page - 1) * pageSize }),
    repo.countProveedores(q),
  ]);
  return {
    data: rows.map(mapProveedor),
    meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) || 1 },
  };
}

export async function create(input: repo.InsertProveedorInput, user: { id: number }) {
  const row = await repo.insertProveedor(input);
  if (!row) throw new Error("No se pudo crear el proveedor");
  await repo.insertAuditoria({ usuarioId: user.id, accion: "CREAR", entidad: "proveedor", entidadId: row.id, despues: row });
  return mapProveedor(row);
}

export async function getById(id: number) {
  const row = await repo.findProveedorById(id);
  if (!row) throw AppError.notFound("SUPPLIER_NOT_FOUND", "Proveedor no encontrado");
  return mapProveedor(row);
}

const FIELD_MAP: Record<string, string> = {
  nombre: "nombre",
  contacto: "contacto",
  condicionesPago: "condiciones_pago",
};

export async function update(id: number, fields: Record<string, unknown>, user: { id: number }) {
  const antes = await repo.findProveedorById(id);
  if (!antes) throw AppError.notFound("SUPPLIER_NOT_FOUND", "Proveedor no encontrado");
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    const col = FIELD_MAP[k];
    if (col) mapped[col] = v;
  }
  const row = await repo.updateProveedor(id, mapped);
  if (!row) throw AppError.notFound("SUPPLIER_NOT_FOUND", "Proveedor no encontrado");
  await repo.insertAuditoria({
    usuarioId: user.id,
    accion: "EDITAR",
    entidad: "proveedor",
    entidadId: id,
    antes,
    despues: row,
  });
  return mapProveedor(row);
}

export async function remove(id: number, user: { id: number }) {
  const existente = await repo.findProveedorById(id);
  if (!existente) throw AppError.notFound("SUPPLIER_NOT_FOUND", "Proveedor no encontrado");
  const comprasActivas = await repo.countComprasActivas(id);
  if (comprasActivas > 0) {
    throw AppError.conflict("SUPPLIER_HAS_PURCHASES", "El proveedor tiene compras activas y no puede desactivarse");
  }
  await repo.softDeleteProveedor(id);
  await repo.insertAuditoria({ usuarioId: user.id, accion: "DESACTIVAR", entidad: "proveedor", entidadId: id, antes: existente });
  return { id };
}
