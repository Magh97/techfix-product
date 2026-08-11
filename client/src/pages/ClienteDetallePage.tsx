import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import DesglosePago from "@/components/DesglosePago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { clientesApi, usadosApi, ventasApi } from "@/lib/api";
import { fechaCorta, mxn } from "@/lib/utils";
import type { OrigenUsado } from "@/lib/types";

const ORIGEN_USADO_LABEL: Record<OrigenUsado, string> = {
  parte_de_pago: "Parte de pago",
  reparacion: "Reparación",
  otro: "Otro",
};

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const clienteId = Number(id);
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"historial" | "cxc">("historial");
  const [abono, setAbono] = useState<{ ventaId: number; folio: string; saldo: number } | null>(null);
  const [monto, setMonto] = useState("0");
  const [pagosAbono, setPagosAbono] = useState<{ metodo: string; monto: string }[]>([]);

  const desgloseAbonoOk =
    pagosAbono.length === 0 ||
    (pagosAbono.every((p) => (Number(p.monto) || 0) > 0) && Math.abs(pagosAbono.reduce((a, p) => a + (Number(p.monto) || 0), 0) - Number(monto)) < 0.01);

  const { data: cliente } = useQuery({ queryKey: ["cliente", clienteId], queryFn: () => clientesApi.get(clienteId) });
  const { data: historial } = useQuery({ queryKey: ["cliente-historial", clienteId], queryFn: () => clientesApi.historial(clienteId) });
  const { data: cxc } = useQuery({ queryKey: ["cliente-cxc", clienteId], queryFn: () => clientesApi.cxc(clienteId) });
  const { data: usados } = useQuery({ queryKey: ["cliente-usados", clienteId], queryFn: () => usadosApi.list({ clienteId, pageSize: 50 }) });
  const { data: notas } = useQuery({ queryKey: ["cliente-notas-credito", clienteId], queryFn: () => clientesApi.notasCredito(clienteId) });

  const pagar = useMutation({
    mutationFn: () =>
      ventasApi.pagar(
        abono!.ventaId,
        pagosAbono.length
          ? { pagos: pagosAbono.map((p) => ({ metodo: p.metodo, monto: Number(p.monto) })) }
          : { monto: Number(monto), metodo: "efectivo" }
      ),
    onSuccess: () => {
      toast.success("Abono registrado");
      setAbono(null);
      setPagosAbono([]);
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
        <>
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

        <Card>
          <CardHeader><CardTitle>Equipos usados entregados</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            {(usados?.data.length ?? 0) === 0 && <p className="text-muted">Sin equipos usados.</p>}
            {usados?.data.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-md border border-border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{u.nombre}</p>
                  <p className="font-mono text-xs text-muted">
                    {ORIGEN_USADO_LABEL[u.origen]}
                    {u.ordenFolio ? ` · OC ${u.ordenFolio}` : u.ventaFolio ? ` · Venta ${u.ventaFolio}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{mxn(u.valorTradeIn)}</span>
                  <Badge variant={u.estado === "disponible" ? "success" : "default"}>{u.estado}</Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notas de crédito</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            {(notas?.data.length ?? 0) === 0 && <p className="text-muted">Sin notas de crédito.</p>}
            {notas?.data.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-2 rounded-md border border-border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold">{n.folio}</p>
                  <p className="text-xs text-muted">
                    {n.ventaOrigenFolio ? `Origen: venta ${n.ventaOrigenFolio}` : "Devolución"}
                    {n.motivo ? ` · ${n.motivo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{mxn(n.saldo)}</span>
                  {n.saldo > 0 && <Badge variant="success">activa</Badge>}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quejas y reclamaciones</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            {(historial?.data.quejas.length ?? 0) === 0 && <p className="text-muted">Sin quejas.</p>}
            {historial?.data.quejas.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-md border border-border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate">{q.descripcion}</p>
                  <p className="text-xs text-muted">
                    {q.tipo === "reclamacion_garantia" ? "Reclamación de garantía" : "Queja"}
                    {q.ordenFolio ? ` · OC ${q.ordenFolio}` : q.ventaFolio ? ` · VEN ${q.ventaFolio}` : ""}
                  </p>
                </div>
                <Badge variant={q.estado === "resuelta" ? "success" : q.estado === "en_proceso" ? "warning" : "default"}>{q.estado}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
        </>
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
                        <Button size="sm" variant="outline" onClick={() => { setAbono({ ventaId: i.ventaId, folio: i.folio, saldo: i.saldo }); setMonto(String(i.saldo)); setPagosAbono([]); }}>
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
          <DesglosePago pagos={pagosAbono} onChange={setPagosAbono} />
          {abono && pagosAbono.length > 0 && Number(monto) > 0 && (
            <p className="text-xs text-muted">
              El desglose debe sumar el monto a abonar ({mxn(Number(monto))}).
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAbono(null)}>Cancelar</Button>
            <Button disabled={pagar.isPending || Number(monto) <= 0 || desgloseAbonoOk === false} onClick={() => pagar.mutate()}>Registrar abono</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
