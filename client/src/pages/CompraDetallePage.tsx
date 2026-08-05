import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, PackageCheck, XCircle, Wallet, PackagePlus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
  const [recibirAbierto, setRecibirAbierto] = useState(false);
  const [cantidades, setCantidades] = useState<Record<number, string>>({});

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

  const recibirSeleccion = useMutation({
    mutationFn: () => {
      if (!compra) throw new Error("Sin datos de la compra");
      const lineas = compra.lineas
        .filter((l) => l.pendiente > 0)
        .map((l) => ({ detalleCompraId: l.id, cantidadRecibida: Math.min(Number(cantidades[l.id] ?? "0") || 0, l.pendiente) }))
        .filter((l) => l.cantidadRecibida > 0);
      return comprasApi.recibir(compraId, lineas);
    },
    onSuccess: (r) => {
      toast.success("Recepción registrada");
      setRecibirAbierto(false);
      invalidate();
      const data = r.data;
      if (data.estado !== "recibida") toast.info("Recepción parcial: quedan líneas por recibir");
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const recibirTodo = useMutation({
    mutationFn: () => comprasApi.recibir(compraId),
    onSuccess: (r) => {
      toast.success("Mercancía recibida");
      setRecibirAbierto(false);
      invalidate();
      if (r.data.estado !== "recibida") toast.info("Recepción parcial: quedan líneas por recibir");
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
  const puedeRecibir = esAdmin && compra.estado === "enviada" && compra.lineas.some((l) => l.pendiente > 0);
  const puedeCancelar = esAdmin && (compra.estado === "borrador" || compra.estado === "enviada");
  const puedePagar = esAdmin && compra.totalRecibido > 0 && compra.saldo > 0;

  function abrirRecibir() {
    if (!compra) return;
    const inicial: Record<number, string> = {};
    compra.lineas.forEach((l) => {
      if (l.pendiente > 0) inicial[l.id] = String(l.pendiente);
    });
    setCantidades(inicial);
    setRecibirAbierto(true);
  }

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
            {compra.totalRecibido > 0 && compra.estado === "enviada" && (
              <Badge variant="warning" className="ml-2">Recepción parcial</Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {puedeEnviar && (
            <Button variant="accent" disabled={run.isPending} onClick={() => run.mutate(() => comprasApi.enviar(compraId))}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
          )}
          {puedeRecibir && (
            <Button disabled={run.isPending || recibirSeleccion.isPending} onClick={abrirRecibir}>
              <PackageCheck className="h-4 w-4" /> Recibir mercancía
            </Button>
          )}
          {puedeCancelar && (
            <Button
              variant="danger"
              disabled={run.isPending}
              onClick={() => {
                const msj =
                  compra.totalRecibido > 0
                    ? "La OC tiene mercancía ya recibida: se conservará el stock y la CxP acumulada. ¿Cancelar?"
                    : "¿Cancelar esta orden de compra?";
                if (confirm(msj)) run.mutate(() => comprasApi.cancelar(compraId));
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

      <div className="grid grid-cols-4 gap-4">
        <Card><CardBody><p className="text-xs text-muted">Total pedido</p><p className="text-lg font-bold">{mxn(compra.total)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-muted">Recibido</p><p className="text-lg font-bold">{mxn(compra.totalRecibido)}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-muted">Pagado</p><p className="text-lg font-bold">{mxn(compra.pagado)}</p></CardBody></Card>
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
                <TH className="text-right">Recibido</TH>
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
                  <TD className="text-right">
                    <span className={l.recibida ? "text-primary" : "text-muted"}>
                      {l.cantidadRecibida}/{l.cantidad}
                    </span>
                    {!l.recibida && l.cantidadRecibida > 0 && <Badge variant="warning" className="ml-1">parcial</Badge>}
                  </TD>
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

      <Dialog open={recibirAbierto} onClose={() => setRecibirAbierto(false)} title={`Recibir mercancía · ${compra.folio}`}>
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Define cuánto recibir por línea. "Recibir todo" marca lo pendiente de cada línea.
          </p>
          {compra.lineas.filter((l) => l.pendiente > 0).map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{l.nombre}</p>
                <p className="font-mono text-xs text-muted">
                  {l.cantidadRecibida}/{l.cantidad} recibidos · pendiente {l.pendiente}
                </p>
              </div>
              <Input
                type="number"
                min={1}
                max={l.pendiente}
                value={cantidades[l.id] ?? ""}
                onChange={(e) => setCantidades((c) => ({ ...c, [l.id]: e.target.value }))}
                className="w-24 text-right"
              />
            </div>
          ))}
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" disabled={recibirTodo.isPending} onClick={() => recibirTodo.mutate()}>
              <PackagePlus className="h-4 w-4" /> Recibir todo
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setRecibirAbierto(false)}>Cancelar</Button>
              <Button disabled={recibirSeleccion.isPending} onClick={() => recibirSeleccion.mutate()}>
                Recibir selección
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

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
          <p className="text-xs text-muted">Saldo (recibido − pagado): {mxn(compra.saldo)}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPago(false)}>Cancelar</Button>
            <Button disabled={pagar.isPending} onClick={() => pagar.mutate()}>Registrar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
