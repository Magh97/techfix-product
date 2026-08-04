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
import { getSessionUser } from "@/lib/auth";
import { usuariosApi } from "@/lib/api";
import type { Usuario } from "@/lib/types";

const ROL_LABEL: Record<string, string> = { admin: "Administrador", vendedor: "Vendedor", tecnico: "Técnico" };

const rolVariant: Record<string, "default" | "accent" | "warning"> = { admin: "accent", vendedor: "default", tecnico: "warning" };

export default function UsuariosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const yo = getSessionUser();
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [soloActivos, setSoloActivos] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [form, setForm] = useState({ nombre: "", usuario: "", password: "", rol: "vendedor" });

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios", soloActivos, page, pageSize],
    queryFn: () => usuariosApi.list({ isActive: soloActivos ? true : undefined, page, pageSize }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["usuarios"] });

  const save = useMutation({
    mutationFn: () =>
      editando
        ? usuariosApi.update(editando.id, {
            nombre: form.nombre,
            rol: form.rol as Usuario["rol"],
            ...(form.password ? { password: form.password } : {}),
          })
        : usuariosApi.create({
            nombre: form.nombre,
            usuario: form.usuario,
            password: form.password,
            rol: form.rol as Usuario["rol"],
          }),
    onSuccess: () => {
      toast.success(editando ? "Usuario actualizado" : "Usuario creado");
      setNuevo(false);
      setEditando(null);
      setForm({ nombre: "", usuario: "", password: "", rol: "vendedor" });
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const toggleActivo = useMutation({
    mutationFn: () => usuariosApi.update(editando!.id, { isActive: !editando!.isActive }),
    onSuccess: () => {
      toast.success(editando?.isActive ? "Usuario desactivado" : "Usuario reactivado");
      setEditando(null);
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function abrirNuevo() {
    setEditando(null);
    setForm({ nombre: "", usuario: "", password: "", rol: "vendedor" });
    setNuevo(true);
  }

  function abrirEdicion(u: Usuario) {
    setEditando(u);
    setForm({ nombre: u.nombre, usuario: u.usuario ?? "", password: "", rol: u.rol });
    setNuevo(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button onClick={abrirNuevo}>
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={soloActivos}
          onChange={(e) => {
            setSoloActivos(e.target.checked);
            setPage(1);
          }}
        />
        Solo activos
      </label>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10"><Spinner /></div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Usuario</TH>
                  <TH>Rol</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <tbody>
                {data?.data.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      {u.nombre}
                      {u.id === yo?.id && <Badge variant="accent" className="ml-2">tú</Badge>}
                    </TD>
                    <TD className="font-mono text-sm">{u.usuario ?? "—"}</TD>
                    <TD><Badge variant={rolVariant[u.rol]}>{ROL_LABEL[u.rol] ?? u.rol}</Badge></TD>
                    <TD>{u.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="warning">Inactivo</Badge>}</TD>
                    <TD className="text-right">
                      <Button size="sm" variant="outline" onClick={() => abrirEdicion(u)}>Editar</Button>
                      {u.id !== yo?.id && (
                        <Button
                          size="sm"
                          variant={u.isActive ? "danger" : "outline"}
                          className="ml-1"
                          onClick={() => {
                            setEditando(u);
                            if (confirm(`¿${u.isActive ? "Desactivar" : "Reactivar"} a ${u.nombre}?`)) toggleActivo.mutate();
                          }}
                        >
                          {u.isActive ? "Desactivar" : "Reactivar"}
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

      <Dialog open={nuevo} onClose={() => setNuevo(false)} title={editando ? "Editar usuario" : "Nuevo usuario"}>
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
          {!editando && (
            <div>
              <Label>Usuario *</Label>
              <Input required minLength={4} value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
            </div>
          )}
          <div>
            <Label>{editando ? "Nueva contraseña (vacío = no cambiar)" : "Contraseña *"}</Label>
            <Input
              type="password"
              required={!editando}
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <Label>Rol</Label>
            <select
              value={form.rol}
              disabled={editando?.id === yo?.id}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
              className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm"
            >
              <option value="vendedor">Vendedor</option>
              <option value="tecnico">Técnico</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setNuevo(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
