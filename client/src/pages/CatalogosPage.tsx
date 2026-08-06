import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FolderPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { catalogosApi } from "@/lib/api";
import type { Catalogo } from "@/lib/types";

interface FormCatalogo {
  nombre: string;
  parentId: string;
  tagsSugeridas: string[];
  tagsCompatibilidad: string[];
}

const formVacio: FormCatalogo = { nombre: "", parentId: "", tagsSugeridas: [], tagsCompatibilidad: [] };

function EditorTags({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((t, i) => (
        <span key={i} className="flex items-center gap-1 rounded-full border border-border-line bg-surface-2 px-2.5 py-1 text-xs">
          {t}
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            ×
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const t = draft.trim();
            if (t && !value.includes(t)) onChange([...value, t]);
            setDraft("");
          }
        }}
        placeholder={placeholder}
        className="h-8 max-w-xs flex-1 text-xs"
      />
    </div>
  );
}

export default function CatalogosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Catalogo | null>(null);
  const [form, setForm] = useState<FormCatalogo>(formVacio);

  const { data, isLoading } = useQuery({ queryKey: ["catalogos"], queryFn: catalogosApi.list });
  const catalogos = data?.data ?? [];

  function hijosDe(parentId: number | null): Catalogo[] {
    return catalogos.filter((c) => (c.parentId ?? null) === parentId);
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ["catalogos"] });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        nombre: form.nombre,
        parentId: form.parentId ? Number(form.parentId) : null,
        tagsSugeridas: form.tagsSugeridas,
        tagsCompatibilidad: form.tagsCompatibilidad,
      };
      return editando ? catalogosApi.update(editando.id, payload) : catalogosApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editando ? "Catálogo actualizado" : "Catálogo creado");
      setAbierto(false);
      setEditando(null);
      setForm(formVacio);
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const remove = useMutation({
    mutationFn: () => catalogosApi.remove(editando!.id),
    onSuccess: () => {
      toast.success("Catálogo eliminado");
      setEditando(null);
      setAbierto(false);
      invalidate();
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function abrirNuevo() {
    setEditando(null);
    setForm(formVacio);
    setAbierto(true);
  }

  function abrirEdicion(c: Catalogo) {
    setEditando(c);
    setForm({
      nombre: c.nombre,
      parentId: c.parentId ? String(c.parentId) : "",
      tagsSugeridas: [...c.tagsSugeridas],
      tagsCompatibilidad: [...c.tagsCompatibilidad],
    });
    setAbierto(true);
  }

  function renderArbol(nodos: Catalogo[], profundidad: number) {
    return nodos.map((n) => (
      <div key={n.id}>
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-surface-2"
          style={{ marginLeft: profundidad * 20 }}
        >
          <ChevronRight className="h-4 w-4 text-muted" />
          <span className="font-medium">{n.nombre}</span>
          {n.tagsSugeridas.length > 0 && (
            <Badge variant="default">{n.tagsSugeridas.length} tags</Badge>
          )}
          {n.tagsCompatibilidad.length > 0 && (
            <Badge variant="accent">compat: {n.tagsCompatibilidad.join(", ")}</Badge>
          )}
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => abrirEdicion(n)}>Editar</Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() => {
                if (confirm(`¿Eliminar el catálogo "${n.nombre}"?`)) {
                  setEditando(n);
                  remove.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hijosDe(n.id).length > 0 && renderArbol(hijosDe(n.id), profundidad + 1)}
      </div>
    ));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catálogos</h1>
        <Button onClick={abrirNuevo}>
          <FolderPlus className="h-4 w-4" /> Nuevo catálogo
        </Button>
      </div>
      <p className="text-sm text-muted">
        Clasificación jerárquica de productos (categoría → subcategoría). Cada catálogo define sus campos de
        especificación y cuáles son claves de compatibilidad para sugerir sustitutos.
      </p>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10"><Spinner /></div>
          ) : (
            <div className="p-3">{renderArbol(hijosDe(null), 0)}</div>
          )}
        </CardBody>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} title={editando ? "Editar catálogo" : "Nuevo catálogo"}>
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
            <Label>Catálogo padre</Label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm"
            >
              <option value="">Raíz (sin padre)</option>
              {catalogos
                .filter((c) => c.id !== editando?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
            </select>
          </div>

          <div>
            <Label>Tags sugeridas (al dar de alta un producto)</Label>
            <EditorTags
              value={form.tagsSugeridas}
              onChange={(tagsSugeridas) => setForm((f) => ({ ...f, tagsSugeridas }))}
              placeholder="Ej. SO-DIMM, 16 GB…"
            />
          </div>

          <div>
            <Label>Tags de compatibilidad (deben coincidir para sugerir sustitutos)</Label>
            <EditorTags
              value={form.tagsCompatibilidad}
              onChange={(tagsCompatibilidad) => setForm((f) => ({ ...f, tagsCompatibilidad }))}
              placeholder="Ej. DDR4, DDR5…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editando && (
              <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => { if (confirm("¿Eliminar este catálogo?")) remove.mutate(); }}>
                Eliminar
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
