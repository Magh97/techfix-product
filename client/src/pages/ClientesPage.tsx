import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { clientesApi } from "@/lib/api";
import { mxn } from "@/lib/utils";

export default function ClientesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "", correo: "", limiteCredito: "3000" });

  const { data, isLoading } = useQuery({
    queryKey: ["clientes", busqueda, page, pageSize],
    queryFn: () => clientesApi.list({ q: busqueda || undefined, page, pageSize }),
  });

  const create = useMutation({
    mutationFn: () =>
      clientesApi.create({
        nombre: form.nombre,
        telefono: form.telefono,
        correo: form.correo || null,
        limiteCredito: Number(form.limiteCredito),
      }),
    onSuccess: () => {
      toast.success("Cliente creado");
      setNuevo(false);
      setForm({ nombre: "", telefono: "", correo: "", limiteCredito: "3000" });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setNuevo(true)}>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre o teléfono…"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

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
                  <TH>Nombre</TH>
                  <TH>Teléfono</TH>
                  <TH>Correo</TH>
                  <TH className="text-right">Límite crédito</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {data?.data.map((c) => (
                  <TR key={c.id} className="cursor-pointer" onClick={() => navigate(`/clientes/${c.id}`)}>
                    <TD>{c.nombre}</TD>
                    <TD>{c.telefono}</TD>
                    <TD className="text-muted">{c.correo ?? "—"}</TD>
                    <TD className="text-right">{mxn(c.limiteCredito)}</TD>
                    <TD className="text-right text-muted">Ver →</TD>
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

      <Dialog open={nuevo} onClose={() => setNuevo(false)} title="Nuevo cliente">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label>Nombre *</Label>
            <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <Label>Teléfono *</Label>
            <Input required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <Label>Correo</Label>
            <Input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </div>
          <div>
            <Label>Límite de crédito</Label>
            <Input type="number" min={0} value={form.limiteCredito} onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setNuevo(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
