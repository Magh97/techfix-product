import type { PoolClient } from "pg";
import { withTransaction } from "../../shared/db";
import { AppError } from "../../shared/errors";
import { getConfig } from "../../shared/config";
import { calcMoney } from "../../shared/money";
import { registrarAuditoria } from "../../shared/auditoria";
import * as repo from "./ventas.repository";
import * as garantiasRepo from "../garantias/garantias.repository";
import * as usadosRepo from "../inventory/usados.repository";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string | Date, days: number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface VentaDTO {
  id: number;
  folio: string;
  clienteId: number | null;
  vendedorId: number;
  ordenId: number | null;
  subtotal: number;
  iva: number;
  total: number;
  descuento: number;
  tipoPago: string;
  metodoPago: string | null;
  fechaVencimiento: string | null;
  estado: string;
  cambio: number;
  lineas: { descripcion: string; cantidad: number; precio: number; productoId?: number | null }[];
  garantias: { tipo: string; inicio: string; fin: string }[];
  parteDePago: number;
  notaCredito: number;
  totalAPagar: number;
  usadosCreados: { productoId: number; nombre: string; valor: number }[];
  pagos: { metodo: string; monto: number }[];
}

export async function registrarVenta(
  input: repo.RegistrarVentaInput,
  user: { id: number; rol: string },
  client?: PoolClient
): Promise<VentaDTO> {
  const run = async (c: PoolClient): Promise<VentaDTO> => {
    const lineasDetalle: { descripcion: string; cantidad: number; precio: number; productoId?: number | null }[] = [];
    let subtotal = 0;
    for (const l of input.lineas) {
      if (l.tipo === "producto") {
        if (!l.productoId || !l.cantidad || l.cantidad <= 0) {
          throw AppError.badRequest("VALIDATION_ERROR", "Producto requiere cantidad válida");
        }
        const p = await repo.findProductoParaVenta(c, l.productoId);
        if (!p) throw AppError.notFound("PRODUCT_NOT_FOUND", "Producto no encontrado");

        if (p.is_kit) {
          // ADR-0003: desglosar componentes y descontar stock de cada pieza
          const bom = await repo.listBomParaVenta(c, p.id);
          if (!bom.length) throw AppError.business("KIT_WITHOUT_BOM", `El kit ${p.nombre} no tiene componentes definidos`);
          for (const comp of bom) {
            const cant = comp.cantidad * l.cantidad;
            if (comp.stock < cant) {
              throw AppError.business("INSUFFICIENT_STOCK", `${comp.nombre}: stock disponible ${comp.stock}`);
            }
            const res = await repo.decrementStock(c, comp.componente_id, cant);
            if (!res.rowCount) throw AppError.business("INSUFFICIENT_STOCK", `${comp.nombre}: stock insuficiente`);
            const precio = Number(comp.precio_venta) * cant;
            subtotal += precio;
            lineasDetalle.push({
              descripcion: `${p.nombre} · ${comp.nombre}`,
              cantidad: cant,
              precio,
              productoId: comp.componente_id,
            });
            await repo.insertMovimiento(c, {
              productoId: comp.componente_id,
              tipo: "SALIDA_VENTA",
              cantidad: -cant,
              usuarioId: user.id,
              motivo: `Venta kit ${p.nombre}`,
            });
          }
          const manoObra = Number(p.mano_obra) * l.cantidad;
          if (manoObra > 0) {
            subtotal += manoObra;
            lineasDetalle.push({
              descripcion: `Mano de obra de ensamble · ${p.nombre}`,
              cantidad: l.cantidad,
              precio: manoObra,
              productoId: null,
            });
          }
        } else {
          if (p.stock < l.cantidad) {
            throw AppError.business("INSUFFICIENT_STOCK", `${p.nombre}: stock disponible ${p.stock}`);
          }
          const res = await repo.decrementStock(c, l.productoId, l.cantidad);
          if (!res.rowCount) throw AppError.business("INSUFFICIENT_STOCK", `${p.nombre}: stock insuficiente`);
          const precio = Number(p.precio_venta) * l.cantidad;
          subtotal += precio;
          lineasDetalle.push({ descripcion: p.nombre, cantidad: l.cantidad, precio, productoId: l.productoId });
          await repo.insertMovimiento(c, {
            productoId: l.productoId,
            tipo: "SALIDA_VENTA",
            cantidad: -l.cantidad,
            usuarioId: user.id,
            motivo: "Venta",
          });
        }
      } else {
        const unit = l.precioNeto ?? 0;
        const cantidad = l.cantidad || 1;
        const precio = unit * cantidad;
        subtotal += precio;
        lineasDetalle.push({ descripcion: l.nombre ?? "Servicio", cantidad, precio, productoId: null });
      }
    }

    if (!lineasDetalle.length) throw AppError.badRequest("VALIDATION_ERROR", "La venta requiere al menos una línea");

    const config = await getConfig();
    const descuento = Math.max(0, input.descuento ?? 0);
    if (descuento > subtotal) throw AppError.badRequest("VALIDATION_ERROR", "El descuento no puede superar el subtotal");
    if (user.rol !== "admin" && descuento > subtotal * config.descuentoVendedorMax) {
      throw AppError.forbidden("Descuento superior al máximo autorizado para vendedor (BR-VEN-05)");
    }

    const mon = calcMoney(subtotal, descuento, config.ivaRate);

    // Parte de pago en especie (equipo usado). Solo ventas de contado.
    const partesDePago = input.partesDePago ?? [];
    const parteDePago = partesDePago.reduce((a, p) => a + p.valor, 0);
    if (parteDePago > 0) {
      if (input.tipoPago !== "contado") {
        throw AppError.business("PARTE_DE_PAGO_INVALIDA", "La parte de pago solo aplica en ventas de contado");
      }
      if (parteDePago > mon.total) {
        throw AppError.business("PARTE_DE_PAGO_INVALIDA", `La parte de pago (${parteDePago}) supera el total (${mon.total})`);
      }
    }

    // Nota de crédito: saldo a favor del cliente aplicable a ventas de contado.
    let notaCredito = 0;
    let notaCreditoId: number | null = null;
    if (input.notaCreditoId) {
      if (input.tipoPago !== "contado") {
        throw AppError.business("NOTA_CREDITO_INVALIDA", "La nota de crédito solo aplica en ventas de contado");
      }
      if (!input.clienteId) {
        throw AppError.business("NOTA_CREDITO_INVALIDA", "La nota de crédito requiere un cliente");
      }
      const nota = await repo.findNotaCredito(input.notaCreditoId);
      if (!nota) throw AppError.notFound("NOTA_CREDITO_NOT_FOUND", "Nota de crédito no encontrada");
      if (nota.cliente_id !== input.clienteId) {
        throw AppError.business("NOTA_CREDITO_INVALIDA", "La nota de crédito pertenece a otro cliente");
      }
      if (Number(nota.saldo) <= 0) {
        throw AppError.business("NOTA_CREDITO_SIN_SALDO", "La nota de crédito no tiene saldo disponible");
      }
      notaCredito = Math.min(Number(nota.saldo), mon.total - parteDePago);
      notaCreditoId = nota.id;
    }
    const totalAPagar = Math.max(0, mon.total - parteDePago - notaCredito);

    // Desglose de pago (pagos mixtos): todo dinero recibido se registra en `pagos`.
    if (input.pagos?.length && input.tipoPago !== "contado") {
      throw AppError.business("PAGOS_INVALIDOS", "El desglose de pagos solo aplica en ventas de contado");
    }
    let detallePagos: { metodo: string; monto: number }[];
    if (input.tipoPago === "contado") {
      if (totalAPagar <= 0) {
        detallePagos = [];
      } else if (input.pagos?.length) {
        if (input.pagos.length > 5) throw AppError.business("PAGOS_INVALIDOS", "Máximo 5 métodos de pago por venta");
        const suma = input.pagos.reduce((a, p) => a + p.monto, 0);
        if (Math.abs(suma - totalAPagar) > 0.01) {
          throw AppError.business("PAGOS_INVALIDOS", `La suma del desglose (${suma}) debe ser igual al total a pagar (${totalAPagar})`);
        }
        detallePagos = input.pagos.map((p) => ({ metodo: p.metodo, monto: p.monto }));
      } else {
        detallePagos = [{ metodo: input.metodoPago ?? "efectivo", monto: totalAPagar }];
      }
    } else {
      detallePagos = [];
    }

    const efectivoPortion = detallePagos.filter((p) => p.metodo === "efectivo").reduce((a, p) => a + p.monto, 0);
    const recibido = efectivoPortion > 0 ? (input.montoRecibido ?? efectivoPortion) : null;
    if (recibido !== null && recibido < efectivoPortion) {
      throw AppError.business("PAYMENT_INVALID", `El efectivo recibido (${recibido}) es menor a la porción en efectivo (${efectivoPortion})`);
    }
    const cambio = efectivoPortion > 0 ? Math.max(0, (recibido ?? 0) - efectivoPortion) : 0;
    const metodoPrimario = detallePagos[0]?.metodo ?? input.metodoPago ?? null;

    let fechaVencimiento: string | null = null;
    let plazoDias: number | null = null;
    if (input.tipoPago === "credito") {
      if (!input.clienteId) throw AppError.badRequest("VALIDATION_ERROR", "La venta a crédito requiere un cliente");
      const cliente = await repo.findClienteCredito(c, input.clienteId);
      if (!cliente) throw AppError.notFound("CUSTOMER_NOT_FOUND", "Cliente no encontrado");
      const saldo = await repo.saldoCliente(c, input.clienteId);
      if (saldo + mon.total > Number(cliente.limite_credito)) {
        throw AppError.business("CREDIT_LIMIT_EXCEEDED", `La venta excede el límite de crédito del cliente`);
      }
      plazoDias = input.plazoDias ?? cliente.plazo_credito_dias;
      fechaVencimiento = addDays(today(), plazoDias);
    }

    const cajaId = await repo.findCajaAbierta(c, input.vendedorId, today());
    const folio = await repo.nextVentaFolio(c);
    const ventaId = await repo.insertVenta(c, {
      folio,
      clienteId: input.clienteId ?? null,
      vendedorId: input.vendedorId,
      ordenId: input.ordenId ?? null,
      subtotal: mon.subtotal,
      iva: mon.iva,
      total: mon.total,
      descuento: mon.descuento,
      motivoDescuento: descuento > 0 ? (input.motivoDescuento ?? "Autorizado en caja") : null,
      tipoPago: input.tipoPago,
      metodoPago: metodoPrimario,
      plazoDias: input.tipoPago === "credito" ? plazoDias : null,
      fechaVencimiento,
      montoRecibido: recibido,
      parteDePago,
      cajaId,
      notaCredito,
      notaCreditoId,
    });
    if (!ventaId) throw AppError.business("INTERNAL_ERROR", "No se pudo registrar la venta");
    await repo.insertDetalleVenta(c, ventaId, lineasDetalle);

    // Consumir el saldo de la nota de crédito aplicada
    if (notaCreditoId && notaCredito > 0) {
      const resNota = await repo.decrementarSaldoNota(c, notaCreditoId, notaCredito);
      if (!resNota.rowCount) throw AppError.business("NOTA_CREDITO_SIN_SALDO", "La nota de crédito no tiene saldo suficiente");
    }

    // Registrar el desglose de pagos (todo dinero recibido en la venta)
    for (const p of detallePagos) {
      await repo.insertPago(c, { ventaId, monto: p.monto, metodo: p.metodo, usuarioId: user.id, cajaId });
    }

    // Crear los usados recibidos como parte de pago (en la misma transacción)
    const usadosCreados: { productoId: number; nombre: string; valor: number }[] = [];
    if (parteDePago > 0) {
      const categoriaUsado = await usadosRepo.findCategoriaUsado();
      if (!categoriaUsado) {
        throw AppError.business("CATEGORIA_USADO_NOT_FOUND", "No existe la categoría raíz 'Usado' en el catálogo");
      }
      let i = 0;
      for (const p of partesDePago) {
        i++;
        const productoId = await usadosRepo.insertProductoUsado(c, {
          categoriaId: categoriaUsado.id,
          sku: `USO-${Date.now()}-${i}`,
          nombre: p.nombre,
          marca: p.marca ?? null,
          modelo: p.modelo ?? null,
          precioCompra: p.valor,
          precioVenta: p.precioVenta,
          stock: 1,
          catalogoId: null,
        });
        if (!productoId) throw AppError.business("INTERNAL_ERROR", "No se pudo crear el producto usado");
        const equipoId = await usadosRepo.insertEquipoUsado(c, {
          productoId,
          clienteOrigenId: input.clienteId ?? null,
          ordenId: null,
          ventaId,
          valorTradeIn: p.valor,
          origen: "parte_de_pago",
          observaciones: p.observaciones ?? null,
          createdBy: user.id,
        });
        if (!equipoId) throw AppError.business("INTERNAL_ERROR", "No se pudo registrar el equipo usado");
        await usadosRepo.insertMovimientoEntrada(c, { productoId, cantidad: 1, usuarioId: user.id, equipoId });
        usadosCreados.push({ productoId, nombre: p.nombre, valor: p.valor });
      }
    }

    // Garantía por producto distinto cuando la venta tiene cliente
    // (usado → dias_garantia_usado; resto → dias_garantia_producto). BR-GAR-06.
    const garantias: { tipo: string; inicio: string; fin: string }[] = [];
    if (input.clienteId) {
      const usados = new Set(await garantiasRepo.productosUsadosDeVenta(c, ventaId));
      const productosDistintos = [...new Set(lineasDetalle.filter((l) => l.productoId).map((l) => l.productoId!))];
      const hoy = today();
      for (const pid of productosDistintos) {
        const tipo = usados.has(pid) ? "usado" : "producto_nuevo";
        const dias = tipo === "usado" ? config.diasGarantiaUsado : config.diasGarantiaProducto;
        const fin = addDays(hoy, dias);
        await garantiasRepo.insertGarantiaVenta(c, { ventaId, clienteId: input.clienteId, tipo, inicio: hoy, fin });
        garantias.push({ tipo, inicio: hoy, fin });
      }
    }

    return {
      id: ventaId,
      folio,
      clienteId: input.clienteId ?? null,
      vendedorId: input.vendedorId,
      ordenId: input.ordenId ?? null,
      subtotal: mon.subtotal,
      iva: mon.iva,
      total: mon.total,
      descuento: mon.descuento,
      tipoPago: input.tipoPago,
      metodoPago: input.metodoPago ?? null,
      fechaVencimiento,
      estado: "completada",
      cambio,
      lineas: lineasDetalle,
      garantias,
      parteDePago,
      notaCredito,
      totalAPagar,
      usadosCreados,
      pagos: detallePagos,
    };
  };

  const dto = client ? await run(client) : await withTransaction(run);
  await registrarAuditoria({
    usuarioId: user.id,
    accion: "CREAR",
    entidad: "venta",
    entidadId: dto.id,
    despues: { folio: dto.folio, total: dto.total, tipoPago: dto.tipoPago },
  });
  return dto;
}

