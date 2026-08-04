import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { clientesApi, productsApi, ventasApi } from "@/lib/api";
import { cn, mxn } from "@/lib/utils";
import type { Venta } from "@/lib/types";

interface CartItem {
  productoId: number;
  nombre: string;
  precio: number;
  qty: number;
}

export default function VentaPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const rol = getSessionUser()?.rol ?? "vendedor";
  const esAdmin = rol === "admin";

  const [busqueda, setBusqueda] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [tipoPago, setTipoPago] = useState<"contado" | "credito">("contado");
  const [metodo, setMetodo] = useState("efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [ticket, setTicket] = useState<Venta | null>(null);

  const { data: productos, isLoading } = useQuery({
    queryKey: ["productos", "pos", busqueda],
    queryFn: () => productsApi.list({ q: busqueda || undefined, pageSize: 50 }),
  });
  const { data: clientes } = useQuery({ queryKey: ["clientes", "pos"], queryFn: () => clientesApi.list({ pageSize: 50 }) });

  const montos = useMemo(() => {
    const subtotal = cart.reduce((a, c) => a + c.precio * c.qty, 0);
    const desc = Math.max(0, Number(descuento) || 0);
    const base = Math.max(0, subtotal - desc);
    const iva = base * 0.16;
    return { subtotal, desc, iva, total: base + iva };
  }, [cart, descuento]);

  const descOk = esAdmin || montos.desc <= montos.subtotal * 0.1;

  function add(p: { id: number; nombre: string; precioVenta: number; isKit: boolean }) {
    setCart((c) => {
      const exist = c.find((x) => x.productoId === p.id);
      if (exist) return c.map((x) => (x.productoId === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { productoId: p.id, nombre: p.nombre, precio: p.precioVenta, qty: 1 }];
    });
  }

  const venta = useMutation({
    mutationFn: () =>
      ventasApi.create({
        clienteId: clienteId ? Number(clienteId) : null,
        lineas: cart.map((c) => ({ tipo: "producto", productoId: c.productoId, cantidad: c.qty })),
        descuento: montos.desc,
        tipoPago,
        metodoPago: tipoPago === "contado" ? metodo : undefined,
        montoRecibido: tipoPago === "contado" ? (metodo === "efectivo" ? Number(montoRecibido || montos.total) : undefined) : undefined,
      }),
    onSuccess: (res) => {
      setTicket(res.data);
      setCart([]);
      setDescuento("0");
      setMontoRecibido("");
      setClienteId("");
      qc.invalidateQueries({ queryKey: ["productos"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e) => toast.error("No se pudo cobrar", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const cambio = metodo === "efectivo" ? Math.max(0, (Number(montoRecibido) || montos.total) - montos.total) : 0;
  const cobrarDisabled = !cart.length || !descOk || (tipoPago === "credito" && !clienteId) || venta.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Punto de Venta</h1>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Buscar producto por nombre o SKU…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="h-10 rounded-md border border-border-line bg-surface px-3 text-sm">
            <option value="">Mostrador (sin cliente)</option>
            {clientes?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <Card>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="grid place-items-center p-10"><Spinner /></div>
            ) : (
              <div className="max-h-[50vh] divide-y divide-border-line overflow-auto">
                {productos?.data.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-surface-2">
                    <div>
                      <span className="font-semibold">{p.nombre}</span>
                      {p.isKit && <Badge variant="accent" className="ml-2">Kit</Badge>}
                      <span className={cn("ml-2 text-xs", p.stock <= p.stockMinimo && !p.isKit ? "text-warning" : "text-muted")}>
                        {p.isKit ? "se desglosa por componentes" : `stock ${p.stock}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{mxn(p.precioVenta)}</span>
                      <Button size="sm" variant="outline" disabled={!p.isKit && p.stock <= 0} onClick={() => add(p)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-16">
        <CardHeader>
          <h2 className="text-base font-semibold">Carrito ({cart.reduce((a, c) => a + c.qty, 0)})</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="max-h-[30vh] space-y-1 overflow-auto">
            {cart.length === 0 && <p className="text-sm text-muted">Carrito vacío.</p>}
            {cart.map((c) => (
              <div key={c.productoId} className="flex items-center gap-2 rounded-md border border-border-line px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nombre}</p>
                  <p className="text-xs text-muted">{mxn(c.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCart((cs) => cs.map((x) => (x.productoId === c.productoId ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">{c.qty}</span>
                  <button onClick={() => setCart((cs) => cs.map((x) => (x.productoId === c.productoId ? { ...x, qty: x.qty + 1 } : x)))}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="font-semibold">{mxn(c.precio * c.qty)}</span>
                <button onClick={() => setCart((cs) => cs.filter((x) => x.productoId !== c.productoId))} className="text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-border-line pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{mxn(montos.subtotal)}</span></div>
            <div className="flex items-center justify-between gap-2">
              <span>Descuento</span>
              <Input type="number" min={0} step="0.01" value={descuento} onChange={(e) => setDescuento(e.target.value)} className="h-8 w-28 text-right" />
            </div>
            <div className="flex justify-between"><span>IVA (16%)</span><span>{mxn(montos.iva)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{mxn(montos.total)}</span></div>
          </div>

          {!descOk && (
            <div className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">
              Descuento mayor al 10% requiere rol admin (BR-VEN-05).
            </div>
          )}
          {tipoPago === "credito" && !clienteId && (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">Selecciona un cliente para vender a crédito.</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tipo</Label>
              <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value as "contado" | "credito")} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            <div>
              <Label>Método</Label>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)} disabled={tipoPago === "credito"} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta_debito">Tarjeta débito</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          {tipoPago === "contado" && metodo === "efectivo" && (
            <div className="space-y-1">
              <Label>Recibido</Label>
              <Input type="number" min={0} value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} />
              <p className="text-xs text-muted">Cambio: <span className="font-semibold text-primary">{mxn(cambio)}</span></p>
            </div>
          )}

          <Button className="w-full" size="lg" disabled={cobrarDisabled} onClick={() => venta.mutate()}>
            {venta.isPending ? "Cobrando…" : "Cobrar"}
          </Button>
        </CardBody>
      </Card>

      <Dialog open={!!ticket} onClose={() => setTicket(null)} title="Ticket de venta">
        {ticket && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-lg font-bold">TechStore</p>
              <p className="font-mono text-sm">{ticket.folio}</p>
              <Badge variant={ticket.tipoPago === "credito" ? "warning" : "success"}>{ticket.tipoPago}</Badge>
            </div>
            <div className="divide-y divide-border-line text-sm">
              {ticket.lineas.map((l, i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span>{l.cantidad} × {l.descripcion}</span>
                  <span>{mxn(l.precio)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border-line pt-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{mxn(ticket.subtotal)}</span></div>
              {ticket.descuento > 0 && <div className="flex justify-between"><span>Descuento</span><span>-{mxn(ticket.descuento)}</span></div>}
              <div className="flex justify-between"><span>IVA</span><span>{mxn(ticket.iva)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{mxn(ticket.total)}</span></div>
              {ticket.cambio ? <div className="flex justify-between"><span>Cambio</span><span>{mxn(ticket.cambio)}</span></div> : null}
              {ticket.fechaVencimiento && <div className="flex justify-between text-xs text-muted"><span>Vence</span><span>{ticket.fechaVencimiento}</span></div>}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
