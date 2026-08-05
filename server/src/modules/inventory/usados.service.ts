import { registrarAuditoria } from "../../shared/auditoria";
import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
import * as repo from "./usados.repository";

function toNum(n: string | null | undefined): number {
  return Number(n ?? 0);
}

function mapUsado(r: repo.UsadoRow) {
  return {
    id: r.id,
    productoId: r.producto_id,
    sku: r.sku,
    nombre: r.nombre,
    marca: r.marca,
    modelo: r.modelo,
    precioCompra: toNum(r.precio_compra),
    precioVenta: toNum(r.precio_venta),
    stock: r.stock,
    estado: r.stock > 0 ? "disponible" : "vendido",
    clienteOrigenId: r.cliente_origen_id,
    clienteOrigenNombre: r.cliente_origen_nombre,
    ordenId: r.orden_id,
    valorTradeIn: toNum(r.valor_trade_in),
    origen: r.origen,
    observaciones: r.observaciones,
    creadoPorNombre: r.creado_por_nombre,
    createdAt: r.created_at,
  };
}

export async function crear(
  input: {
    sku: string;
    nombre: string;
    codigoBarras?: string | null;
    marca?: string | null;
    modelo?: string | null;
    valorTradeIn: number;
    precioVenta: number;
    stock?: number;
    origen: string;
    clienteId?: number | null;
    ordenId?: number | null;
    observaciones?: string;
  },
  user: { id: number }
) {
  const categoria = await repo.findCategoriaUsado();
  if (!categoria) {
    throw AppError.business("CATEGORIA_USADO_NOT_FOUND", "No existe la categoría raíz 'Usado' en el catálogo");
  }
  if (input.clienteId) {
    const cliente = await repo.findClienteById(input.clienteId);
    if (!cliente) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
  }

  const stock = input.stock ?? 1;
  const valorTradeIn = input.valorTradeIn;

  const equipoId = await withTransaction(async (client) => {
    const productoId = await repo.insertProductoUsado(client, {
      categoriaId: categoria.id,
      sku: input.sku,
      nombre: input.nombre,
      codigoBarras: input.codigoBarras ?? null,
      marca: input.marca ?? null,
      modelo: input.modelo ?? null,
      precioCompra: valorTradeIn,
      precioVenta: input.precioVenta,
      stock,
      catalogoId: null,
    });
    if (!productoId) throw AppError.business("INTERNAL_ERROR", "No se pudo crear el producto usado");
    const id = await repo.insertEquipoUsado(client, {
      productoId,
      clienteOrigenId: input.clienteId ?? null,
      ordenId: input.ordenId ?? null,
      valorTradeIn,
      origen: input.origen,
      observaciones: input.observaciones ?? null,
      createdBy: user.id,
    });
    if (!id) throw AppError.business("INTERNAL_ERROR", "No se pudo registrar el equipo usado");
    await repo.insertMovimientoEntrada(client, { productoId, cantidad: stock, usuarioId: user.id, equipoId: id });
    return id;
  });

  await registrarAuditoria({
    usuarioId: user.id,
    accion: "CREAR",
    entidad: "equipo_usado",
    entidadId: equipoId,
    despues: { sku: input.sku, nombre: input.nombre, valorTradeIn, stock },
  });
  return mapUsado((await repo.findEquipoUsado(equipoId))!);
}

export async function listar(f: {
  estado?: string;
  origen?: string;
  clienteId?: number;
  q?: string;
  page: number;
  pageSize: number;
}) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { estado: f.estado, origen: f.origen, clienteId: f.clienteId, q: f.q };
  const [rows, totalItems] = await Promise.all([repo.listUsados({ ...filtros, limit, offset }), repo.countUsados(filtros)]);
  return {
    data: rows.map(mapUsado),
    meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}

export async function actualizar(
  id: number,
  input: { valorTradeIn?: number; precioVenta?: number; origen?: string; observaciones?: string | null },
  user: { id: number }
) {
  const existente = await repo.findEquipoUsado(id);
  if (!existente) throw AppError.notFound("USADO_NOT_FOUND", "Equipo usado no encontrado");

  await withTransaction(async (client) => {
    await repo.updateEquipoUsado(client, id, {
      valorTradeIn: input.valorTradeIn,
      origen: input.origen,
      observaciones: input.observaciones,
    });
    await repo.updateProductoUsadoPrecios(client, existente.producto_id, {
      precioCompra: input.valorTradeIn,
      precioVenta: input.precioVenta,
    });
  });
  await registrarAuditoria({
    usuarioId: user.id,
    accion: "ACTUALIZAR",
    entidad: "equipo_usado",
    entidadId: id,
    despues: input,
  });
  return mapUsado((await repo.findEquipoUsado(id))!);
}