/* --- Lecturas --- */

function mapVentaLinea(l: repo.VentaLineaRow) {
  return {
    descripcion: l.descripcion_servicio ?? l.nombre_producto ?? "Servicio",
    cantidad: l.cantidad,
    precio: Number(l.precio_neto),
    productoId: l.producto_id,
  };
}

export async function list(f: { desde?: string; hasta?: string; vendedorId?: number; metodoPago?: string; estado?: string; page: number; pageSize: number }) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { desde: f.desde, hasta: f.hasta, vendedorId: f.vendedorId, metodoPago: f.metodoPago, estado: f.estado };
  const [rows, totalItems] = await Promise.all([repo.listVentas({ ...filtros, limit, offset }), repo.countVentas(filtros)]);
  const data = await Promise.all(
    rows.map(async (v) => ({
      id: v.id,
      folio: v.folio,
      clienteId: v.cliente_id,
      clienteNombre: v.cliente_nombre,
      vendedorNombre: v.vendedor_nombre,
      ordenId: v.orden_id,
      subtotal: Number(v.subtotal),
      iva: Number(v.iva),
      total: Number(v.total),
      descuento: Number(v.descuento),
      tipoPago: v.tipo_pago,
      metodoPago: v.metodo_pago,
      fechaVencimiento: v.fecha_vencimiento ? addDays(v.fecha_vencimiento, 0) : null,
      estado: v.estado,
      createdAt: v.created_at,
      lineas: (await repo.listVentaLineas(v.id)).map(mapVentaLinea),
    }))
  );
  return { data, meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 } };
}

