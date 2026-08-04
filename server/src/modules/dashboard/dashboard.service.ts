import * as repo from "./dashboard.repository";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const toNum = (v: string | null | undefined) => Number(v ?? 0);

export async function resumen(usuarioId: number) {
  const [vHoy, ordenes, inventario, caja, topProductos, topDeudores] = await Promise.all([
    repo.ventasHoy(today()),
    repo.resumenOrdenes(),
    repo.resumenInventario(),
    repo.cajaAbierta(usuarioId, today()),
    repo.topProductos(),
    repo.topDeudores(),
  ]);

  const totalHoy = toNum(vHoy?.total);
  return {
    ventasHoy: {
      cantidad: vHoy?.cantidad ?? 0,
      total: totalHoy,
      ticketPromedio: vHoy?.cantidad ? totalHoy / vHoy.cantidad : 0,
    },
    ordenes: {
      activas: ordenes?.activas ?? 0,
      retrasadas: ordenes?.retrasadas ?? 0,
    },
    inventario: {
      stockBajo: inventario?.stock_bajo ?? 0,
      totalProductos: inventario?.total_productos ?? 0,
    },
    cajaAbierta: caja,
    topProductos: topProductos.map((p) => ({ nombre: p.nombre, unidades: p.unidades, ingreso: toNum(p.ingreso) })),
    topDeudores: topDeudores.map((d) => ({ clienteId: d.cliente_id, clienteNombre: d.cliente_nombre, saldo: toNum(d.saldo_total) })),
  };
}
