import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch } from "lucide-react";
import { useState } from "react";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import TicketDialog from "@/components/TicketDialog";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { ventasApi } from "@/lib/api";
import { fechaCorta, mxn } from "@/lib/utils";
import type { Venta } from "@/lib/types";

const estadoVariant: Record<string, "success" | "danger" | "warning"> = {
  completada: "success",
  cancelada: "danger",
  devuelta: "warning",
};

export default function VentasPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [folio, setFolio] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [ticket, setTicket] = useState<Venta | null>(null);
  const [devolver, setDevolver] = useState<Venta | null>(null);
  const [cancelar, setCancelar] = useState<Venta | null>(null);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [motivoDevolucion, setMotivoDevolucion] = useState("");
  const [tipoDevolucion, setTipoDevolucion] = useState<"reembolso" | "nota_credito">("reembolso");
  const [motivoCancelar, setMotivoCancelar] = useState("");

  const rol = getSessionUser()?.rol;

  const { data, isLoading } = useQuery({
    queryKey: ["ventas-historial", page, pageSize],
    queryFn: () => ventasApi.list({ page, pageSize }),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["ventas-historial"] });
  }

  const devolverMut = useMutation({
    mutationFn: () =>
      ventasApi.devolucion(
        devolver!.id,
        (devolver?.lineas ?? [])
          .filter((l) => l.productoId && (cantidades[l.productoId] ?? 0) > 0)
          .map((l) => ({ productoId: l.productoId!, cantidad: cantidades[l.productoId!] ?? 0 })),
        motivoDevolucion.trim() || undefined,
        tipoDevolucion
      ),
    onSuccess: () => {
      toast.success("Devolución registrada");
      setDevolver(null);
      setCantidades({});
      setMotivoDevolucion("");
      invalidate();
      qc.invalidateQueries({ queryKey: ["caja-corte"] });
    },
    onError: (e) => toast.error("Error al devolver", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const cancelarMut = useMutation({
    mutationFn: () => ventasApi.cancelar(cancelar!.id, motivoCancelar.trim()),
    onSuccess: () => {
      toast.success("Venta cancelada");
      setCancelar(null);
      setMotivoCancelar("");
      invalidate();
    },
    onError: (e) => toast.error("Error al cancelar", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function buscarFolio() {
    const f = folio.trim();
    if (!f) return;
    ventasApi
      .getByFolio(f)
      .then((r) => setTicket(r.data))
      .catch((e) => toast.error("Venta no encontrada", e instanceof Error ? e.message : ""));
  }

  const lineasDevolvibles = (devolver?.lineas ?? []).filter((l) => l.productoId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar folio (VEN-0001)…"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscarFolio();
              }
            }}
            className="w-56"
          />
          <Button variant="outline" onClick={buscarFolio}>
            <FileSearch className="h-4 w-4" /> Buscar
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10"><Spinner /></div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Folio</TH>
                  <TH>Fecha</TH>
                  <TH>Cliente</TH>
                  <TH>Vendedor</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Tipo</TH>
                  <TH>Estado</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {data?.data.map((v) => (
                  <TR key={v.id} className="cursor-pointer" onClick={() => setTicket(v)}>
                    <TD className="font-mono text-xs">{v.folio}</TD>
                    <TD className="text-muted">{v.createdAt ? fechaCorta(String(v.createdAt).slice(0, 10)) : "—"}</TD>
                    <TD>{v.clienteNombre ?? "Mostrador"}</TD>
                    <TD className="text-muted">{v.vendedorNombre}</TD>
                    <TD className="text-right font-semibold">{mxn(v.total)}</TD>
                    <TD className="capitalize">{v.tipoPago}</TD>
                    <TD><Badge variant={estadoVariant[v.estado] ?? "default"}>{v.estado}</Badge></TD>
                    <TD className="text-right text-muted">Ver →</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination
            page={page}
            totalPages={data?.meta.totalPages ?? 1}
            totalItems={data?.meta.totalItems}
            pageSize={pageSize}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            onPageChange={setPage}
          />
        </CardBody>
      </Card>

      <TicketDialog
        venta={ticket}
        onClose={() => setTicket(null)}
        reimpresion
        acciones={
          ticket &&
          ticket.estado !== "cancelada" && (
            <>
              {rol !== "tecnico" && ticket.estado !== "devuelta" && (ticket.lineas ?? []).some((l) => l.productoId) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const inicial: Record<number, number> = {};
                    for (const l of ticket.lineas ?? []) {
                      if (l.productoId) inicial[l.productoId] = l.cantidad;
                    }
                    setCantidades(inicial);
                    setTipoDevolucion(ticket.clienteId ? "nota_credito" : "reembolso");
                    setDevolver(ticket);
                  }}
                >
                  Devolver
                </Button>
              )}
              {rol === "admin" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setMotivoCancelar("");
                    setCancelar(ticket);
                  }}
                >
                  Cancelar venta
                </Button>
              )}
            </>
          )
        }
      />

      <Dialog open={!!devolver} onClose={() => setDevolver(null)} title={`Devolución · ${devolver?.folio ?? ""}`}>
        <div className="space-y-3">
          <p className="text-xs text-muted">
            La devolución restituye el inventario. El reembolso en efectivo se registra como egreso en la caja del día.
          </p>
          {devolver?.clienteId ? (
            <div>
              <Label>Forma de reembolso</Label>
              <select
                value={tipoDevolucion}
                onChange={(e) => setTipoDevolucion(e.target.value as "reembolso" | "nota_credito")}
                className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm"
              >
                <option value="nota_credito">Nota de crédito</option>
                <option value="reembolso">Reembolso en efectivo</option>
              </select>
            </div>
          ) : (
            <p className="text-sm text-warning">
              Venta a mostrador (sin cliente): la devolución se reembolsa en efectivo.
            </p>
          )}
          {lineasDevolvibles.length === 0 && <p className="text-sm text-danger">Esta venta no tiene productos devolvibles.</p>}
          {lineasDevolvibles.map((l) => (
            <div key={l.productoId} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.descripcion}</p>
                <p className="text-xs text-muted">
                  {mxn(l.precio)} × {l.cantidad}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                max={l.cantidad}
                value={cantidades[l.productoId!] ?? 0}
                onChange={(e) =>
                  setCantidades((c) => ({ ...c, [l.productoId!]: Math.max(0, Math.min(l.cantidad, Number(e.target.value) || 0)) }))
                }
                className="w-24"
                aria-label={`Cantidad a devolver de ${l.descripcion}`}
              />
            </div>
          ))}
          <div>
            <Label>Motivo (opcional)</Label>
            <Input value={motivoDevolucion} onChange={(e) => setMotivoDevolucion(e.target.value)} placeholder="Motivo de la devolución…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDevolver(null)}>Cancelar</Button>
            <Button disabled={lineasDevolvibles.length === 0 || devolverMut.isPending} onClick={() => devolverMut.mutate()}>
              {devolverMut.isPending ? "Devolviendo…" : "Registrar devolución"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!cancelar} onClose={() => setCancelar(null)} title={`Cancelar venta · ${cancelar?.folio ?? ""}`}>
        <div className="space-y-3">
          <p className="text-xs text-muted">Se revierte el inventario de la venta. Requiere rol admin.</p>
          <div>
            <Label>Motivo *</Label>
            <Input value={motivoCancelar} onChange={(e) => setMotivoCancelar(e.target.value)} placeholder="Motivo de la cancelación…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCancelar(null)}>Cancelar</Button>
            <Button variant="danger" disabled={!motivoCancelar.trim() || cancelarMut.isPending} onClick={() => cancelarMut.mutate()}>
              {cancelarMut.isPending ? "Cancelando…" : "Cancelar venta"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