export async function getById(id: number) {
  const v = await repo.findVenta(id);
  if (!v) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  return {
    id: v.id,
    folio: v.folio,
    clienteId: v.cliente_id,
    clienteNombre: v.cliente_nombre,
    vendedorNombre: v.vendedor_nombre,
    ordenId: v.orden_id,
    subtotal: Number(v.subtotal),
    iva: Number(v.iva),
    total: Number(v.total),
    descuento: Number(v.descuento),
    motivoDescuento: v.motivo_descuento,
    tipoPago: v.tipo_pago,
    metodoPago: v.metodo_pago,
    fechaVencimiento: v.fecha_vencimiento ? addDays(v.fecha_vencimiento, 0) : null,
    montoRecibido: v.monto_recibido ? Number(v.monto_recibido) : null,
    estado: v.estado,
    createdAt: v.created_at,
    lineas: (await repo.listVentaLineas(v.id)).map(mapVentaLinea),
    pagos: (await repo.listPagos(v.id)).map((p) => ({ id: p.id, monto: Number(p.monto), metodo: p.metodo, fecha: p.created_at })),
  };
}

export async function getByFolio(folio: string) {
  const v = await repo.findVentaByFolio(folio);
  if (!v) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  return getById(v.id);
}

/* --- Pagos / abonos --- */

