import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { cajaApi, finanzasApi } from "@/lib/api";
import { mxn } from "@/lib/utils";

export default function CajaPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const rol = getSessionUser()?.rol;
  const [arqueo, setArqueo] = useState<number | null>(null);

  const { data: actual } = useQuery({ queryKey: ["caja-actual"], queryFn: cajaApi.actual });
  const { data: corte, isLoading } = useQuery({ queryKey: ["caja-corte"], queryFn: cajaApi.corte });
  const { data: movs } = useQuery({ queryKey: ["finanzas-mov"], queryFn: finanzasApi.movimientos });

  const invalida = () => {
    qc.invalidateQueries({ queryKey: ["caja-actual"] });
    qc.invalidateQueries({ queryKey: ["caja-corte"] });
    qc.invalidateQueries({ queryKey: ["finanzas-mov"] });
  };

  const abrir = useMutation({ mutationFn: cajaApi.abrir, onSuccess: () => { toast.success("Caja abierta"); invalida(); }, onError: (e) => toast.error("Error", e instanceof Error ? e.message : "" ) });
  const cerrar = useMutation({
    mutationFn: (m: number) => cajaApi.cerrar(m),
    onSuccess: (res) => { toast.success("Caja cerrada", `Diferencia: ${mxn(res.data.diferencia)}`); setArqueo(null); invalida(); },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : ""),
  });

  if (isLoading) {
    return <div className="grid place-items-center p-16"><Spinner /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Caja del día</h1>
        <div className="flex gap-2">
          {!actual?.data ? (
            <Button onClick={() => abrir.mutate()}>Abrir caja</Button>
          ) : (
            <Badge variant="success">{actual.data.estado === "reabierta" ? "Reabierta" : "Abierta"}</Badge>
          )}
          {actual?.data && rol === "admin" && (
            <Button variant="outline" onClick={() => setArqueo(corte?.data.esperadoEfectivo ?? 0)}>Cerrar caja</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardBody><p className="text-xs font-semibold uppercase text-muted">Ingresos</p><p className="mt-1 text-2xl font-bold">{mxn(corte?.data.ingresos ?? 0)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs font-semibold uppercase text-muted">Egresos</p><p className="mt-1 text-2xl font-bold">{mxn(corte?.data.egresos ?? 0)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs font-semibold uppercase text-muted">Efectivo esperado</p><p className="mt-1 text-2xl font-bold">{mxn(corte?.data.esperadoEfectivo ?? 0)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs font-semibold uppercase text-muted">Estado</p><p className="mt-1 text-2xl font-bold capitalize">{actual?.data?.estado ?? "cerrada"}</p></CardBody></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ingresos por método</CardTitle></CardHeader>
          <CardBody className="space-y-1 text-sm">
            {Object.entries(corte?.data.ingresosPorMetodo ?? {}).map(([m, v]) => (
              <div key={m} className="flex justify-between"><span className="capitalize">{m}</span><span>{mxn(v)}</span></div>
            ))}
            {(corte?.data.partesDePago ?? 0) > 0 && (
              <div className="flex justify-between text-warning"><span>Partes de pago (usados)</span><span>{mxn(corte!.data.partesDePago)}</span></div>
            )}
            {Object.keys(corte?.data.ingresosPorMetodo ?? {}).length === 0 && (corte?.data.partesDePago ?? 0) === 0 && <p className="text-muted">Sin ventas.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Movimientos</CardTitle></CardHeader>
          <CardBody className="max-h-72 space-y-1 overflow-auto text-sm">
            {movs?.data.map((m, i) => (
              <div key={i} className="flex justify-between rounded-md border border-border-line px-3 py-1.5">
                <span className="capitalize">{m.tipo}</span>
                <span className="truncate px-2 text-muted">{m.folio}</span>
                <span className={m.monto < 0 ? "text-danger" : ""}>{mxn(m.monto)}</span>
              </div>
            ))}
            {movs?.data.length === 0 && <p className="text-muted">Sin movimientos.</p>}
          </CardBody>
        </Card>
      </div>

      <Dialog open={arqueo !== null} onClose={() => setArqueo(null)} title="Cerrar caja (arqueo)">
        <div className="space-y-3">
          <div>
            <Label>Efectivo físico contado</Label>
            <Input type="number" min={0} step="0.01" value={arqueo ?? 0} onChange={(e) => setArqueo(Number(e.target.value))} />
          </div>
          <p className="text-xs text-muted">Esperado (sistema): {mxn(corte?.data.esperadoEfectivo ?? 0)}</p>
          <p className="text-xs text-muted">Diferencia: {mxn((arqueo ?? 0) - (corte?.data.esperadoEfectivo ?? 0))}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setArqueo(null)}>Cancelar</Button>
            <Button onClick={() => arqueo !== null && cerrar.mutate(arqueo)} disabled={cerrar.isPending}>Cerrar caja</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
