import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
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
import { clientesApi, quejasApi } from "@/lib/api";
import { fechaCorta } from "@/lib/utils";
import type { Cliente, EstadoQueja, Queja, TipoQueja } from "@/lib/types";

const estadoVariant: Record<EstadoQueja, "default" | "warning" | "success"> = {
  abierta: "default",
  en_proceso: "warning",
  resuelta: "success",
};

const TIPO_LABEL: Record<TipoQueja, string> = {
  queja: "Queja",
  reclamacion_garantia: "Reclamación de garantía",
};

export default function QuejasPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtro, setFiltro] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [cambiar, setCambiar] = useState<Queja | null>(null);
  const [form, setForm] = useState({ clienteId: "", tipo: "queja" as TipoQueja, descripcion: "" });
  const [estadoForm, setEstadoForm] = useState<{ estado: "en_proceso" | "resuelta"; resolucion: string }>({
    estado: "resuelta",
    resolucion: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["quejas", filtro, page, pageSize],
    queryFn: () => quejasApi.list({ estado: filtro || undefined, page, pageSize }),
  });

  const clientes = useQuery({ queryKey: ["clientes", "quejas"], queryFn: () => clientesApi.list({ pageSize: 50 }), enabled: nuevo });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["quejas"] });

  const guardar = useMutation({
    mutationFn: () =>
      quejasApi.create({
        clienteId: Number(form.clienteId),
        tipo: form.tipo,
        descripcion: form.descripcion,
        ...(form.tipo === "reclamacion_garantia" ? { garantiaId: null } : {}),
      }),
    onSuccess: () => {
      toast.success("Queja registrada");
      setNuevo(false);
      setForm({ clienteId: "", tipo: "queja", descripcion: "" });
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const cambiarEstado = useMutation({
    mutationFn: () => quejasApi.cambiarEstado(cambiar!.id, { estado: estadoForm.estado, resolucion: estadoForm.resolucion }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      setCambiar(null);
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const valido = Number(form.clienteId) > 0 && form.descripcion.trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quejas y reclamaciones</h1>
        <Button onClick={() => setNuevo(true)}>
          <Plus className="h-4 w-4" /> Registrar queja
        </Button>
      </div>

      <select
        value={filtro}
        onChange={(e) => {
          setFiltro(e.target.value);
          setPage(1);
        }}
        className="h-10 rounded-md border border-border-line bg-surface px-2 text-sm"
      >
        <option value="">Todos los estados</option>
        <option value="abierta">Abierta</option>
        <option value="en_proceso">En proceso</option>
        <option value="resuelta">Resuelta</option>
      </select>

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
                  <TH>Cliente</TH>
                  <TH>Tipo</TH>
                  <TH>Referencia</TH>
                  <TH>Descripción</TH>
                  <TH>Registrada</TH>
                  <TH>Estado</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {data?.data.map((q) => (
                  <TR key={q.id}>
                    <TD className="font-semibold">{q.clienteNombre}</TD>
                    <TD className="text-xs">{TIPO_LABEL[q.tipo]}</TD>
                    <TD className="font-mono text-xs text-muted">
                      {q.ordenFolio ? `OC ${q.ordenFolio}` : q.ventaFolio ? `VEN ${q.ventaFolio}` : q.tipo === "reclamacion_garantia" ? "Garantía" : "—"}
                    </TD>
                    <TD className="max-w-[240px] truncate">{q.descripcion}</TD>
                    <TD className="text-xs text-muted">{fechaCorta(q.createdAt)}</TD>
                    <TD>
                      <Badge variant={estadoVariant[q.estado]}>{q.estado}</Badge>
                    </TD>
                    <TD className="text-right">
                      {q.estado !== "resuelta" && (
                        <Button size="sm" variant="outline" onClick={() => { setCambiar(q); setEstadoForm({ estado: "resuelta", resolucion: "" }); }}>
                          Atender
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
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

      <Dialog open={nuevo} onClose={() => setNuevo(false)} title="Registrar queja">
        <div className="space-y-3">
          <div>
            <Label>Cliente *</Label>
            <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
              <option value="">Selecciona…</option>
              {clientes.data?.data.map((c: Cliente) => (
                <option key={c.id} value={c.id}>{c.nombre} · {c.telefono}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tipo</Label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoQueja })} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
              <option value="queja">Queja</option>
              <option value="reclamacion_garantia">Reclamación de garantía</option>
            </select>
          </div>
          <div>
            <Label>Descripción *</Label>
            <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          {form.tipo === "reclamacion_garantia" && (
            <p className="text-xs text-muted">
              Las reclamaciones de garantía se registran desde el botón "Reclamar" en Garantías (se vinculan automáticamente).
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNuevo(false)}>Cancelar</Button>
            <Button disabled={!valido || guardar.isPending} onClick={() => guardar.mutate()}>
              {guardar.isPending ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!cambiar} onClose={() => setCambiar(null)} title={`Atender queja · ${cambiar?.clienteNombre ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted">{cambiar?.descripcion}</p>
          <div>
            <Label>Estado</Label>
            <select
              value={estadoForm.estado}
              onChange={(e) => setEstadoForm((f) => ({ ...f, estado: e.target.value as "en_proceso" | "resuelta" }))}
              className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm"
            >
              <option value="en_proceso">En proceso</option>
              <option value="resuelta">Resuelta</option>
            </select>
          </div>
          {estadoForm.estado === "resuelta" && (
            <div>
              <Label>Resolución *</Label>
              <Input value={estadoForm.resolucion} onChange={(e) => setEstadoForm((f) => ({ ...f, resolucion: e.target.value }))} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCambiar(null)}>Cancelar</Button>
            <Button disabled={estadoForm.estado === "resuelta" && !estadoForm.resolucion.trim()} onClick={() => cambiarEstado.mutate()}>
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
