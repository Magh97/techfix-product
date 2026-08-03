import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { productsApi } from "@/lib/api";
import type { CreateProducto } from "@/lib/types";

const CATS: Record<string, string> = {
  componente: "Componente",
  periferico: "Periférico",
  equipo_completo: "Equipo",
  refaccion: "Refacción",
  usado: "Usado",
};

const mxn = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProductosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    nombre: "",
    codigoBarras: "",
    marca: "",
    modelo: "",
    categoriaId: 1,
    precioCompra: "",
    precioVenta: "",
    stockMinimo: "0",
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["productos", busqueda],
    queryFn: () => productsApi.list({ q: busqueda || undefined, pageSize: 50 }),
  });

  const create = useMutation({
    mutationFn: (input: CreateProducto) => productsApi.create(input),
    onSuccess: () => {
      toast.success("Producto creado");
      setAbierto(false);
      setForm({ sku: "", nombre: "", codigoBarras: "", marca: "", modelo: "", categoriaId: 1, precioCompra: "", precioVenta: "", stockMinimo: "0" });
      qc.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (e) => toast.error("Error al crear", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({
      categoriaId: Number(form.categoriaId),
      sku: form.sku,
      nombre: form.nombre,
      codigoBarras: form.codigoBarras || null,
      marca: form.marca || null,
      modelo: form.modelo || null,
      precioCompra: Number(form.precioCompra),
      precioVenta: Number(form.precioVenta),
      stockMinimo: Number(form.stockMinimo || 0),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre o SKU…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="p-6 text-danger" role="alert">
              {error instanceof Error ? error.message : "Error al cargar productos"}
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>SKU</TH>
                  <TH>Producto</TH>
                  <TH>Categoría</TH>
                  <TH className="text-right">P. venta</TH>
                  <TH className="text-right">Stock</TH>
                </TR>
              </THead>
              <tbody>
                {data?.data.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-mono text-xs text-muted">{p.sku}</TD>
                    <TD>{p.nombre}</TD>
                    <TD>
                      <Badge variant="default">{CATS[p.categoria] ?? p.categoria}</Badge>
                    </TD>
                    <TD className="text-right">${mxn(p.precioVenta)}</TD>
                    <TD className="text-right">{p.stock}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} title="Nuevo producto">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>SKU *</Label>
            <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <Label>Nombre *</Label>
            <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código de barras</Label>
              <Input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} />
            </div>
            <div>
              <Label>Categoría</Label>
              <select
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: Number(e.target.value) })}
                className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
              >
                {Object.keys(CATS).map((k, i) => (
                  <option key={k} value={i + 1}>
                    {CATS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Precio compra</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.precioCompra}
                onChange={(e) => setForm({ ...form, precioCompra: e.target.value })}
              />
            </div>
            <div>
              <Label>Precio venta</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.precioVenta}
                onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
