import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
import { registrarAuditoria } from "../../shared/auditoria";
import * as repo from "./quejas.repository";

const TRANSICIONES: Record<string, string[]> = {
  abierta: ["en_proceso", "resuelta"],
  en_proceso: ["resuelta"],
  resuelta: [],
};

function mapQueja(r: repo.QuejaRow) {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre,
    tipo: r.tipo,
    garantiaId: r.garantia_id,
    ordenId: r.orden_id,
    ordenFolio: r.orden_folio,
    ventaId: r.venta_id,
    ventaFolio: r.venta_folio,
    descripcion: r.descripcion,
    estado: r.estado,
    resolucion: r.resolucion,
    registradaPorNombre: r.registrada_por_nombre,
    resueltaPorNombre: r.resuelta_por_nombre,
    resueltaAt: r.resuelta_at,
    createdAt: r.created_at,
  };
}

export async function crear(
  input: {
    clienteId: number;
    tipo: string;
    garantiaId?: number | null;
    ordenId?: number | null;
    ventaId?: number | null;
    descripcion: string;
  },
  user: { id: number }
) {
  const cliente = await repo.findCliente(input.clienteId);
  if (!cliente) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");

  const garantiaId: number | null = input.garantiaId ?? null;
  if (input.tipo === "reclamacion_garantia") {
    if (!garantiaId) throw AppError.business("GARANTIA_REQUERIDA", "Una reclamación de garantía requiere la garantía");
    const garantia = await repo.findGarantiaDeCliente(input.clienteId, garantiaId);
    if (!garantia) throw AppError.business("GARANTIA_INVALIDA", "La garantía no existe o no pertenece al cliente");
  }

  const id = await repo.insertQueja({
    clienteId: input.clienteId,
    tipo: input.tipo,
    garantiaId,
    ordenId: input.ordenId ?? null,
    ventaId: input.ventaId ?? null,
    descripcion: input.descripcion,
    registradaPor: user.id,
  });
  if (!id) throw AppError.business("INTERNAL_ERROR", "No se pudo registrar la queja");

  await registrarAuditoria({
    usuarioId: user.id,
    accion: "CREAR",
    entidad: "queja",
    entidadId: id,
    despues: { clienteId: input.clienteId, tipo: input.tipo },
  });
  return mapQueja((await repo.findQueja(id))!);
}

export async function listar(f: { clienteId?: number; estado?: string; tipo?: string; page: number; pageSize: number }) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { clienteId: f.clienteId, estado: f.estado, tipo: f.tipo };
  const [rows, totalItems] = await Promise.all([repo.listQuejas({ ...filtros, limit, offset }), repo.countQuejas(filtros)]);
  return {
    data: rows.map(mapQueja),
    meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}

export async function listCliente(clienteId: number) {
  return (await repo.listClienteQuejas(clienteId)).map(mapQueja);
}

export async function cambiarEstado(
  id: number,
  input: { estado: string; resolucion?: string },
  user: { id: number }
) {
  const existente = await repo.findQueja(id);
  if (!existente) throw AppError.notFound("QUEJA_NOT_FOUND", "Queja no encontrada");
  if (!(TRANSICIONES[existente.estado] ?? []).includes(input.estado)) {
    throw AppError.conflict("ESTADO_INVALIDO", `No se puede pasar de ${existente.estado} a ${input.estado}`);
  }
  if (input.estado === "resuelta" && !input.resolucion?.trim()) {
    throw AppError.business("RESOLUCION_REQUERIDA", "Debes capturar la resolución para cerrar la queja");
  }

  await withTransaction((client) =>
    repo.actualizarEstadoQueja(client, id, {
      estado: input.estado,
      resolucion: input.resolucion ?? null,
      resueltaPor: input.estado === "resuelta" ? user.id : null,
    })
  );
  await registrarAuditoria({
    usuarioId: user.id,
    accion: "ACTUALIZAR",
    entidad: "queja",
    entidadId: id,
    despues: { estado: input.estado },
  });
  return mapQueja((await repo.findQueja(id))!);
}
