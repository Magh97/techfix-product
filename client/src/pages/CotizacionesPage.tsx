import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { clientesApi, productsApi, quoteApi } from "@/lib/api";
import { cn, fechaCorta, mxn } from "@/lib/utils";
import type { CotizacionVenta } from "@/lib/types";

const ESTADOS: Record<string, { label: string; variant: "default" | "success" | "danger" | "warning" | "accent" }> = {
  emitida: { label: "Emitida", variant: "default" },
  aprobada: { label: "Aprobada", variant: "success" },
  rechazada: { label: "Rechazada", variant: "danger" },
  convertida: { label: "Convertida", variant: "success" },
  cancelada: { label: "Cancelada", variant: "danger" },
  expirada: { label: "Expirada", variant: "warning" },
};

const FILTROS = [
  { value: "", label: "Todas" },
  { value: "emitida", label: "Emitidas" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "convertida", label: "Convertidas" },
  { value: "cancelada", label: "Canceladas" },
];

export default function CotizacionesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [detalle, setDetalle] = useState<CotizacionVenta | null>(null);
  const [convertirAbierto, setConvertirAbierto] = useState(false);
  const [convertMetodo, setConvertMetodo] = useState("efectivo");
  const [convertTipo, setConvertTipo] = useState<"contado" | "credito">("contado");
  const [convertMonto, setConvertMonto] = useState("");

  // Form de nueva cotización
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState<{ productoId: string; cantidad: string }[]>([{ productoId: "", cantidad: "1" }]);
  const [vigenciaDias, setVigenciaDias] = useState("7");
  const [descuento, setDescuento] = useState("0");
  const [motivoDescuento, setMotivoDescuento] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cotizaciones-venta", filtro, page, pageSize],
    queryFn: () => quoteApi.list({ estado: filtro || undefined, page, pageSize }),
  });
  const catalogo = useQuery({
    queryKey: ["productos", "quote"],
    queryFn: () => productsApi.list({ pageSize: 200 }),
    enabled: crearAbierto,
  });
  const clientes = useQuery({ queryKey: ["clientes", "quote"], queryFn: () => clientesApi.list({ pageSize: 100 }) });

  const invalida = () => {
    qc.invalidateQueries({ queryKey: ["cotizaciones-venta"] });
    qc.invalidateQueries({ queryKey: ["productos"] });
  };

  const preview = useMemo(() => {
    const subtotal = lineas.reduce((acc, r) => {
      const p = catalogo.data?.data.find((x) => x.id === Number(r.productoId));
      return acc + (p ? p.precioVenta * (Number(r.cantidad) || 0) : 0);
    }, 0);
    const desc = Math.max(0, Number(descuento) || 0);
    const iva = Math.max(0, subtotal - desc) * 0.16;
    return { subtotal, desc, iva, total: Math.max(0, subtotal - desc) + iva };
  }, [lineas, descuento, catalogo.data]);

  function crear() {
    if (!clienteId) {
      toast.error("Selecciona un cliente");
      return;
    }
    const lineasValidas = lineas
      .filter((r) => r.productoId && Number(r.cantidad) > 0)
      .map((r) => ({ productoId: Number(r.productoId), cantidad: Number(r.cantidad) }));
    if (!lineasValidas.length) {
      toast.error("Agrega al menos un producto");
      return;
    }
    quoteApi
      .create({
        clienteId: Number(clienteId),
        lineas: lineasValidas,
        vigenciaDias: Number(vigenciaDias) || 7,
        descuento: Number(descuento) || 0,
        motivoDescuento: Number(descuento) > 0 ? motivoDescuento || undefined : undefined,
      })
      .then(() => {
        toast.success("Cotización creada");
        setCrearAbierto(false);
        setLineas([{ productoId: "", cantidad: "1" }]);
        setDescuento("0");
        setMotivoDescuento("");
        setClienteId("");
        invalida();
      })
      .catch((e) => toast.error("Error al crear", e instanceof Error ? e.message : ""));
  }

  function cambiarEstado(id: number, nuevoEstado: "aprobada" | "rechazada" | "cancelada") {
    const promptMotivo = () => window.prompt("Motivo:")?.trim() || undefined;
    const m = nuevoEstado === "aprobada" ? undefined : promptMotivo();
    if ((nuevoEstado === "rechazada" || nuevoEstado === "cancelada") && !m) {
      toast.error("El motivo es obligatorio");
      return;
    }
    quoteApi
      .changeEstado(id, nuevoEstado, m)
      .then((r) => {
        setDetalle(r.data);
        invalida();
        toast.success("Estado actualizado");
      })
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : ""));
  }

  function convertir() {
    if (!detalle) return;
    quoteApi
      .convertir(detalle.id, {
        metodoPago: convertMetodo,
        tipoPago: convertTipo,
        montoRecibido: convertTipo === "contado" && convertMetodo === "efectivo" ? (Number(convertMonto) || null) : null,
      })
      .then((r) => {
        toast.success(`Convertida en venta ${r.data.venta.folio}`);
        setConvertirAbierto(false);
        setDetalle(null);
        invalida();
      })
      .catch((e) => toast.error("Error al convertir", e instanceof Error ? e.message : ""));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cotizaciones de venta</h1>
        <Button onClick={() => setCrearAbierto(true)}>
          <Plus className="h-4 w-4" /> Nueva cotización
        </Button>
      </div>

      <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFiltro(f.value);
              setPage(1);
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              filtro === f.value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10">
              <Spinner />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Folio</TH>
                  <TH>Cliente</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Vigencia</TH>
                </TR>
              </THead>
              <tbody>
                {data?.data.map((c) => (
                  <TR key={c.id} className="cursor-pointer" onClick={() => setDetalle(c)}>
                    <TD className="font-mono text-xs text-muted">{c.folio}</TD>
                    <TD>{c.clienteNombre}</TD>
                    <TD>
                      <Badge variant={ESTADOS[c.estado]?.variant ?? "default"}>{ESTADOS[c.estado]?.label ?? c.estado}</Badge>
                    </TD>
                    <TD className="text-right">{mxn(c.total)}</TD>
                    <TD className="text-muted">{fechaCorta(c.vigenciaHasta)}</TD>
                  </TR>
                ))}
                {data?.data.length === 0 && (
                  <TR>
                    <TD colSpan={5} className="text-center text-muted">
                      Sin cotizaciones.
                    </TD>
                  </TR>
                )}
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

      <Dialog open={crearAbierto} onClose={() => setCrearAbierto(false)} title="Nueva cotización de venta">
        <div className="space-y-4">
          <div>
            <Label>Cliente *</Label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
            >
              <option value="">Selecciona un cliente…</option>
              {clientes.data?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-48 space-y-2 overflow-auto">
            {lineas.map((r, i) => {
              const sel = catalogo.data?.data.find((x) => x.id === Number(r.productoId));
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={r.productoId}
                    onChange={(e) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, productoId: e.target.value } : x)))}
                    className="h-10 flex-1 rounded-md border border-border-line bg-surface px-3 text-sm"
                  >
                    <option value="">Selecciona un producto…</option>
                    {catalogo.data?.data.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.nombre} ({mxn(p.precioVenta)})
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={r.cantidad}
                    onChange={(e) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, cantidad: e.target.value } : x)))}
                    className="w-20"
                    placeholder="Cant."
                  />
                  {sel && <span className="w-24 text-right text-xs text-muted">{mxn(sel.precioVenta * (Number(r.cantidad) || 0))}</span>}
                  <Button type="button" size="sm" variant="ghost" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { productoId: "", cantidad: "1" }])}>
            <Plus className="h-4 w-4" /> Agregar producto
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vigencia (días)</Label>
              <Input type="number" min={1} max={90} value={vigenciaDias} onChange={(e) => setVigenciaDias(e.target.value)} />
            </div>
            <div>
              <Label>Descuento ($)</Label>
              <Input type="number" min={0} step="0.01" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
            </div>
          </div>
          {Number(descuento) > 0 && (
            <div>
              <Label>Motivo del descuento *</Label>
              <Input value={motivoDescuento} onChange={(e) => setMotivoDescuento(e.target.value)} placeholder="Requerido si hay descuento" />
            </div>
          )}

          <div className="rounded-md bg-surface-2 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{mxn(preview.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Descuento</span><span>-{mxn(preview.desc)}</span></div>
            <div className="flex justify-between"><span className="text-muted">IVA (16%)</span><span>{mxn(preview.iva)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{mxn(preview.total)}</span></div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCrearAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={crear}>Crear cotización</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!detalle} onClose={() => setDetalle(null)} title={`Cotización ${detalle?.folio ?? ""}`}>
        {detalle && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{detalle.clienteNombre}</p>
                <p className="text-xs text-muted">
                  Creada por {detalle.creadorNombre} · vence {fechaCorta(detalle.vigenciaHasta)}
                </p>
              </div>
              <Badge variant={ESTADOS[detalle.estado]?.variant ?? "default"}>{ESTADOS[detalle.estado]?.label ?? detalle.estado}</Badge>
            </div>

            <div className="max-h-40 overflow-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH className="text-right">Cant.</TH>
                    <TH className="text-right">Total</TH>
                  </TR>
                </THead>
                <tbody>
                  {detalle.lineas.map((l) => (
                    <TR key={l.productoId}>
                      <TD>{l.nombre}</TD>
                      <TD className="text-right">{l.cantidad}</TD>
                      <TD className="text-right">{mxn(l.precioNeto)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>

            <div className="rounded-md bg-surface-2 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{mxn(detalle.subtotal)}</span></div>
              {detalle.descuento > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Descuento{detalle.motivoDescuento ? ` (${detalle.motivoDescuento})` : ""}</span>
                  <span>-{mxn(detalle.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-muted">IVA</span><span>{mxn(detalle.iva)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{mxn(detalle.total)}</span></div>
            </div>

            {detalle.estado === "emitida" && !detalle.expirada && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => cambiarEstado(detalle.id, "aprobada")}>Aprobar</Button>
                <Button variant="outline" onClick={() => cambiarEstado(detalle.id, "rechazada")}>Rechazar</Button>
                <Button variant="outline" onClick={() => cambiarEstado(detalle.id, "cancelada")}>Cancelar</Button>
              </div>
            )}
            {detalle.estado === "emitida" && detalle.expirada && (
              <p className="text-sm text-warning">Esta cotización está vencida y no puede aprobarse.</p>
            )}
            {detalle.estado === "aprobada" && !detalle.expirada && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setConvertirAbierto(true)}>Convertir a venta</Button>
                <Button variant="outline" onClick={() => cambiarEstado(detalle.id, "cancelada")}>Cancelar</Button>
              </div>
            )}
            {detalle.estado === "aprobada" && detalle.expirada && (
              <p className="text-sm text-warning">La cotización venció y no puede convertirse.</p>
            )}
          </div>
        )}
      </Dialog>

      <Dialog open={convertirAbierto} onClose={() => setConvertirAbierto(false)} title="Convertir a venta">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <select
                value={convertTipo}
                onChange={(e) => setConvertTipo(e.target.value as "contado" | "credito")}
                className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
              >
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            <div>
              <Label>Método de pago *</Label>
              <select
                value={convertMetodo}
                onChange={(e) => setConvertMetodo(e.target.value)}
                className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta_credito">Tarjeta crédito</option>
                <option value="tarjeta_debito">Tarjeta débito</option>
                <option value="transferencia">Transferencia</option>
                <option value="deposito">Depósito</option>
              </select>
            </div>
          </div>
          {convertTipo === "contado" && convertMetodo === "efectivo" && (
            <div>
              <Label>Recibido</Label>
              <Input type="number" min={0} step="0.01" value={convertMonto} onChange={(e) => setConvertMonto(e.target.value)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConvertirAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={convertir}>Convertir</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
