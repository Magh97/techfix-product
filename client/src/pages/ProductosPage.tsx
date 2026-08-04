import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, Download, FileSpreadsheet, Plus, Trash2, Upload } from "lucide-react";
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
import { getSessionUser } from "@/lib/auth";
import type { CreateProducto, ImportResult, Producto } from "@/lib/types";

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
  const esAdmin = getSessionUser()?.rol === "admin";
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [importAbierto, setImportAbierto] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [bomProducto, setBomProducto] = useState<Producto | null>(null);
  const [bomDraft, setBomDraft] = useState<{ productoId: string; cantidad: string }[]>([]);
  const [bomManoObra, setBomManoObra] = useState("");
  const [bomGuardando, setBomGuardando] = useState(false);
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

  const catalogo = useQuery({
    queryKey: ["productos", "catalogo"],
    queryFn: () => productsApi.list({ pageSize: 200 }),
    enabled: !!bomProducto,
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

  function exportar(formato: "csv" | "xlsx") {
    productsApi
      .exportar(formato)
      .then(() => toast.success("Exportación iniciada"))
      .catch((e) => toast.error("Error al exportar", e instanceof Error ? e.message : ""));
  }

  function importar(archivo: File) {
    setImportando(true);
    setResultado(null);
    productsApi
      .importar(archivo)
      .then((r) => {
        setResultado(r);
        toast.success(`Importación completada: ${r.importados} producto(s)`);
        qc.invalidateQueries({ queryKey: ["productos"] });
      })
      .catch((e) => toast.error("Error al importar", e instanceof Error ? e.message : ""))
      .finally(() => setImportando(false));
  }

  function abrirBom(p: Producto) {
    setBomProducto(p);
    setBomManoObra(p.isKit ? String(p.manoObra ?? 0) : "0");
    setBomDraft([{ productoId: "", cantidad: "1" }]);
    productsApi
      .getBom(p.id)
      .then((r) => {
        setBomDraft(r.data.componentes.map((c) => ({ productoId: String(c.productoId), cantidad: String(c.cantidad) })));
        setBomManoObra(String(r.data.manoObra ?? 0));
      })
      .catch(() => {
        // Sin BOM aún: arranca con una fila vacía
      });
  }

  const bomSubtotalCompra = bomDraft.reduce((acc, row) => {
    const p = catalogo.data?.data.find((x) => x.id === Number(row.productoId));
    return acc + (p ? p.precioCompra * (Number(row.cantidad) || 0) : 0);
  }, 0);
  const bomSubtotalVenta = bomDraft.reduce((acc, row) => {
    const p = catalogo.data?.data.find((x) => x.id === Number(row.productoId));
    return acc + (p ? p.precioVenta * (Number(row.cantidad) || 0) : 0);
  }, 0);
  const manoObra = Number(bomManoObra) || 0;

  function guardarBom() {
    if (!bomProducto) return;
    const componentes = bomDraft
      .filter((r) => r.productoId && Number(r.cantidad) > 0)
      .map((r) => ({ productoId: Number(r.productoId), cantidad: Number(r.cantidad) }));
    if (!componentes.length) {
      toast.error("Agrega al menos un componente");
      return;
    }
    setBomGuardando(true);
    productsApi
      .setBom(bomProducto.id, { componentes, manoObra })
      .then(() => {
        toast.success("BOM guardado");
        setBomProducto(null);
        qc.invalidateQueries({ queryKey: ["productos"] });
      })
      .catch((e) => toast.error("Error al guardar BOM", e instanceof Error ? e.message : ""))
      .finally(() => setBomGuardando(false));
  }

  function limpiarBom() {
    if (!bomProducto) return;
    setBomGuardando(true);
    productsApi
      .setBom(bomProducto.id, { componentes: [], manoObra: 0 })
      .then(() => {
        toast.success("BOM eliminado: el producto ya no es un kit");
        setBomProducto(null);
        qc.invalidateQueries({ queryKey: ["productos"] });
      })
      .catch((e) => toast.error("Error al limpiar BOM", e instanceof Error ? e.message : ""))
      .finally(() => setBomGuardando(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportar("csv")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportar("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => setImportAbierto(true)}>
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <Button onClick={() => setAbierto(true)}>
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        </div>
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
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <tbody>
                {data?.data.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-mono text-xs text-muted">{p.sku}</TD>
                    <TD>
                      {p.nombre}
                      {p.isKit && <Badge variant="accent" className="ml-2">Kit</Badge>}
                    </TD>
                    <TD>
                      <Badge variant="default">{CATS[p.categoria] ?? p.categoria}</Badge>
                    </TD>
                    <TD className="text-right">${mxn(p.precioVenta)}</TD>
                    <TD className="text-right">
                      <span className={p.lowStock ? "font-semibold text-warning" : undefined}>{p.stock}</span>
                      {p.lowStock && <Badge variant="warning" className="ml-2">bajo</Badge>}
                    </TD>
                    <TD className="text-right">
                      {esAdmin && (
                        <Button size="sm" variant="outline" onClick={() => abrirBom(p)}>
                          <Cpu className="h-3.5 w-3.5" /> Componentes
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

      <Dialog open={!!bomProducto} onClose={() => setBomProducto(null)} title={`Componentes de ${bomProducto?.nombre ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Define los componentes del kit. El precio del kit se recalcula como la suma de los componentes más la mano
            de obra de ensamble.
          </p>

          <div className="max-h-52 space-y-2 overflow-auto">
            {bomDraft.map((row, i) => {
              const sel = catalogo.data?.data.find((x) => x.id === Number(row.productoId));
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.productoId}
                    onChange={(e) => setBomDraft((d) => d.map((r, j) => (j === i ? { ...r, productoId: e.target.value } : r)))}
                    className="h-10 flex-1 rounded-md border border-border-line bg-surface px-3 text-sm"
                  >
                    <option value="">Selecciona un producto…</option>
                    {catalogo.data?.data
                      .filter((x) => x.id !== bomProducto?.id && !x.isKit)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.sku} — {x.nombre} (${mxn(x.precioVenta)})
                        </option>
                      ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={row.cantidad}
                    onChange={(e) => setBomDraft((d) => d.map((r, j) => (j === i ? { ...r, cantidad: e.target.value } : r)))}
                    className="w-20"
                    placeholder="Cant."
                  />
                  {sel && <span className="w-24 text-right text-xs text-muted">${mxn(sel.precioVenta * (Number(row.cantidad) || 0))}</span>}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setBomDraft((d) => d.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBomDraft((d) => [...d, { productoId: "", cantidad: "1" }])}
            >
              <Plus className="h-4 w-4" /> Agregar componente
            </Button>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted">Mano de obra de ensamble</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={bomManoObra}
                onChange={(e) => setBomManoObra(e.target.value)}
                className="w-24 text-right"
              />
            </div>
          </div>

          <div className="rounded-md bg-surface-2 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Costo kit (Σ compras)</span>
              <span>${mxn(bomSubtotalCompra)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Precio venta (Σ ventas + ensamble)</span>
              <span>${mxn(bomSubtotalVenta + manoObra)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {bomProducto?.isKit && (
              <Button
                type="button"
                variant="danger"
                disabled={bomGuardando}
                onClick={() => {
                  if (confirm(`¿Quitar los componentes de ${bomProducto.nombre}?`)) limpiarBom();
                }}
              >
                Limpiar BOM
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setBomProducto(null)}>
              Cancelar
            </Button>
            <Button onClick={guardarBom} disabled={bomGuardando}>
              {bomGuardando ? "Guardando…" : "Guardar BOM"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={importAbierto} onClose={() => setImportAbierto(false)} title="Importar productos">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Sube un archivo <strong>.csv</strong> o <strong>.xlsx</strong> con los productos. Los duplicados por SKU o
            código de barras se omiten y las filas inválidas se listan al final.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => productsApi.plantilla("csv")}>
              <Download className="h-4 w-4" /> Plantilla CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => productsApi.plantilla("xlsx")}>
              <FileSpreadsheet className="h-4 w-4" /> Plantilla Excel
            </Button>
          </div>
          <div>
            <Label>Archivo</Label>
            <Input
              type="file"
              accept=".csv,.xlsx"
              disabled={importando}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importar(f);
              }}
            />
          </div>

          {importando && (
            <div className="grid place-items-center p-6">
              <Spinner />
            </div>
          )}

          {resultado && !importando && (
            <div className="space-y-3">
              <div className="rounded-md bg-surface-2 p-3 text-sm">
                <p>
                  <strong>{resultado.importados}</strong> importados · <strong>{resultado.omitidos.length}</strong>{" "}
                  omitidos · <strong>{resultado.errores.length}</strong> con error
                </p>
              </div>
              {resultado.omitidos.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold">Omitidos (duplicados)</p>
                  <div className="max-h-40 overflow-y-auto">
                    <Table>
                      <THead>
                        <TR>
                          <TH>Fila</TH>
                          <TH>SKU</TH>
                          <TH>Motivo</TH>
                        </TR>
                      </THead>
                      <tbody>
                        {resultado.omitidos.map((o, i) => (
                          <TR key={i}>
                            <TD>{o.fila}</TD>
                            <TD className="font-mono text-xs">{o.sku}</TD>
                            <TD className="text-muted">{o.motivo}</TD>
                          </TR>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
              {resultado.errores.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-danger">Filas con error</p>
                  <div className="max-h-40 overflow-y-auto">
                    <Table>
                      <THead>
                        <TR>
                          <TH>Fila</TH>
                          <TH>SKU</TH>
                          <TH>Motivo</TH>
                        </TR>
                      </THead>
                      <tbody>
                        {resultado.errores.map((o, i) => (
                          <TR key={i}>
                            <TD>{o.fila}</TD>
                            <TD className="font-mono text-xs">{o.sku}</TD>
                            <TD className="text-muted">{o.motivo}</TD>
                          </TR>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
