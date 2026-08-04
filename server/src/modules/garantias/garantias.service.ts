import * as notifications from "../notifications/notifications.service";
import * as notificationsRepo from "../notifications/notifications.repository";
import * as repo from "./garantias.repository";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function estadoDe(fin: string): "vigente" | "por_vencer" | "vencida" {
  const f = String(fin).slice(0, 10);
  const hoy = today();
  if (f < hoy) return "vencida";
  return f <= addDays(hoy, 3) ? "por_vencer" : "vigente";
}

function mapGarantia(r: repo.GarantiaRow) {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre,
    folio: r.orden_folio ?? r.venta_folio ?? null,
    tipo: r.tipo,
    inicio: String(r.inicio).slice(0, 10),
    fin: String(r.fin).slice(0, 10),
    estado: estadoDe(String(r.fin)),
  };
}

export async function list(f: { clienteId?: number; estado?: string; page: number; pageSize: number }) {
  const limit = f.pageSize;
  const offset = (f.page - 1) * limit;
  const filtros = { clienteId: f.clienteId, estado: f.estado };
  const [rows, totalItems] = await Promise.all([
    repo.listGarantias({ ...filtros, limit, offset }),
    repo.countGarantias(filtros),
  ]);
  return {
    data: rows.map(mapGarantia),
    meta: { page: f.page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 },
  };
}

export async function listCliente(clienteId: number) {
  const rows = await repo.listClienteGarantias(clienteId);
  return rows.map(mapGarantia);
}

// NOT-04: worker diario que recuerda garantías por vencer (deduplicado)
export async function marcarGarantiasPorVencer() {
  const garantias = await repo.findGarantiasPorVencer();
  let enviadas = 0;
  for (const g of garantias) {
    if (await notificationsRepo.existeNotifGarantia(g.id)) continue;
    try {
      await notifications.notificarGarantia(g.id);
      enviadas++;
    } catch (err) {
      console.error(`[notif:garantia] garantia ${g.id}:`, err);
    }
  }
  return enviadas;
}
