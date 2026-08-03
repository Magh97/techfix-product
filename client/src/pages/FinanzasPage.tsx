import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { finanzasApi, ventasApi } from "@/lib/api";
import { fechaCorta, mxn } from "@/lib/utils";

export default function FinanzasPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const rol = getSessionUser()?.rol;
  const [tab, setTab] = useState<"cxc" | "egresos">("cxc");
  const [nuevoEgreso, setNuevoEgreso] = useState(false);
  const [egreso, setEgreso] = useState({ concepto: "", categoria: "Operativo", monto: "", metodo: "efectivo" });
  const [abono, setAbono] = useState<{ ventaId: number; folio: string; saldo: number } | null>(null);
  const [monto, setMonto] = useState("0");

  const { data: cxc } = useQuery({ queryKey: ["finanzas-cxc"], queryFn: finanzasApi.cxc });
  const { data: egresos } = useQuery({ queryKey: ["finanzas-egresos"], queryFn: finanzasApi.egresos });

  const pagar = useMutation({
    mutationFn: () => ventasApi.pagar(abono!.ventaId, { monto: Number(monto), metodo: "efectivo" }),
    onSuccess: () => { toast.success("Abono registrado"); setAbono(null); qc.invalidateQueries({ queryKey: ["finanzas-cxc"] }); },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : ""),
  });

  const registrarEgreso = useMutation({
    mutationFn: () => finanzasApi.registrarEgreso({ ...egreso, monto: Number(egreso.monto) } as never),
    onSuccess: () => { toast.success("Egreso registrado"); setNuevoEgreso(false); setEgreso({ concepto: "", categoria: "Operativo", monto: "", metodo: "efectivo" }); qc.invalidateQueries({ queryKey: ["finanzas-egresos"] }); qc.invalidateQueries({ queryKey: ["caja-corte"] }); },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : ""),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Finanzas</h1>

      <div className="flex gap-2">
        <Button variant={tab === "cxc" ? "accent" : "outline"} size="sm" onClick={() => setTab("cxc")}>Cuentas por cobrar</Button>
        <Button variant={tab === "egresos" ? "accent" : "outline"} size="sm" onClick={() => setTab("egresos")}>Egresos</Button>
        {rol === "admin" && tab === "egresos" && (
          <Button size="sm" className="ml-auto" onClick={() => setNuevoEgreso(true)}><Plus className="h-4 w-4" /> Nuevo</Button>
        )}
      </div>

      {tab === "cxc" && (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR><TH>Folio</TH><TH>Cliente</TH><TH className="text-right">Total</TH><TH className="text-right">Saldo</TH><TH>Vence</TH><TH>Estado</TH><TH /></TR>
              </THead>
              <tbody>
                {cxc?.data.map((i) => (
                  <TR key={i.ventaId}>
                    <TD className="font-mono text-xs">{i.folio}</TD>
                    <TD>{i.clienteNombre}</TD>
                    <TD className="text-right">{mxn(i.total)}</TD>
                    <TD className="text-right">{mxn(i.saldo)}</TD>
                    <TD className="text-muted">{i.fechaVencimiento ? fechaCorta(i.fechaVencimiento) : "—"}</TD>
                    <TD>
                      <Badge variant={i.estado === "vencido" ? "danger" : i.estado === "pagado" ? "success" : "warning"}>{i.estado}</Badge>
                    </TD>
                    <TD className="text-right">
                      {i.saldo > 0 && <Button size="sm" variant="outline" onClick={() => { setAbono({ ventaId: i.ventaId, folio: i.folio, saldo: i.saldo }); setMonto(String(i.saldo)); }}>Abonar</Button>}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {tab === "egresos" && (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead><TR><TH>Concepto</TH><TH>Categoría</TH><TH>Método</TH><TH className="text-right">Monto</TH></TR></THead>
              <tbody>
                {egresos?.data.map((e) => (
                  <TR key={e.id}>
                    <TD>{e.concepto}</TD>
                    <TD>{e.categoria}</TD>
                    <TD className="capitalize text-muted">{e.metodo}</TD>
                    <TD className="text-right">{mxn(e.monto)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Dialog open={!!abono} onClose={() => setAbono(null)} title={`Abonar · ${abono?.folio ?? ""}`}>
        <div className="space-y-3">
          <div><Label>Monto</Label><Input type="number" min={0.01} max={abono?.saldo} value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
          <p className="text-xs text-muted">Saldo: {abono ? mxn(abono.saldo) : ""}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAbono(null)}>Cancelar</Button>
            <Button disabled={pagar.isPending} onClick={() => pagar.mutate()}>Abonar</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={nuevoEgreso} onClose={() => setNuevoEgreso(false)} title="Registrar egreso">
        <div className="space-y-3">
          <div><Label>Concepto</Label><Input value={egreso.concepto} onChange={(e) => setEgreso({ ...egreso, concepto: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Categoría</Label><Input value={egreso.categoria} onChange={(e) => setEgreso({ ...egreso, categoria: e.target.value })} /></div>
            <div><Label>Método</Label>
              <select value={egreso.metodo} onChange={(e) => setEgreso({ ...egreso, metodo: e.target.value })} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
                <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta_debito">Tarjeta débito</option>
              </select>
            </div>
          </div>
          <div><Label>Monto</Label><Input type="number" min={0} value={egreso.monto} onChange={(e) => setEgreso({ ...egreso, monto: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNuevoEgreso(false)}>Cancelar</Button>
            <Button disabled={registrarEgreso.isPending} onClick={() => registrarEgreso.mutate()}>Registrar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