export async function registrarAbono(ventaId: number, input: { monto: number; metodo: string }, user: { id: number }) {
  const venta = await repo.findVenta(ventaId);
  if (!venta) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  if (venta.tipo_pago !== "credito") throw AppError.conflict("SALE_NOT_CREDIT", "La venta no es a crédito");

  return withTransaction(async (c) => {
    const saldo = (await repo.sumPagos(c, ventaId)) as number;
    const total = Number(venta.total);
    const pendiente = Math.max(0, total - saldo);
    if (input.monto <= 0 || input.monto > pendiente) {
      throw AppError.business("PAYMENT_INVALID", `Monto inválido: pendiente ${pendiente}`);
    }
    const cajaId = await repo.findCajaAbierta(c, venta.vendedor_id, today());
    await repo.insertPago(c, { ventaId, monto: input.monto, metodo: input.metodo, usuarioId: user.id, cajaId });
    if (Math.abs(pendiente - input.monto) < 0.001) {
      await repo.updateVentaEstado(c, ventaId, "completada");
    }
    return { ventaId, monto: input.monto, saldoPendiente: Math.max(0, pendiente - input.monto) };
  });
}

/* --- Cancelación (admin) y devolución --- */

export async function cancelar(ventaId: number, motivo: string, user: { id: number; rol: string }) {
  if (user.rol !== "admin") throw AppError.forbidden("Solo el administrador puede cancelar ventas");
  const venta = await repo.findVenta(ventaId);
  if (!venta) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  if (venta.estado === "cancelada") throw AppError.conflict("SALE_ALREADY_CANCELLED", "La venta ya está cancelada");
  if (venta.tipo_pago === "credito") {
    const pagado = await repo.sumPagosVenta(ventaId);
    if (pagado > 0) throw AppError.business("SALE_WITH_PAYMENTS", "No se puede cancelar una venta a crédito con abonos cobrados");
  }

  await withTransaction(async (c) => {
    const lineas = await repo.listVentaLineas(ventaId);
    for (const l of lineas) {
      if (l.producto_id) {
        await repo.incrementStock(c, l.producto_id, l.cantidad);
        await repo.insertMovimiento(c, {
          productoId: l.producto_id,
          tipo: "DEVOLUCION",
          cantidad: l.cantidad,
          usuarioId: user.id,
          motivo: `Cancelación venta ${venta.folio}`,
        });
      }
    }
    await repo.reintegrarUsadosVenta(c, ventaId);
    await repo.updateVentaEstado(c, ventaId, "cancelada");
  });
  await registrarAuditoria({ usuarioId: user.id, accion: "CANCELAR", entidad: "venta", entidadId: ventaId, despues: { motivo } });
  return getById(ventaId);
}

