import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, PackageCheck, XCircle, Wallet } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { comprasApi } from "@/lib/api";
import { mxn } from "@/lib/utils";

export default function CompraDetallePage() {
  const { id } = useParams();
  const compraId = Number(id);
  const toast = useToast();
  const qc = useQueryClient();
  const esAdmin = getSessionUser()?.rol === "admin";
  const [pago, setPago] = useState(false);
  const [monto, setMonto] = useState("0");
  const [metodo, setMetodo] = useState("transferencia");

  const { data, isLoading } = useQuery({ queryKey: ["compra", compraId], queryFn: () => comprasApi.get(compraId) });
  const compra = data?.data;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["compra", compraId] });

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const pagar = useMutation({
    mutationFn: () => comprasApi.pagar(compraId, { monto: Number(monto), metodo }),
    onSuccess: () => {
      toast.success("Pago registrado");
      setPago(false);
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center p-10">
        <Spinner />
      </div>
    );
  }
  if (!compra) return <p>Compra no encontrada</p>;

  const puedeEnviar = esAdmin && compra.estado === "borrador";
  const puedeRecibir = esAdmin && compra.estado === "enviada";
  const puedeCancelar = esAdmin && (compra.estado === "borrador" || compra.estado === "enviada");
  const puedePagar = esAdmin && compra.estado === "recibida" && compra.saldo > 0;

  return (
    <div className="space-y-4">
      <Link to="/compras" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Órdenes de compra
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="font-mono">{compra.folio}</span>
          </h1>
          <p className="text-muted">
            {compra.proveedorNombre} · creada por {compra.creadorNombre} · {compra.estadoLabel}
          </p>
        </div>
        <div className="flex gap-2">
          {puedeEnviar && (
            <Button variant="accent" disabled={run.isPending} onClick={() => run.mutate(() => comprasApi.enviar(compraId))}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
          )}
          {puedeRecibir && (
            <Button disabled={run.isPending} onClick={() => run.mutate(() => comprasApi.recibir(compraId))}>
              <PackageCheck className="h-4 w-4" /> Recibir mercancía
            </Button>
          )}
          {puedeCancelar && (
            <Button
              variant="danger"
              disabled={run.isPending}
              onClick={() => {
                if (confirm("¿Cancelar esta orden de compra?")) run.mutate(() => comprasApi.cancelar(compraId));
              }}
            >
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
          )}
          {puedePagar && (
            <Button variant="outline" onClick={() => { setMonto(String(compra.saldo)); setPago(true); }}>
              <Wallet className="h-4 w-4" /> Registrar pago
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardBody><p className="text-xs text-muted">Total</p><p className="text-lg font-bold">{mxn(compra.total)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-muted">Pagado</p><p className="text-lg font-bold">{mxn(compra.total - compra.saldo)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-muted">Saldo</p><p className="text-lg font-bold">{mxn(compra.saldo)}</p></CardBody></Card>
      </div>

      <Card>
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>SKU</TH>
                <TH>Producto</TH>
                <TH className="text-right">Cantidad</TH>
                <TH className="text-right">P. unitario</TH>
                <TH className="text-right">Subtotal</TH>
              </TR>
            </THead>
            <tbody>
              {compra.lineas.map((l) => (
                <TR key={l.id}>
                  <TD className="font-mono text-xs text-muted">{l.sku}</TD>
                  <TD>{l.nombre}</TD>
                  <TD className="text-right">{l.cantidad}</TD>
                  <TD className="text-right">{mxn(l.precioUnitario)}</TD>
                  <TD className="text-right">{mxn(l.subtotal)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {compra.pagos.length > 0 && (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR><TH>Pago</TH><TH>Método</TH><TH>Usuario</TH><TH className="text-right">Monto</TH></TR>
              </THead>
              <tbody>
                {compra.pagos.map((p) => (
                  <TR key={p.id}>
                    <TD className="text-muted">#{p.id}</TD>
                    <TD className="capitalize">{p.metodo}</TD>
                    <TD className="text-muted">{p.usuario}</TD>
                    <TD className="text-right">{mxn(p.monto)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Dialog open={pago} onClose={() => setPago(false)} title={`Registrar pago · ${compra.folio}`}>
        <div className="space-y-3">
          <div><Label>Monto</Label><Input type="number" min={0.01} max={compra.saldo} value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
          <div>
            <Label>Método</Label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="deposito">Depósito</option>
              <option value="tarjeta_debito">Tarjeta débito</option>
              <option value="tarjeta_credito">Tarjeta crédito</option>
            </select>
          </div>
          <p className="text-xs text-muted">Saldo: {mxn(compra.saldo)}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPago(false)}>Cancelar</Button>
            <Button disabled={pagar.isPending} onClick={() => pagar.mutate()}>Registrar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
