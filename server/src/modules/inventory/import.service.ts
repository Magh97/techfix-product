import ExcelJS from "exceljs";
import { Readable } from "stream";
import type { Response } from "express";
import { AppError } from "../../shared/errors";
import { sendExport, type ExportColumn } from "../../shared/export";
import { listCatalogos } from "../catalogos/catalogos.repository";
import { importRowSchema } from "./import.schema";
import * as repo from "./products.repository";

export interface ResultadoImportacion {
  importados: number;
  omitidos: { fila: number; sku: string; motivo: string }[];
  errores: { fila: number; sku: string; motivo: string }[];
}

interface Fila {
  numero: number;
  datos: Record<string, string>;
}

const HEADER_MAP: Record<string, string> = {
  sku: "sku",
  codigobarras: "codigoBarras",
  codigodebarras: "codigoBarras",
  nombre: "nombre",
  marca: "marca",
  modelo: "modelo",
  categoriaid: "categoriaId",
  categoria_id: "categoriaId",
  categoria: "categoriaId",
  preciocompra: "precioCompra",
  precio_compra: "precioCompra",
  precioventa: "precioVenta",
  precio_venta: "precioVenta",
  stockminimo: "stockMinimo",
  stock_minimo: "stockMinimo",
  stock: "stock",
  catalogoid: "catalogoId",
  catalogo_id: "catalogoId",
  catalogo: "catalogo",
  especificaciones: "especificaciones",
};

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_-]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mensajeError(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

async function parseFile(buffer: Buffer, filename: string): Promise<Fila[]> {
  const lower = filename.toLowerCase();
  const wb = new ExcelJS.Workbook();
  if (lower.endsWith(".csv")) {
    await wb.csv.read(Readable.from(buffer));
  } else if (lower.endsWith(".xlsx")) {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } else {
    throw AppError.badRequest("FORMATO_NO_SOPORTADO", "Solo se aceptan archivos .csv o .xlsx");
  }
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const filas: Fila[] = [];
  let headerKeys: string[] = [];
  ws.eachRow((row, rowNumber) => {
    const values = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
    if (rowNumber === 1) {
      headerKeys = values.map((v) => HEADER_MAP[normalizeHeader(v)] ?? "");
      return;
    }
    const datos: Record<string, string> = {};
    headerKeys.forEach((k, i) => {
      if (k) datos[k] = values[i] ?? "";
    });
    filas.push({ numero: rowNumber, datos });
  });
  return filas;
}

export async function importarProductos(buffer: Buffer, filename: string): Promise<ResultadoImportacion> {
  const filas = await parseFile(buffer, filename);
  if (!filas.length) throw AppError.badRequest("ARCHIVO_VACIO", "El archivo no contiene filas de datos");

  const omitidos: ResultadoImportacion["omitidos"] = [];
  const errores: ResultadoImportacion["errores"] = [];
  let importados = 0;

  for (const fila of filas) {
    const parsed = importRowSchema.safeParse(fila.datos);
    if (!parsed.success) {
      errores.push({ fila: fila.numero, sku: fila.datos.sku ?? "", motivo: mensajeError(parsed.error) });
      continue;
    }
    const d = parsed.data;

    if (await repo.findProductBySku(d.sku)) {
      omitidos.push({ fila: fila.numero, sku: d.sku, motivo: "SKU ya existe" });
      continue;
    }
    if (d.codigoBarras && (await repo.findProductByCode(d.codigoBarras))) {
      omitidos.push({ fila: fila.numero, sku: d.sku, motivo: "Código de barras ya existe" });
      continue;
    }
    if (!(await repo.categoriaExists(d.categoriaId))) {
      errores.push({ fila: fila.numero, sku: d.sku, motivo: `Categoría ${d.categoriaId} no existe` });
      continue;
    }

    let catalogoId = d.catalogoId ?? undefined;
    if (!catalogoId && d.catalogo) {
      const catalogos = await listCatalogos();
      const match = catalogos.find((c) => c.nombre.toLowerCase() === String(d.catalogo).toLowerCase());
      if (!match) {
        errores.push({ fila: fila.numero, sku: d.sku, motivo: `Catálogo "${d.catalogo}" no existe` });
        continue;
      }
      catalogoId = match.id;
    }

    let especificaciones: string[] | undefined;
    if (d.especificaciones) {
      try {
        const parsed = JSON.parse(d.especificaciones);
        if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
          errores.push({ fila: fila.numero, sku: d.sku, motivo: "Especificaciones deben ser un arreglo JSON de tags" });
          continue;
        }
        especificaciones = parsed;
      } catch {
        errores.push({ fila: fila.numero, sku: d.sku, motivo: "Especificaciones deben ser JSON válido" });
        continue;
      }
    }

    await repo.createProductWithStock({ ...d, catalogoId, especificaciones });
    importados++;
  }

  return { importados, omitidos, errores };
}

const COLUMNAS_PLANTILLA: ExportColumn[] = [
  { header: "SKU", key: "sku" },
  { header: "CodigoBarras", key: "codigoBarras" },
  { header: "Nombre", key: "nombre" },
  { header: "Marca", key: "marca" },
  { header: "Modelo", key: "modelo" },
  { header: "CategoriaId", key: "categoriaId" },
  { header: "Catalogo", key: "catalogo" },
  { header: "Especificaciones", key: "especificaciones" },
  { header: "PrecioCompra", key: "precioCompra" },
  { header: "PrecioVenta", key: "precioVenta" },
  { header: "StockMinimo", key: "stockMinimo" },
  { header: "Stock", key: "stock" },
];

const FILA_EJEMPLO: Record<string, unknown> = {
  sku: "PROC-002",
  codigoBarras: "7501221234102",
  nombre: "Procesador Intel i7-12700",
  marca: "Intel",
  modelo: "i7-12700",
  categoriaId: "1",
  catalogo: "Procesador",
  especificaciones: '["LGA1700","socket-LGA1700"]',
  precioCompra: "3000",
  precioVenta: "3400",
  stockMinimo: "3",
  stock: "10",
};

export async function descargarPlantilla(res: Response, formato: "csv" | "xlsx") {
  return sendExport(res, { formato, filename: "plantilla-productos", columns: COLUMNAS_PLANTILLA, rows: [FILA_EJEMPLO] });
}