export async function devolucion(
  ventaId: number,
  input: { lineas: { productoId: number; cantidad: number }[]; motivo?: string },
  user: { id: number; rol: string }
) {
  const venta = await repo.findVenta(ventaId);
  if (!venta) throw AppError.notFound("SALE_NOT_FOUND", "Venta no encontrada");
  if (venta.estado === "devuelta" || venta.estado === "cancelada") {
    throw AppError.conflict("SALE_ALREADY_PROCESSED", "La venta ya fue devuelta o cancelada");
  }
  if (venta.tipo_pago === "credito") {
    const pagado = await repo.sumPagosVenta(ventaId);
    if (pagado > 0) throw AppError.business("SALE_WITH_PAYMENTS", "No se puede devolver una venta a crédito con abonos cobrados");
  }
  const config = await getConfig();
  const ventana = addDays(venta.created_at, config.diasDevolucion);
  if (ventana < today()) {
    throw AppError.business("REFUND_WINDOW_EXPIRED", `Solo se aceptan devoluciones dentro de ${config.diasDevolucion} días (BR-VEN-08)`);
  }

  // Total devuelto: suma del precio unitario de las líneas devueltas (BR-VEN-08).
  const lineasVenta = await repo.listVentaLineas(ventaId);
  const precioUnitarioPorProducto = new Map<number, number>();
  for (const l of lineasVenta) {
    if (l.producto_id && !precioUnitarioPorProducto.has(l.producto_id)) {
      precioUnitarioPorProducto.set(l.producto_id, l.cantidad > 0 ? Number(l.precio_neto) / l.cantidad : 0);
    }
  }
  const totalDevuelto = input.lineas.reduce((acc, l) => acc + (precioUnitarioPorProducto.get(l.productoId) ?? 0) * l.cantidad, 0);

  await withTransaction(async (c) => {
    for (const l of input.lineas) {
      await repo.incrementStock(c, l.productoId, l.cantidad);
      await repo.insertMovimiento(c, {
        productoId: l.productoId,
        tipo: "DEVOLUCION",
        cantidad: l.cantidad,
        usuarioId: user.id,
        motivo: `Devolución venta ${venta.folio}`,
      });
    }
    await repo.reintegrarUsadosVenta(c, ventaId);
    // Nota de crédito por el total devuelto: solo ventas de contado con cliente.
    // (Una venta a crédito sin abonos se devuelve sin dinero cobrado; la CxC se excluye por estado devuelta.)
    if (venta.tipo_pago === "contado" && venta.cliente_id && totalDevuelto > 0) {
      const folioNota = await repo.nextNotaCreditoFolio(c);
      await repo.insertNotaCredito(c, {
        folio: folioNota,
        clienteId: venta.cliente_id,
        monto: totalDevuelto,
        ventaId,
        motivo: input.motivo ?? null,
        createdBy: user.id,
      });
    }
    await repo.updateVentaEstado(c, ventaId, "devuelta");
  });
  await registrarAuditoria({
    usuarioId: user.id,
    accion: "DEVOLUCION",
    entidad: "venta",
    entidadId: ventaId,
    despues: { lineas: input.lineas, motivo: input.motivo ?? null, notaCredito: totalDevuelto },
  });
  return getById(ventaId);
}
