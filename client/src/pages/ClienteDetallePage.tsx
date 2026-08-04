import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { clientesApi, ventasApi } from "@/lib/api";
import { fechaCorta, mxn } from "@/lib/utils";

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const clienteId = Number(id);
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"historial" | "cxc">("historial");
  const [abono, setAbono] = useState<{ ventaId: number; folio: string; saldo: number } | null>(null);
  const [monto, setMonto] = useState("0");

  const { data: cliente } = useQuery({ queryKey: ["cliente", clienteId], queryFn: () => clientesApi.get(clienteId) });
  const { data: historial } = useQuery({ queryKey: ["cliente-historial", clienteId], queryFn: () => clientesApi.historial(clienteId) });
  const { data: cxc } = useQuery({ queryKey: ["cliente-cxc", clienteId], queryFn: () => clientesApi.cxc(clienteId) });

  const pagar = useMutation({
    mutationFn: () => ventasApi.pagar(abono!.ventaId, { monto: Number(monto), metodo: "efectivo" }),
    onSuccess: () => {
      toast.success("Abono registrado");
      setAbono(null);
      qc.invalidateQueries({ queryKey: ["cliente-cxc"] });
      qc.invalidateQueries({ queryKey: ["cliente", clienteId] });
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  if (!cliente?.data) {
    return (
      <div className="grid place-items-center p-16">
        <Spinner />
      </div>
    );
  }
  const c = cliente.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Clientes
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.nombre}</h1>
          <p className="text-sm text-muted">{c.telefono} · {c.correo ?? "sin correo"}</p>
        </div>
        <Link to="/venta">
          <Button>
            <ShoppingCart className="h-4 w-4" /> Vender
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase text-muted">Límite de crédito</p>
            <p className="mt-1 text-xl font-bold">{mxn(c.limiteCredito)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase text-muted">Saldo pendiente</p>
            <p className="mt-1 text-xl font-bold text-warning">{mxn(c.saldoPendiente)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase text-muted">Preferencia</p>
            <p className="mt-1 text-xl font-bold capitalize">{c.preferenciaContacto}</p>
          </CardBody>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "historial" ? "accent" : "outline"} size="sm" onClick={() => setTab("historial")}>Historial</Button>
        <Button variant={tab === "cxc" ? "accent" : "outline"} size="sm" onClick={() => setTab("cxc")}>
          Cuentas por cobrar {cxc?.data.items.some((i) => i.estado === "vencido") ? "⚠" : ""}
        </Button>
      </div>

      {tab === "historial" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Órdenes de servicio</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              {historial?.data.ordenes.length === 0 && <p className="text-muted">Sin órdenes.</p>}
              {historial?.data.ordenes.map((o) => (
                <Link key={o.id} to={`/ordenes/${o.id}`} className="flex justify-between rounded-md border border-border-line px-3 py-2 hover:bg-surface-2">
                  <span className="font-mono text-xs">{o.folio}</span>
                  <Badge variant={o.retrasada ? "danger" : "default"}>{o.retrasada ? "Retrasada" : o.estado}</Badge>
                </Link>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ventas</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              {historial?.data.ventas.length === 0 && <p className="text-muted">Sin ventas.</p>}
              {historial?.data.ventas.map((v) => (
                <div key={v.id} className="flex justify-between rounded-md border border-border-line px-3 py-2">
                  <span className="font-mono text-xs">{v.folio}</span>
                  <span className="font-semibold">{mxn(v.total)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "cxc" && (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR><TH>Folio</TH><TH className="text-right">Total</TH><TH className="text-right">Saldo</TH><TH>Vence</TH><TH>Estado</TH><TH /></TR>
              </THead>
              <tbody>
                {cxc?.data.items.map((i) => (
                  <TR key={i.ventaId}>
                    <TD className="font-mono text-xs">{i.folio}</TD>
                    <TD className="text-right">{mxn(i.total)}</TD>
                    <TD className="text-right">{mxn(i.saldo)}</TD>
                    <TD className="text-muted">{i.fechaVencimiento ? fechaCorta(i.fechaVencimiento) : "—"}</TD>
                    <TD>
                      <Badge variant={i.estado === "vencido" ? "danger" : i.estado === "pagado" ? "success" : "warning"}>{i.estado}</Badge>
                    </TD>
                    <TD className="text-right">
                      {i.saldo > 0 && (
                        <Button size="sm" variant="outline" onClick={() => { setAbono({ ventaId: i.ventaId, folio: i.folio, saldo: i.saldo }); setMonto(String(i.saldo)); }}>
                          Abonar
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Dialog open={!!abono} onClose={() => setAbono(null)} title={`Abonar · ${abono?.folio ?? ""}`}>
        <div className="space-y-3">
          <div>
            <Label>Monto a abonar</Label>
            <Input type="number" min={0.01} max={abono?.saldo} value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <p className="text-xs text-muted">Saldo pendiente: {abono ? mxn(abono.saldo) : ""}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAbono(null)}>Cancelar</Button>
            <Button disabled={pagar.isPending || Number(monto) <= 0} onClick={() => pagar.mutate()}>Registrar abono</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
