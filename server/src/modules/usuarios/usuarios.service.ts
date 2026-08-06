import bcrypt from "bcryptjs";
import { AppError } from "../../shared/errors";
import * as repo from "./usuarios.repository";

export interface UsuarioDTO {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
  isActive: boolean;
}

function mapUsuario(r: repo.UsuarioRow): UsuarioDTO {
  return {
    id: r.id,
    nombre: r.nombre,
    usuario: r.usuario,
    rol: r.rol,
    isActive: r.is_active,
  };
}

export async function list(f: { rol?: string; isActive?: boolean; page: number; pageSize: number }) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { rol: f.rol, isActive: f.isActive };
  const [rows, totalItems] = await Promise.all([
    repo.listUsuarios({ ...filtros, limit, offset }),
    repo.countUsuarios(filtros),
  ]);
  return {
    data: rows.map(mapUsuario),
    meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}

export async function create(input: { nombre: string; usuario: string; password: string; rol: string }) {
  const existente = await repo.findByUsuario(input.usuario);
  if (existente) throw AppError.conflict("USERNAME_TAKEN", "El nombre de usuario ya existe");
  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = await repo.insertUsuario({ ...input, passwordHash });
  if (!id) throw AppError.business("INTERNAL_ERROR", "No se pudo crear el usuario");
  const row = await repo.findById(id);
  return mapUsuario(row!);
}

export async function update(id: number, fields: Record<string, unknown>, actorId: number) {
  const existente = await repo.findById(id);
  if (!existente) throw AppError.notFound("USER_NOT_FOUND", "Usuario no encontrado");

  const mapped: Record<string, unknown> = {};
  if (fields.nombre !== undefined) mapped.nombre = fields.nombre;
  if (fields.rol !== undefined) mapped.rol = fields.rol;
  if (fields.isActive !== undefined) mapped.is_active = fields.isActive;

  // Evitar que un admin se desactive a sí mismo o cambie su propio rol (bloqueo)
  if (id === actorId) {
    if (fields.isActive === false) {
      throw AppError.business("SELF_DEACTIVATE", "No puedes desactivar tu propia cuenta");
    }
    if (fields.rol !== undefined && fields.rol !== existente.rol) {
      throw AppError.business("SELF_ROLE_CHANGE", "No puedes cambiar tu propio rol");
    }
  }
  if (fields.password !== undefined) mapped.password_hash = await bcrypt.hash(String(fields.password), 10);

  const row = await repo.updateUsuario(id, mapped);
  if (!row) throw AppError.notFound("USER_NOT_FOUND", "Usuario no encontrado");
  return mapUsuario(row);
}

export async function remove(id: number, actorId: number) {
  if (id === actorId) throw AppError.business("SELF_DEACTIVATE", "No puedes desactivar tu propia cuenta");
  const existente = await repo.findById(id);
  if (!existente) throw AppError.notFound("USER_NOT_FOUND", "Usuario no encontrado");
  const row = await repo.updateUsuario(id, { is_active: false });
  if (!row) throw AppError.notFound("USER_NOT_FOUND", "Usuario no encontrado");
  return mapUsuario(row);
}
