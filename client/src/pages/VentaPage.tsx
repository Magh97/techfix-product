import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, RefreshCw, ScanLine, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import TicketDialog from "@/components/TicketDialog";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { clientesApi, productsApi, ventasApi } from "@/lib/api";
import { cn, mxn } from "@/lib/utils";
import type { Producto, Sugerencias, Sustituto, Venta } from "@/lib/types";

interface CartItem {
  productoId: number;
  nombre: string;
  precio: number;
  qty: number;
  maxQty?: number;
}

function sustitutosVacios(s: Sugerencias) {
  return s.sustitutos.length === 0 && s.sustitutosComponente.length === 0;
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
  const [pagos, setPagos] = useState<{ metodo: string; monto: string }[]>([]);
  const [efectivoEntregado, setEfectivoEntregado] = useState("");
  const [ticket, setTicket] = useState<Venta | null>(null);
  const [sugerencias, setSugerencias] = useState<Sugerencias | null>(null);
  const [sugerenciaDe, setSugerenciaDe] = useState<Producto | null>(null);
  const [codigoInput, setCodigoInput] = useState("");
  const [partesDePago, setPartesDePago] = useState<{ nombre: string; marca: string; modelo: string; valor: string; precioVenta: string; observaciones: string }[]>([]);
  const [usadoDraft, setUsadoDraft] = useState({ nombre: "", marca: "", modelo: "", valor: "", precioVenta: "" });

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

  const parteDePago = partesDePago.reduce((a, p) => a + (Number(p.valor) || 0), 0);
  const totalAPagar = Math.max(0, montos.total - parteDePago);
  const tradeInValido =
    partesDePago.every((p) => p.nombre.trim() && (Number(p.valor) || 0) > 0 && (Number(p.precioVenta) || 0) > 0) &&
    parteDePago <= montos.total;

  // Desglose efectivo: por defecto "todo en efectivo"; los pagos del usuario lo reemplazan
  const pagosActuales = pagos.length ? pagos : cart.length > 0 ? [{ metodo: "efectivo", monto: String(totalAPagar) }] : [];
  const sumaPagos = pagosActuales.reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const pagosOk = pagosActuales.length > 0 && pagosActuales.every((p) => (Number(p.monto) || 0) > 0) && Math.abs(sumaPagos - totalAPagar) < 0.01;
  const efectivoPortion = pagosActuales.filter((p) => p.metodo === "efectivo").reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const cambio = efectivoPortion > 0 ? Math.max(0, (Number(efectivoEntregado) || efectivoPortion) - efectivoPortion) : 0;

  const descOk = esAdmin || montos.desc <= montos.subtotal * 0.1;

  function add(p: { id: number; nombre: string; precioVenta: number; isKit: boolean; kitDisponible?: number | null }) {
    const maxQty = p.isKit ? (p.kitDisponible ?? 0) : undefined;
    if (maxQty !== undefined && maxQty <= 0) {
      toast.info("Sin stock de componentes", "Este kit no se puede armar con el stock actual.");
      return;
    }
    setCart((c) => {
      const exist = c.find((x) => x.productoId === p.id);
      if (exist) {
        const next = exist.qty + 1;
        if (maxQty !== undefined && next > maxQty) return c;
        return c.map((x) => (x.productoId === p.id ? { ...x, qty: next } : x));
      }
      return [...c, { productoId: p.id, nombre: p.nombre, precio: p.precioVenta, qty: 1, maxQty }];
    });
  }

  const venta = useMutation({
    mutationFn: () =>
      ventasApi.create({
        clienteId: clienteId ? Number(clienteId) : null,
        lineas: cart.map((c) => ({ tipo: "producto", productoId: c.productoId, cantidad: c.qty })),
        descuento: montos.desc,
        tipoPago,
        metodoPago: tipoPago === "contado" ? pagosActuales[0]?.metodo : undefined,
        montoRecibido: tipoPago === "contado" && efectivoPortion > 0 ? Number(efectivoEntregado || efectivoPortion) : undefined,
        pagos: tipoPago === "contado" && pagosActuales.length ? pagosActuales.map((p) => ({ metodo: p.metodo, monto: Number(p.monto) })) : undefined,
        partesDePago: partesDePago.length
          ? partesDePago.map((p) => ({
              nombre: p.nombre,
              marca: p.marca || null,
              modelo: p.modelo || null,
              valor: Number(p.valor),
              precioVenta: Number(p.precioVenta),
              observaciones: p.observaciones || null,
            }))
          : undefined,
      }),
    onSuccess: (res) => {
      setTicket(res.data);
      setCart([]);
      setDescuento("0");
      setEfectivoEntregado("");
      setPagos([]);
      setClienteId("");
      setPartesDePago([]);
      qc.invalidateQueries({ queryKey: ["productos"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e) => toast.error("No se pudo cobrar", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const cobrarDisabled =
    !cart.length || !descOk || !tradeInValido || (tipoPago === "contado" && !pagosOk) || (tipoPago === "credito" && !clienteId) || venta.isPending;

  function agregarMetodo() {
    setPagos((ps) => (pagosActuales.length < 5 ? [...pagosActuales, { metodo: "efectivo", monto: "" }] : ps));
  }

  function pagarTodo(metodo: string) {
    setPagos([{ metodo, monto: String(totalAPagar) }]);
    setEfectivoEntregado("");
  }

  function agregarParteDePago() {
    if (!usadoDraft.nombre.trim() || (Number(usadoDraft.valor) || 0) <= 0 || (Number(usadoDraft.precioVenta) || 0) <= 0) {
      toast.error("Completa nombre, valor de parte de pago y precio de reventa");
      return;
    }
    setPartesDePago((ps) => [...ps, { ...usadoDraft, observaciones: "" }]);
    setUsadoDraft({ nombre: "", marca: "", modelo: "", valor: "", precioVenta: "" });
  }

  function verSustitutos(p: Producto) {
    setSugerenciaDe(p);
    setSugerencias(null);
    productsApi
      .sugerencias(p.id)
      .then((r) => setSugerencias(r.data))
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : ""));
  }

  function agregarPorCodigo() {
    const codigo = codigoInput.trim();
    if (!codigo) return;
    productsApi
      .porCodigo(codigo)
      .then((r) => {
        add(r.data);
        setCodigoInput("");
      })
      .catch((e) => toast.error("Código no encontrado", e instanceof Error ? e.message : ""));
  }

  function usarSustituto(s: Sustituto) {
    const esKit = !!sugerencias?.componenteCorto;
    if (!esKit && sugerenciaDe) {
      const srcId = sugerenciaDe.id;
      const enCarrito = cart.some((x) => x.productoId === srcId);
      if (enCarrito) {
        setCart((c) => c.map((x) => (x.productoId === srcId ? { ...x, productoId: s.id, nombre: s.nombre, precio: s.precioVenta } : x)));
      } else {
        setCart((c) => [...c, { productoId: s.id, nombre: s.nombre, precio: s.precioVenta, qty: 1 }]);
      }
    } else {
      setCart((c) => [...c, { productoId: s.id, nombre: s.nombre, precio: s.precioVenta, qty: 1 }]);
    }
    toast.success(`Añadido sustituto: ${s.nombre}`);
    setSugerencias(null);
    setSugerenciaDe(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Punto de Venta</h1>

        <div className="flex gap-2">
          <div className="relative w-44">
            <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder="Escanear…"
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarPorCodigo();
                }
              }}
            />
          </div>
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
                      <span className={cn("ml-2 text-xs", p.isKit ? (p.kitDisponible ? "text-muted" : "text-danger") : p.stock <= p.stockMinimo ? "text-warning" : "text-muted")}>
                        {p.isKit ? (p.kitDisponible ? `${p.kitDisponible} disp.` : "sin stock de componentes") : `stock ${p.stock}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{mxn(p.precioVenta)}</span>
                      {p.isKit ? (
                        <>
                          {(p.kitDisponible ?? 0) <= 0 && (
                            <Button size="sm" variant="ghost" onClick={() => verSustitutos(p)} title="Sustitutos">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" disabled={(p.kitDisponible ?? 0) <= 0} onClick={() => add(p)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" disabled={p.stock > 0} onClick={() => verSustitutos(p)} title="Sustitutos">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" disabled={p.stock <= 0} onClick={() => add(p)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
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
                  <button
                    onClick={() =>
                      setCart((cs) =>
                        cs.map((x) =>
                          x.productoId === c.productoId && (x.maxQty === undefined || x.qty < x.maxQty)
                            ? { ...x, qty: x.qty + 1 }
                            : x
                        )
                      )
                    }
                  >
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
            {parteDePago > 0 && (
              <>
                <div className="flex justify-between text-warning"><span>Parte de pago (usados)</span><span>-{mxn(parteDePago)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total a pagar</span><span>{mxn(totalAPagar)}</span></div>
              </>
            )}
          </div>

          {tipoPago === "contado" && (
            <div className="space-y-2 rounded-md border border-border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Parte de pago (equipo usado)</p>
                {partesDePago.length > 0 && (
                  <button className="text-xs text-muted hover:text-danger" onClick={() => setPartesDePago([])}>Limpiar</button>
                )}
              </div>
              {partesDePago.length > 0 && (
                <div className="space-y-1">
                  {partesDePago.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded border border-border-line px-2 py-1 text-xs">
                      <span className="truncate">
                        {p.nombre}
                        {p.marca && <span className="text-muted"> · {p.marca}</span>}
                      </span>
                      <span className="ml-2 font-semibold">{mxn(Number(p.valor))}</span>
                      <button className="ml-2 text-danger" onClick={() => setPartesDePago((ps) => ps.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nombre del equipo" value={usadoDraft.nombre} onChange={(e) => setUsadoDraft((d) => ({ ...d, nombre: e.target.value }))} className="h-8" />
                <Input placeholder="Valor parte de pago" type="number" min={0} value={usadoDraft.valor} onChange={(e) => setUsadoDraft((d) => ({ ...d, valor: e.target.value }))} className="h-8" />
                <Input placeholder="Marca (opcional)" value={usadoDraft.marca} onChange={(e) => setUsadoDraft((d) => ({ ...d, marca: e.target.value }))} className="h-8" />
                <Input placeholder="Precio de reventa" type="number" min={0.01} value={usadoDraft.precioVenta} onChange={(e) => setUsadoDraft((d) => ({ ...d, precioVenta: e.target.value }))} className="h-8" />
                <Input placeholder="Modelo (opcional)" value={usadoDraft.modelo} onChange={(e) => setUsadoDraft((d) => ({ ...d, modelo: e.target.value }))} className="h-8" />
                <Button size="sm" variant="outline" onClick={agregarParteDePago}>
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </Button>
              </div>
            </div>
          )}

          {!descOk && (
            <div className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">
              Descuento mayor al 10% requiere rol admin (BR-VEN-05).
            </div>
          )}
          {tipoPago === "credito" && !clienteId && (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">Selecciona un cliente para vender a crédito.</div>
          )}

          <div>
            <Label>Tipo</Label>
            <select
              value={tipoPago}
              onChange={(e) => {
                setTipoPago(e.target.value as "contado" | "credito");
                if (e.target.value === "credito") setPagos([]);
              }}
              className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm"
            >
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
            </select>
          </div>

          {tipoPago === "contado" && (
            <div className="space-y-2 rounded-md border border-border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Desglose de pago</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => pagarTodo("efectivo")}>Todo efectivo</Button>
                  <Button size="sm" variant="ghost" onClick={() => pagarTodo("tarjeta_debito")}>Todo tarjeta</Button>
                </div>
              </div>
              {pagosActuales.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <select
                    value={p.metodo}
                    onChange={(e) => setPagos((ps) => (ps.length ? ps.map((x, j) => (j === i ? { ...x, metodo: e.target.value } : x)) : pagosActuales.map((x, j) => (j === i ? { ...x, metodo: e.target.value } : x))))}
                    className="h-9 w-40 rounded-md border border-border-line bg-surface px-1 text-sm"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta_debito">Tarjeta débito</option>
                    <option value="tarjeta_credito">Tarjeta crédito</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="deposito">Depósito</option>
                  </select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={p.monto}
                    onChange={(e) => setPagos((ps) => (ps.length ? ps.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)) : pagosActuales.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x))))}
                    className="h-9 flex-1 text-right"
                  />
                  <button className="text-danger" onClick={() => setPagos((ps) => (ps.length ? ps.filter((_, j) => j !== i) : []))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {pagosActuales.length < 5 && (
                <Button size="sm" variant="outline" onClick={agregarMetodo}>
                  <Plus className="h-3.5 w-3.5" /> Agregar método
                </Button>
              )}
              {pagosActuales.length > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Asignado</span>
                  <span className="font-semibold">{mxn(sumaPagos)}</span>
                </div>
              )}
              {pagosActuales.length > 0 && Math.abs(sumaPagos - totalAPagar) > 0.01 && (
                <p className="text-xs text-warning" role="alert">
                  {sumaPagos < totalAPagar
                    ? `Falta ${mxn(totalAPagar - sumaPagos)} · total a pagar ${mxn(totalAPagar)}`
                    : `Excede en ${mxn(sumaPagos - totalAPagar)} · total a pagar ${mxn(totalAPagar)}`}
                </p>
              )}
              {efectivoPortion > 0 && (
                <div className="space-y-1">
                  <Label>Efectivo entregado</Label>
                  <Input type="number" min={0} value={efectivoEntregado} onChange={(e) => setEfectivoEntregado(e.target.value)} />
                  <p className="text-xs text-muted">
                    Cambio: <span className="font-semibold text-primary">{mxn(cambio)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <Button className="w-full" size="lg" disabled={cobrarDisabled} onClick={() => venta.mutate()}>
            {venta.isPending ? "Cobrando…" : "Cobrar"}
          </Button>
        </CardBody>
      </Card>

      <Dialog open={!!sugerencias} onClose={() => { setSugerencias(null); setSugerenciaDe(null); }} title={`Sustitutos · ${sugerenciaDe?.nombre ?? ""}`}>
        <div className="space-y-4">
          {sugerencias?.componenteCorto && (
            <div className="rounded-md bg-warning-soft p-3 text-sm text-warning">
              Falta <strong>{sugerencias.componenteCorto.nombre}</strong> (requerido {sugerencias.componenteCorto.requerido}, hay{" "}
              {sugerencias.componenteCorto.stock}).
            </div>
          )}

          {(sugerencias?.sustitutos.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Sustitutos compatibles</p>
              <div className="space-y-1">
                {sugerencias!.sustitutos.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border-line px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.nombre}</p>
                      <p className="font-mono text-xs text-muted">{s.sku} · {s.stock} disp.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{mxn(s.precioVenta)}</span>
                      <Button size="sm" onClick={() => usarSustituto(s)}>Usar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(sugerencias?.sustitutosComponente.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Sustitutos del componente faltante</p>
              <div className="space-y-1">
                {sugerencias!.sustitutosComponente.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border-line px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.nombre}</p>
                      <p className="font-mono text-xs text-muted">{s.sku} · {s.stock} disp.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{mxn(s.precioVenta)}</span>
                      <Button size="sm" onClick={() => usarSustituto(s)}>Usar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sugerencias &&
            sustitutosVacios(sugerencias) && (
              <p className="text-sm text-muted">Sin sustitutos disponibles con stock.</p>
            )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setSugerencias(null); setSugerenciaDe(null); }}>Cerrar</Button>
          </div>
        </div>
      </Dialog>

      <TicketDialog venta={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}
