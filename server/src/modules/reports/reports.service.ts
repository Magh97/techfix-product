import type { ExportColumn } from "../../shared/export";
import type { Response } from "express";
import { sendExport } from "../../shared/export";
import * as repo from "./reports.repository";

const toNum = (v: string | null | undefined) => Number(v ?? 0);

export interface ReporteFiltros {
  desde?: string;
  hasta?: string;
}

export async function inventario() {
  const rows = await repo.reporteInventario();
  const data = rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    codigoBarras: r.codigo_barras,
    nombre: r.nombre,
    marca: r.marca,
    modelo: r.modelo,
    categoria: r.categoria,
    stock: r.stock,
    stockMinimo: r.stock_minimo,
    precioCompra: toNum(r.precio_compra),
    precioVenta: toNum(r.precio_venta),
    valoracionCosto: toNum(r.valoracion_costo),
    lowStock: r.low_stock,
  }));
  return {
    data,
    resumen: {
      totalArticulos: data.reduce((a, b) => a + b.stock, 0),
      valorTotalCosto: data.reduce((a, b) => a + b.valoracionCosto, 0),
      stockBajo: data.filter((d) => d.lowStock).length,
    },
  };
}

export async function ventas(f: { desde?: string; hasta?: string; agrupar: string }) {
  const agrupar = ["dia", "producto", "vendedor", "metodo"].includes(f.agrupar) ? f.agrupar : "dia";
  const rows = await repo.reporteVentas({
    desde: f.desde,
    hasta: f.hasta,
    agrupar: agrupar as "dia" | "producto" | "vendedor" | "metodo",
  });
  const data = rows.map((r) => ({
    grupo: r.grupo,
    ventas: r.ventas,
    total: toNum(r.total),
    ...("unidades" in r ? { unidades: Number(r.unidades ?? 0) } : {}),
  }));
  return { data, resumen: { totalVentas: data.reduce((a, b) => a + b.ventas, 0), totalImporte: data.reduce((a, b) => a + b.total, 0) } };
}

export async function servicios(f: { desde?: string; hasta?: string; estado?: string; tecnicoId?: number }) {
  const [resumen, porEstado, porTecnico, porTipoEquipo, tiempoPromedio] = await Promise.all([
    repo.resumenServicios(f),
    repo.serviciosPorEstado(f),
    repo.serviciosPorTecnico(f),
    repo.serviciosPorTipoEquipo(f),
    repo.tiempoPromedioReparacion(f),
  ]);
  return {
    resumen: {
      total: resumen?.total ?? 0,
      enProceso: resumen?.en_proceso ?? 0,
      entregadas: resumen?.entregadas ?? 0,
      canceladas: resumen?.canceladas ?? 0,
      retrasadas: resumen?.retrasadas ?? 0,
      tiempoPromedioReparacionDias: tiempoPromedio,
    },
    porEstado: porEstado.map((r) => ({ estado: r.grupo, ordenes: r.ordenes })),
    porTecnico: porTecnico.map((r) => ({ tecnico: r.grupo, ordenes: r.ordenes })),
    porTipoEquipo: porTipoEquipo.map((r) => ({ tipoEquipo: r.grupo, ordenes: r.ordenes })),
  };
}

export async function exportar(
  res: Response,
  tipo: "inventario" | "ventas" | "servicios",
  formato: "csv" | "xlsx",
  f: { desde?: string; hasta?: string; agrupar?: string; estado?: string; tecnicoId?: number }
) {
  let columns: ExportColumn[] = [];
  let rows: Record<string, unknown>[] = [];

  if (tipo === "inventario") {
    const r = await repo.reporteInventario();
    columns = [
      { header: "SKU", key: "sku" },
      { header: "Codigo barras", key: "codigo_barras" },
      { header: "Nombre", key: "nombre" },
      { header: "Marca", key: "marca" },
      { header: "Modelo", key: "modelo" },
      { header: "Categoria", key: "categoria" },
      { header: "Stock", key: "stock" },
      { header: "Stock minimo", key: "stock_minimo" },
      { header: "Precio compra", key: "precio_compra" },
      { header: "Precio venta", key: "precio_venta" },
      { header: "Valoracion costo", key: "valoracion_costo" },
      { header: "Stock bajo", key: "low_stock" },
    ];
    rows = r.map((x) => ({ ...x, precio_compra: toNum(x.precio_compra), precio_venta: toNum(x.precio_venta), valoracion_costo: toNum(x.valoracion_costo) }));
  } else if (tipo === "ventas") {
    const agrupar = ["dia", "producto", "vendedor", "metodo"].includes(f.agrupar ?? "") ? f.agrupar! : "dia";
    const r = await repo.reporteVentas({ desde: f.desde, hasta: f.hasta, agrupar: agrupar as never });
    columns = [{ header: "Grupo", key: "grupo" }, { header: "Ventas", key: "ventas" }, { header: "Total", key: "total" }];
    if (agrupar === "producto") columns.push({ header: "Unidades", key: "unidades" });
    rows = r.map((x) => ({ ...x, total: toNum(x.total) }));
  } else {
    const r = await repo.serviciosDetalle(f);
    columns = [
      { header: "Folio", key: "folio" },
      { header: "Cliente", key: "cliente" },
      { header: "Tipo equipo", key: "tipo_equipo" },
      { header: "Marca", key: "marca" },
      { header: "Modelo", key: "modelo" },
      { header: "Falla", key: "falla_reportada" },
      { header: "Estado", key: "estado" },
      { header: "Retrasada", key: "retrasada" },
      { header: "Tecnico", key: "tecnico" },
      { header: "Fecha prometida", key: "fecha_prometida" },
      { header: "Fecha entrega", key: "fecha_entrega" },
    ];
    rows = r as unknown as Record<string, unknown>[];
  }

  return sendExport(res, { formato, filename: `reporte-${tipo}`, columns, rows });
}
