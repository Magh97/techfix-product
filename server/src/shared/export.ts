import ExcelJS from "exceljs";
import type { Response } from "express";

export interface ExportColumn {
  header: string;
  key: string;
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: ExportColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvCell(r[c.key])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export async function toXlsx(columns: ExportColumn[], rows: Record<string, unknown>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Reporte");
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 20 }));
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export interface SendExportInput {
  formato: "csv" | "xlsx";
  filename: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
}

export async function sendExport(res: Response, input: SendExportInput) {
  if (input.formato === "csv") {
    const content = toCsv(input.columns, input.rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${input.filename}.csv"`);
    return res.send(`\uFEFF${content}`);
  }
  const buf = await toXlsx(input.columns, input.rows);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${input.filename}.xlsx"`);
  return res.send(buf);
}
