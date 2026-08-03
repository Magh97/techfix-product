import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import { proveedoresApi } from "@/lib/api";
import type { Proveedor } from "@/lib/types";

export default function ProveedoresPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const esAdmin = getSessionUser()?.rol === "admin";
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: "", contacto: "", condicionesPago: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["proveedores", busqueda],
    queryFn: () => proveedoresApi.list({ q: busqueda || undefined, pageSize: 50 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["proveedores"] });

  const save = useMutation({
    mutationFn: () =>
      editando
        ? proveedoresApi.update(editando.id, {
            nombre: form.nombre,
            contacto: form.contacto || null,
            condicionesPago: form.condicionesPago || null,
          })
        : proveedoresApi.create({
            nombre: form.nombre,
            contacto: form.contacto || null,
            condicionesPago: form.condicionesPago || null,
          }),
    onSuccess: () => {
      toast.success(editando ? "Proveedor actualizado" : "Proveedor creado");
      setNuevo(false);
      setEditando(null);
      setForm({ nombre: "", contacto: "", condicionesPago: "" });
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const remove = useMutation({
    mutationFn: () => proveedoresApi.remove(editando!.id),
    onSuccess: () => {
      toast.success("Proveedor desactivado");
      setEditando(null);
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function abrirNuevo() {
    setEditando(null);
    setForm({ nombre: "", contacto: "", condicionesPago: "" });
    setNuevo(true);
  }

  function abrirEdicion(p: Proveedor) {
    setEditando(p);
    setForm({ nombre: p.nombre, contacto: p.contacto ?? "", condicionesPago: p.condicionesPago ?? "" });
    setNuevo(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        {esAdmin && (
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4" /> Nuevo proveedor
          </Button>
        )}
      </div>

      <Input placeholder="Buscar por nombre o contacto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="max-w-sm" />

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
                  <TH>Contacto</TH>
                  <TH>Condiciones de pago</TH>
                  {esAdmin && <TH />}
                </TR>
              </THead>
              <tbody>
                {data?.data.map((p) => (
                  <TR key={p.id}>
                    <TD>{p.nombre}</TD>
                    <TD className="text-muted">{p.contacto ?? "—"}</TD>
                    <TD className="text-muted">{p.condicionesPago ?? "—"}</TD>
                    {esAdmin && (
                      <TD className="text-right">
                        <Button size="sm" variant="outline" onClick={() => abrirEdicion(p)}>
                          Editar
                        </Button>
                      </TD>
                    )}
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Dialog open={nuevo} onClose={() => setNuevo(false)} title={editando ? "Editar proveedor" : "Nuevo proveedor"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label>Nombre *</Label>
            <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <Label>Contacto</Label>
            <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
          </div>
          <div>
            <Label>Condiciones de pago</Label>
            <Input value={form.condicionesPago} onChange={(e) => setForm({ ...form, condicionesPago: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {editando && (
              <Button
                type="button"
                variant="danger"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`¿Desactivar a ${editando.nombre}?`)) remove.mutate();
                }}
              >
                Desactivar
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setNuevo(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
