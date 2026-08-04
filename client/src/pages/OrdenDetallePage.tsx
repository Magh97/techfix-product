import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle2, PackagePlus, PenLine, Plus, Trash2, Wrench } from "lucide-react";
import { SignatureCanvas } from "@/components/orden/SignatureCanvas";
import { StatusBadge } from "@/components/orden/StatusBadge";
import { Stepper } from "@/components/orden/Stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { comprasApi, ordenesApi, productsApi } from "@/lib/api";
import { fechaCorta, mxn } from "@/lib/utils";

export default function OrdenDetallePage() {
  const { id } = useParams<{ id: string }>();
  const ordenId = Number(id);
  const toast = useToast();
  const qc = useQueryClient();
  const usuario = getSessionUser();
  const rol = usuario?.rol ?? "vendedor";

  const [dialog, setDialog] = useState<null | "diagnostico" | "cotizacion" | "consumo" | "manoObra" | "entrega" | "cancelar">(null);
  const [solicitarAbierto, setSolicitarAbierto] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orden", ordenId],
    queryFn: () => ordenesApi.get(ordenId),
    enabled: Number.isFinite(ordenId),
  });

  const orden = data?.data;

  const solicitudes = useQuery({
    queryKey: ["solicitudes-orden", ordenId],
    queryFn: () => comprasApi.solicitudes.list({ ordenId, pageSize: 100 }),
    enabled: Number.isFinite(ordenId),
  });

  function cancelarSolicitud(s: { id: number }) {
    const motivo = window.prompt("Justificación de la cancelación:")?.trim();
    if (!motivo) return;
    comprasApi.solicitudes
      .cancelar(s.id, motivo)
      .then(() => {
        toast.success("Solicitud cancelada");
        solicitudes.refetch();
      })
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"));
  }

  function invalidar() {
    qc.invalidateQueries({ queryKey: ["orden", ordenId] });
    qc.invalidateQueries({ queryKey: ["ordenes"] });
  }

  const estado = useMutation({
    mutationFn: (nuevoEstado: Parameters<typeof ordenesApi.changeEstado>[1]) => ordenesApi.changeEstado(ordenId, nuevoEstado),
    onSuccess: () => {
      toast.success("Estado actualizado");
      invalidar();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const action = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Operación realizada");
      invalidar();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center p-16">
        <Spinner />
      </div>
    );
  }
  if (isError || !orden) {
    return (
      <div className="p-6 text-danger" role="alert">
        {error instanceof Error ? error.message : "Error al cargar la orden"}
        <Button variant="outline" className="ml-3" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const cotizacion = orden.cotizaciones[0];
  const reservadas = orden.detalle.filter((d) => d.estadoLinea === "reservada");
  const esTecnico = rol === "tecnico";
  const esVendedor = rol === "vendedor" || rol === "admin";
  const puedeSolicitar = esTecnico || rol === "admin";
  const activo = !["entregado", "cancelado"].includes(orden.estado);

  const estadoSolicitud: Record<string, "default" | "success" | "warning" | "danger"> = {
    pendiente: "warning",
    aprobada: "success",
    rechazada: "danger",
    cancelada: "default",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/ordenes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Órdenes
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Orden {orden.folio} <StatusBadge estado={orden.estado} retrasada={orden.retrasada} />
          </h1>
          <p className="text-sm text-muted">
            {orden.clienteNombre} · {orden.clienteTelefono}
          </p>
        </div>
        {activo && (
          <div className="flex flex-wrap gap-2">
            {orden.estado === "pendiente" && esTecnico && (
              <Button onClick={() => estado.mutate("en_diagnostico")}>Iniciar diagnóstico</Button>
            )}
            {orden.estado === "en_diagnostico" && esTecnico && (
              <>
                <Button variant="outline" onClick={() => setDialog("diagnostico")}>
                  Guardar diagnóstico
                </Button>
                <Button onClick={() => setDialog("cotizacion")}>
                  <Plus className="h-4 w-4" /> Cotizar
                </Button>
              </>
            )}
            {orden.estado === "cotizado" && esTecnico && (
              <Button onClick={() => estado.mutate("en_reparacion")}>Iniciar reparación</Button>
            )}
            {orden.estado === "cotizado" && esVendedor && cotizacion?.estado === "emitida" && (
              <>
                <Button variant="outline" onClick={() => action.mutate(() => ordenesApi.notificar(ordenId, "cotizacion"))}>
                  <Bell className="h-4 w-4" /> Notificar
                </Button>
                <Button onClick={() => action.mutate(() => ordenesApi.aprobarCotizacion(ordenId, cotizacion.id))}>
                  <CheckCircle2 className="h-4 w-4" /> Aprobar y reservar
                </Button>
              </>
            )}
            {orden.estado === "en_reparacion" && esTecnico && (
              <>
                <Button variant="outline" onClick={() => setDialog("consumo")}>
                  <Wrench className="h-4 w-4" /> Consumo
                </Button>
                <Button variant="outline" onClick={() => setDialog("manoObra")}>
                  Mano de obra
                </Button>
                <Button onClick={() => estado.mutate("listo")}>Marcar listo</Button>
              </>
            )}
            {orden.estado === "listo" && esVendedor && (
              <>
                <Button variant="outline" onClick={() => action.mutate(() => ordenesApi.notificar(ordenId, "listo"))}>
                  <Bell className="h-4 w-4" /> Notificar
                </Button>
                <Button onClick={() => setDialog("entrega")}>
                  <PenLine className="h-4 w-4" /> Cobrar y entregar
                </Button>
              </>
            )}
            {esVendedor && <Button variant="outline" onClick={() => setDialog("cancelar")}>Cancelar</Button>}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equipo y falla</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 text-sm">
            <p>
              <span className="text-muted">Equipo:</span> {orden.marca ?? "—"} {orden.modelo ?? ""} ({orden.tipoEquipo.replace("_", " ")})
            </p>
            <p>
              <span className="text-muted">Serie:</span> {orden.serie ?? "—"}
            </p>
            <p>
              <span className="text-muted">Accesorios:</span> {orden.accesorios ?? "—"}
            </p>
            <p>
              <span className="text-muted">Falla reportada:</span> {orden.fallaReportada}
            </p>
            <p>
              <span className="text-muted">Diagnóstico:</span> {orden.diagnostico ?? "Pendiente"}
            </p>
            <p>
              <span className="text-muted">Prometida:</span> {fechaCorta(orden.fechaPrometida)}
              {orden.retrasada && <Badge variant="danger" className="ml-2">retrasada</Badge>}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cotización</CardTitle>
          </CardHeader>
          <CardBody>
            {cotizacion ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{cotizacion.folio}</span>
                  <Badge variant={cotizacion.estado === "aprobada" ? "success" : cotizacion.estado === "emitida" ? "warning" : "default"}>
                    {cotizacion.estado}
                  </Badge>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {cotizacion.lineas.map((l) => (
                      <tr key={l.id} className="border-t border-border-line">
                        <td className="py-2">
                          {l.nombre}
                          {l.horas && <span className="text-muted"> ({l.horas}h × {mxn(l.tarifaHora ?? 0)})</span>}
                        </td>
                        <td className="py-2 text-right">{l.cantidad ? `× ${l.cantidad}` : ""}</td>
                        <td className="py-2 text-right">{mxn(l.precioNeto)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border-line font-semibold">
                      <td className="py-2">Subtotal</td>
                      <td />
                      <td className="py-2 text-right">{mxn(cotizacion.subtotal)}</td>
                    </tr>
                    <tr className="text-muted">
                      <td className="py-1">IVA</td>
                      <td />
                      <td className="py-1 text-right">{mxn(cotizacion.iva)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-1">Total</td>
                      <td />
                      <td className="py-1 text-right">{mxn(cotizacion.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin cotización emitida.</p>
            )}
            {reservadas.length > 0 && (
              <div className="mt-3 border-t border-border-line pt-3 text-xs text-muted">
                <p className="mb-1 font-semibold text-foreground">Piezas reservadas</p>
                {reservadas.map((d) => (
                  <p key={d.id}>
                    {d.productoNombre} × {d.cantidad}
                  </p>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardBody>
          <Stepper historial={orden.historial} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Refacciones solicitadas</CardTitle>
            {puedeSolicitar && (
              <Button size="sm" onClick={() => setSolicitarAbierto(true)}>
                <PackagePlus className="h-4 w-4" /> Solicitar refacción
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {solicitudes.isLoading ? (
            <div className="grid place-items-center p-6">
              <Spinner />
            </div>
          ) : (solicitudes.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">Sin solicitudes de refacción para esta orden.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH className="text-right">Cant.</TH>
                  <TH>Estado</TH>
                  <TH>Motivo</TH>
                  <TH>Solicitante</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {solicitudes.data?.data.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      <p>{s.productoNombre}</p>
                      <p className="font-mono text-xs text-muted">{s.sku}</p>
                    </TD>
                    <TD className="text-right">{s.cantidad}</TD>
                    <TD>
                      <Badge variant={estadoSolicitud[s.estado] ?? "default"}>{s.estado}</Badge>
                    </TD>
                    <TD className="text-muted">{s.motivo ?? "—"}</TD>
                    <TD>{s.solicitanteNombre}</TD>
                    <TD className="text-right">
                      {s.estado === "pendiente" && puedeSolicitar && (
                        <Button size="sm" variant="outline" onClick={() => cancelarSolicitud(s)}>
                          Cancelar
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {dialog === "diagnostico" && <DiagnosticoDialog ordenId={ordenId} onClose={() => setDialog(null)} onDone={invalidar} />}
      {dialog === "cotizacion" && <CotizacionDialog ordenId={ordenId} onClose={() => setDialog(null)} onDone={invalidar} />}
      {dialog === "consumo" && <ConsumoDialog ordenId={ordenId} piezas={reservadas} onClose={() => setDialog(null)} onDone={invalidar} />}
      {dialog === "manoObra" && <ManoObraDialog ordenId={ordenId} onClose={() => setDialog(null)} onDone={invalidar} />}
      {dialog === "entrega" && <EntregaDialog ordenId={ordenId} onClose={() => setDialog(null)} onDone={invalidar} />}
      {dialog === "cancelar" && <CancelarDialog ordenId={ordenId} onClose={() => setDialog(null)} onDone={invalidar} />}
      {solicitarAbierto && (
        <SolicitarRefaccionDialog ordenId={ordenId} onClose={() => { setSolicitarAbierto(false); solicitudes.refetch(); }} />
      )}
    </div>
  );
}

function useOrdenMutation(onDone: () => void) {
  const toast = useToast();
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Listo");
      onDone();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });
  return m;
}

function DiagnosticoDialog({ ordenId, onClose, onDone }: { ordenId: number; onClose: () => void; onDone: () => void }) {
  const [texto, setTexto] = useState("");
  const m = useOrdenMutation(onDone);
  return (
    <Dialog open onClose={onClose} title="Guardar diagnóstico">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="min-h-24 w-full rounded-md border border-border-line bg-surface px-3 py-2 text-sm"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button disabled={!texto.trim() || m.isPending} onClick={() => m.mutate(() => ordenesApi.setDiagnostico(ordenId, texto))}>
          Guardar
        </Button>
      </div>
    </Dialog>
  );
}

function CotizacionDialog({ ordenId, onClose, onDone }: { ordenId: number; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { data: productos } = useQuery({ queryKey: ["productos", "cot"], queryFn: () => productsApi.list({ pageSize: 50 }) });
  const [lineas, setLineas] = useState<{ tipoLinea: "refaccion" | "mano_obra"; productoId?: number; cantidad?: number; horas?: number; tarifaHora?: number; descripcion?: string }[]>([]);
  const [pid, setPid] = useState("");
  const [cant, setCant] = useState(1);
  const [horas, setHoras] = useState("1");
  const [tarifa, setTarifa] = useState("380");

  const m = useOrdenMutation(onDone);

  function agregarRefaccion() {
    if (!pid) return;
    setLineas((l) => [...l, { tipoLinea: "refaccion", productoId: Number(pid), cantidad: cant }]);
    setPid("");
    setCant(1);
  }
  function agregarManoObra() {
    setLineas((l) => [...l, { tipoLinea: "mano_obra", horas: Number(horas), tarifaHora: Number(tarifa), descripcion: "Mano de obra" }]);
  }

  return (
    <Dialog open onClose={onClose} title="Generar cotización">
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_80px_auto] gap-2">
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="h-10 rounded-md border border-border-line bg-surface px-2 text-sm">
            <option value="">Pieza…</option>
            {productos?.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · stock {p.stock}
              </option>
            ))}
          </select>
          <Input type="number" min={1} value={cant} onChange={(e) => setCant(Number(e.target.value))} />
          <Button variant="outline" onClick={agregarRefaccion}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-2">
            <Input type="number" min={0.5} step={0.5} value={horas} onChange={(e) => setHoras(e.target.value)} aria-label="Horas" />
            <Input type="number" min={0} value={tarifa} onChange={(e) => setTarifa(e.target.value)} aria-label="Tarifa / hora" />
          </div>
          <Button variant="outline" onClick={agregarManoObra}>
            + Mano de obra
          </Button>
        </div>

        <div className="max-h-40 space-y-1 overflow-auto">
          {lineas.map((l, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border-line px-3 py-1.5 text-sm">
              <span>{l.tipoLinea === "refaccion" ? `Pieza #${l.productoId} × ${l.cantidad}` : `Mano de obra ${l.horas}h`}</span>
              <button onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} className="text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          disabled={!lineas.length || m.isPending}
          onClick={() => {
            if (!lineas.length) return toast.error("Agrega al menos una línea");
            m.mutate(() => ordenesApi.crearCotizacion(ordenId, lineas));
          }}
        >
          Emitir cotización
        </Button>
      </div>
    </Dialog>
  );
}

function ConsumoDialog({
  ordenId,
  piezas,
  onClose,
  onDone,
}: {
  ordenId: number;
  piezas: { id: number; productoId: number; productoNombre: string; cantidad: number }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [sel, setSel] = useState<Record<number, number>>({});
  const m = useOrdenMutation(onDone);
  return (
    <Dialog open onClose={onClose} title="Registrar consumo">
      <div className="space-y-2">
        {piezas.length === 0 && <p className="text-sm text-muted">No hay piezas reservadas.</p>}
        {piezas.map((p) => (
          <label key={p.id} className="flex items-center justify-between rounded-md border border-border-line px-3 py-2 text-sm">
            <span>{p.productoNombre} (reservada: {p.cantidad})</span>
            <input
              type="number"
              min={0}
              max={p.cantidad}
              defaultValue={p.cantidad}
              onChange={(e) => setSel((s) => ({ ...s, [p.productoId]: Number(e.target.value) }))}
              className="h-8 w-20 rounded-md border border-border-line px-2 text-sm"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          disabled={!piezas.length || m.isPending}
          onClick={() => {
            const consumir = piezas
              .map((p) => ({ productoId: p.productoId, cantidad: sel[p.productoId] ?? p.cantidad }))
              .filter((x) => x.cantidad > 0);
            if (!consumir.length) return;
            m.mutate(() => ordenesApi.registrarConsumo(ordenId, consumir));
          }}
        >
          Registrar consumo
        </Button>
      </div>
    </Dialog>
  );
}

function ManoObraDialog({ ordenId, onClose, onDone }: { ordenId: number; onClose: () => void; onDone: () => void }) {
  const [horas, setHoras] = useState("1");
  const [tarifa, setTarifa] = useState("380");
  const m = useOrdenMutation(onDone);
  return (
    <Dialog open onClose={onClose} title="Registrar mano de obra">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Horas</Label>
          <Input type="number" min={0.5} step={0.5} value={horas} onChange={(e) => setHoras(e.target.value)} />
        </div>
        <div>
          <Label>Tarifa / hora</Label>
          <Input type="number" min={0} value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button disabled={m.isPending} onClick={() => m.mutate(() => ordenesApi.registrarManoObra(ordenId, { horas: Number(horas), tarifaHora: Number(tarifa) }))}>
          Registrar
        </Button>
      </div>
    </Dialog>
  );
}

function EntregaDialog({ ordenId, onClose, onDone }: { ordenId: number; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [firma, setFirma] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const m = useOrdenMutation(onDone);
  return (
    <Dialog open onClose={onClose} title="Cobrar y entregar">
      <div className="space-y-3">
        <div>
          <Label>Método de pago</Label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm">
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta_debito">Tarjeta débito</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>
        <div>
          <Label>Firma de recepción (obligatoria)</Label>
          <SignatureCanvas onSigned={setFirma} onError={(msg) => toast.error(msg)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button disabled={!firma || m.isPending} onClick={() => m.mutate(() => ordenesApi.entregar(ordenId, { firma, metodoPago: metodo }))}>
          {m.isPending ? "Entregando…" : "Cobrar y entregar"}
        </Button>
      </div>
    </Dialog>
  );
}

function CancelarDialog({ ordenId, onClose, onDone }: { ordenId: number; onClose: () => void; onDone: () => void }) {
  const [motivo, setMotivo] = useState("");
  const m = useOrdenMutation(onDone);
  return (
    <Dialog open onClose={onClose} title="Cancelar orden">
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo de la cancelación…"
        className="min-h-20 w-full rounded-md border border-border-line bg-surface px-3 py-2 text-sm"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Regresar</Button>
        <Button variant="danger" disabled={!motivo.trim() || m.isPending} onClick={() => m.mutate(() => ordenesApi.cancelar(ordenId, motivo))}>
          Cancelar orden
        </Button>
      </div>
    </Dialog>
  );
}

function SolicitarRefaccionDialog({ ordenId, onClose }: { ordenId: number; onClose: () => void }) {
  const toast = useToast();
  const { data: productos } = useQuery({ queryKey: ["productos", "solicitud"], queryFn: () => productsApi.list({ pageSize: 100 }) });
  const [pid, setPid] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  function enviar() {
    if (!pid || !Number(cantidad) || Number(cantidad) < 1) {
      toast.error("Selecciona producto y cantidad");
      return;
    }
    setEnviando(true);
    comprasApi.solicitudes
      .create({ productoId: Number(pid), cantidad: Number(cantidad), ordenId, motivo: motivo || undefined })
      .then(() => {
        toast.success("Solicitud enviada al administrador");
        onClose();
      })
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"))
      .finally(() => setEnviando(false));
  }

  return (
    <Dialog open onClose={onClose} title="Solicitar refacción">
      <div className="space-y-3">
        <div>
          <Label>Producto *</Label>
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm">
            <option value="">Seleccionar…</option>
            {productos?.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · stock {p.stock}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Cantidad *</Label>
          <Input type="number" min={1} step={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
        <div>
          <Label>Motivo (opcional)</Label>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. falta stock para continuar la reparación" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={enviando || !pid || !Number(cantidad)} onClick={enviar}>
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
