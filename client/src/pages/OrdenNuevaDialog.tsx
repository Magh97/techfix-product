import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { clientesApi, ordenesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const PASOS = ["Cliente", "Equipo", "Confirmar"];
const TIPOS = ["laptop", "desktop", "all_in_one", "periferico", "componente", "otro"];

function defaultFecha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function OrdenNuevaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [paso, setPaso] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    tipoEquipo: "laptop",
    marca: "",
    modelo: "",
    serie: "",
    accesorios: "",
    fallaReportada: "",
    fechaPrometida: defaultFecha(),
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes", busqueda],
    queryFn: () => clientesApi.list({ q: busqueda || undefined, pageSize: 50 }),
  });

  const create = useMutation({
    mutationFn: () =>
      ordenesApi.create({
        clienteId: clienteId!,
        tipoEquipo: form.tipoEquipo,
        marca: form.marca || null,
        modelo: form.modelo || null,
        serie: form.serie || null,
        accesorios: form.accesorios || null,
        fallaReportada: form.fallaReportada,
        fechaPrometida: form.fechaPrometida,
      }),
    onSuccess: (res) => {
      toast.success("Orden creada", res.data.folio);
      onClose();
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      navigate(`/ordenes/${res.data.id}`);
    },
    onError: (e) => toast.error("Error al crear", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function siguiente() {
    if (paso === 1 && !clienteId) return toast.error("Falta el cliente", "Selecciona un cliente.");
    if (paso === 2 && !form.fallaReportada.trim()) return toast.error("Falta la falla", "Describe la falla reportada.");
    setPaso((p) => Math.min(3, p + 1));
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nueva orden de servicio">
      <div className="mb-4 flex gap-2">
        {PASOS.map((p, i) => (
          <span
            key={p}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold",
              paso === i + 1 ? "bg-accent-soft text-accent" : paso > i + 1 ? "bg-primary-soft text-primary-strong" : "bg-surface-2 text-muted"
            )}
          >
            {i + 1}. {p}
          </span>
        ))}
      </div>

      {paso === 1 && (
        <div className="space-y-3">
          <Input placeholder="Buscar cliente por nombre o teléfono…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <div className="max-h-56 space-y-1 overflow-auto">
            {clientes?.data.map((c) => (
              <button
                key={c.id}
                onClick={() => setClienteId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border border-border-line px-3 py-2 text-left text-sm hover:bg-surface-2",
                  clienteId === c.id && "border-accent bg-accent-soft"
                )}
              >
                <span>
                  <strong>{c.nombre}</strong> · {c.telefono}
                </span>
                {clienteId === c.id && <span className="text-accent">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de equipo</Label>
              <select
                value={form.tipoEquipo}
                onChange={(e) => setForm({ ...form, tipoEquipo: e.target.value })}
                className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            </div>
            <div>
              <Label>Serie</Label>
              <Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Accesorios</Label>
            <Input value={form.accesorios} onChange={(e) => setForm({ ...form, accesorios: e.target.value })} placeholder="Cargador, mouse…" />
          </div>
          <div>
            <Label>Falla reportada *</Label>
            <textarea
              value={form.fallaReportada}
              onChange={(e) => setForm({ ...form, fallaReportada: e.target.value })}
              className="min-h-20 w-full rounded-md border border-border-line bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-3">
          <div>
            <Label>Fecha prometida</Label>
            <Input type="date" value={form.fechaPrometida} onChange={(e) => setForm({ ...form, fechaPrometida: e.target.value })} />
          </div>
          <div className="rounded-md border border-border-line bg-surface-2 p-3 text-sm">
            <p>
              <strong>Cliente:</strong> {clientes?.data.find((c) => c.id === clienteId)?.nombre ?? "—"}
            </p>
            <p>
              <strong>Equipo:</strong> {form.marca} {form.modelo} ({form.tipoEquipo.replace("_", " ")})
            </p>
            <p className="mt-1 text-muted">{form.fallaReportada}</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-between">
        <Button type="button" variant="outline" onClick={() => (paso === 1 ? onClose() : setPaso(paso - 1))}>
          {paso === 1 ? "Cancelar" : "Atrás"}
        </Button>
        {paso < 3 ? (
          <Button onClick={siguiente}>Siguiente</Button>
        ) : (
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creando…" : "Crear orden"}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
