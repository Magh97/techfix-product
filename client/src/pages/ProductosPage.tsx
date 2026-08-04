import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, Download, FileSpreadsheet, PackagePlus, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
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
import { catalogosApi, productsApi, proveedoresApi, comprasApi } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { CreateProducto, ImportResult, Movimiento, Producto, Sugerencias } from "@/lib/types";

const mxn = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const labelCategoria = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProductosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const rol = getSessionUser()?.rol;
  const esAdmin = rol === "admin";
  const puedeSolicitar = rol === "admin" || rol === "tecnico";
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [abierto, setAbierto] = useState(false);
  const [importAbierto, setImportAbierto] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [bomProducto, setBomProducto] = useState<Producto | null>(null);
  const [bomDraft, setBomDraft] = useState<{ productoId: string; cantidad: string }[]>([]);
  const [bomManoObra, setBomManoObra] = useState("");
  const [bomGuardando, setBomGuardando] = useState(false);
  const [sustitutos, setSustitutos] = useState<Sugerencias | null>(null);
  const [sustitutosDe, setSustitutosDe] = useState("");
  const [ajustarProducto, setAjustarProducto] = useState<Producto | null>(null);
  const [ajuste, setAjuste] = useState({ cantidad: "", motivo: "" });
  const [ajustando, setAjustando] = useState(false);
  const [movimientosProducto, setMovimientosProducto] = useState<Producto | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [filtroRuta, setFiltroRuta] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [solicitarProducto, setSolicitarProducto] = useState<Producto | null>(null);
  const [solicitud, setSolicitud] = useState({ cantidad: "1", motivo: "" });
  const [solicitando, setSolicitando] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    nombre: "",
    codigoBarras: "",
    marca: "",
    modelo: "",
    catalogoId: "",
    especificaciones: [] as string[],
    precioCompra: "",
    precioVenta: "",
    stockMinimo: "0",
    stockMaximo: "0",
    proveedorFavoritoId: "",
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["productos", busqueda, filtroRuta, page, pageSize],
    queryFn: () =>
      productsApi.list({
        q: busqueda || undefined,
        catalogoId: filtroRuta.length ? filtroRuta[filtroRuta.length - 1] : undefined,
        page,
        pageSize,
      }),
  });

  const proveedoresQuery = useQuery({
    queryKey: ["proveedores-lista"],
    queryFn: () => proveedoresApi.list({ pageSize: 100 }),
    enabled: abierto,
  });
  const proveedores = proveedoresQuery.data?.data ?? [];

  const catalogosQuery = useQuery({ queryKey: ["catalogos-lista"], queryFn: catalogosApi.list });
  const catalogos = catalogosQuery.data?.data ?? [];

  const generalId = catalogos.find((c) => c.parentId === null && c.nombre === "General")?.id ?? null;

  function raizDe(catalogoId: number | null): number {
    if (!catalogoId) return generalId ?? 0;
    let c = catalogos.find((x) => x.id === catalogoId);
    while (c && c.parentId != null) c = catalogos.find((x) => x.id === c!.parentId);
    return c?.id ?? generalId ?? 0;
  }

  function hijosDe(parentId: number | null): typeof catalogos {
    return catalogos.filter((c) => (c.parentId ?? null) === parentId);
  }

  function arbolAplano(): { id: number; label: string; prof: number }[] {
    const out: { id: number; label: string; prof: number }[] = [];
    const hijosDe = (parentId: number | null) => catalogos.filter((c) => (c.parentId ?? null) === parentId);
    const walk = (parentId: number | null, prof: number) => {
      for (const c of hijosDe(parentId)) {
        out.push({ id: c.id, label: c.nombre, prof });
        walk(c.id, prof + 1);
      }
    };
    walk(null, 0);
    return out;
  }

  const catalogoSeleccionado = catalogos.find((c) => c.id === Number(form.catalogoId));
  const categoriaAuto = labelCategoria(
    catalogos.find((c) => c.id === raizDe(form.catalogoId ? Number(form.catalogoId) : null))?.nombre ?? "General"
  );

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
      setForm({ sku: "", nombre: "", codigoBarras: "", marca: "", modelo: "", catalogoId: "", especificaciones: [], precioCompra: "", precioVenta: "", stockMinimo: "0", stockMaximo: "0", proveedorFavoritoId: "" });
      setTagInput("");
      qc.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (e) => toast.error("Error al crear", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const especificaciones = form.especificaciones.filter((t) => t.trim() !== "");
    create.mutate({
      categoriaId: raizDe(form.catalogoId ? Number(form.catalogoId) : null),
      sku: form.sku,
      nombre: form.nombre,
      codigoBarras: form.codigoBarras || null,
      marca: form.marca || null,
      modelo: form.modelo || null,
      precioCompra: Number(form.precioCompra),
      precioVenta: Number(form.precioVenta),
      stockMinimo: Number(form.stockMinimo || 0),
      stockMaximo: Number(form.stockMaximo || 0),
      proveedorFavoritoId: form.proveedorFavoritoId ? Number(form.proveedorFavoritoId) : null,
      catalogoId: form.catalogoId ? Number(form.catalogoId) : null,
      especificaciones,
    });
  }

  function enviarSolicitud() {
    if (!solicitarProducto) return;
    setSolicitando(true);
    comprasApi.solicitudes
      .create({
        productoId: solicitarProducto.id,
        cantidad: Number(solicitud.cantidad) || 1,
        motivo: solicitud.motivo || undefined,
      })
      .then(() => {
        toast.success("Solicitud enviada al administrador");
        setSolicitarProducto(null);
        setSolicitud({ cantidad: "1", motivo: "" });
      })
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"))
      .finally(() => setSolicitando(false));
  }

  function verSustitutos(p: Producto) {
    setSustitutosDe(p.nombre);
    setSustitutos(null);
    productsApi
      .sugerencias(p.id)
      .then((r) => setSustitutos(r.data))
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : ""));
  }

  function sugerirSustituto(i: number) {
    const sel = catalogo.data?.data.find((x) => x.id === Number(bomDraft[i]?.productoId));
    if (!sel) return;
    productsApi
      .sugerencias(sel.id)
      .then((r) => {
        const s = r.data.sustitutos[0];
        if (s) {
          setBomDraft((d) => d.map((r2, j) => (j === i ? { ...r2, productoId: String(s.id) } : r2)));
          toast.success(`Sustituto sugerido: ${s.nombre}`);
        } else {
          toast.info("Sin sustitutos", "No hay productos compatibles con stock.");
        }
      })
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : ""));
  }

  function guardarAjuste() {
    if (!ajustarProducto) return;
    setAjustando(true);
    productsApi
      .ajustar(ajustarProducto.id, { cantidad: Number(ajuste.cantidad), motivo: ajuste.motivo })
      .then(() => {
        toast.success("Inventario ajustado");
        setAjustarProducto(null);
        setAjuste({ cantidad: "", motivo: "" });
        qc.invalidateQueries({ queryKey: ["productos"] });
      })
      .catch((e) => toast.error("Error al ajustar", e instanceof Error ? e.message : ""))
      .finally(() => setAjustando(false));
  }

  function verMovimientos(p: Producto) {
    setMovimientosProducto(p);
    setMovimientos(null);
    productsApi
      .movimientos(p.id, { pageSize: 50 })
      .then((r) => setMovimientos(r.data))
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : ""));
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

      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: Math.max(1, filtroRuta.length) }).map((_, nivel) => {
          const parentId = nivel === 0 ? null : filtroRuta[nivel - 1] ?? null;
          const opciones = hijosDe(parentId);
          const valor = filtroRuta[nivel] ?? "";
          return (
            <select
              key={nivel}
              value={valor}
              onChange={(e) => {
                const v = e.target.value;
                setFiltroRuta(v ? [...filtroRuta.slice(0, nivel), Number(v)] : filtroRuta.slice(0, nivel));
                setPage(1);
              }}
              className="h-10 rounded-md border border-border-line bg-surface px-2 text-sm"
            >
              <option value="">{nivel === 0 ? "Todas las categorías" : "— Todos —"}</option>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          );
        })}
        {filtroRuta.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFiltroRuta([]);
              setPage(1);
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      <Input
        placeholder="Buscar por nombre o SKU…"
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
                      <Badge variant="default">{labelCategoria(p.categoria)}</Badge>
                    </TD>
                    <TD className="text-right">${mxn(p.precioVenta)}</TD>
                    <TD className="text-right">
                      <span className={p.lowStock ? "font-semibold text-warning" : undefined}>{p.stock}</span>
                      {p.lowStock && <Badge variant="warning" className="ml-2">bajo</Badge>}
                    </TD>
                    <TD className="text-right">
                      <Button size="sm" variant="outline" onClick={() => verSustitutos(p)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Sustitutos
                      </Button>
                      {esAdmin && (
                        <Button size="sm" variant="outline" className="ml-1" onClick={() => { setAjustarProducto(p); setAjuste({ cantidad: "", motivo: "" }); }}>
                          Ajustar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="ml-1" onClick={() => verMovimientos(p)}>
                        Movimientos
                      </Button>
                      {puedeSolicitar && p.stock === 0 && (
                        <Button size="sm" variant="outline" className="ml-1" onClick={() => { setSolicitarProducto(p); setSolicitud({ cantidad: "1", motivo: "" }); }}>
                          <PackagePlus className="h-3.5 w-3.5" /> Solicitar
                        </Button>
                      )}
                      {esAdmin && (
                        <Button size="sm" variant="outline" className="ml-1" onClick={() => abrirBom(p)}>
                          <Cpu className="h-3.5 w-3.5" /> Componentes
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
              <Label>Categoría (automática)</Label>
              <div className="flex h-10 items-center rounded-md border border-border-line bg-surface-2 px-3 text-sm text-muted">
                {categoriaAuto}
              </div>
            </div>
          </div>
          <div>
            <Label>Catálogo (subcategoría)</Label>
            <select
              value={form.catalogoId}
              onChange={(e) => setForm({ ...form, catalogoId: e.target.value })}
              className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
            >
              <option value="">Sin catálogo (cae en "General")</option>
              {arbolAplano().map((c) => (
                <option key={c.id} value={c.id}>
                  {"\u00A0".repeat(c.prof * 2)}{c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Especificaciones (tags)</Label>
            <div className="flex flex-wrap items-center gap-2">
              {form.especificaciones.map((t, i) => (
                <span key={i} className="flex items-center gap-1 rounded-full border border-border-line bg-surface-2 px-2.5 py-1 text-xs">
                  {t}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, especificaciones: f.especificaciones.filter((_, j) => j !== i) }))}
                  >
                    ×
                  </button>
                </span>
              ))}
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = tagInput.trim();
                    if (t && !form.especificaciones.includes(t))
                      setForm((f) => ({ ...f, especificaciones: [...f.especificaciones, t] }));
                    setTagInput("");
                  }
                }}
                placeholder="Escribe y presiona Enter…"
                className="h-8 max-w-xs flex-1 text-xs"
              />
            </div>
            {catalogoSeleccionado && catalogoSeleccionado.tagsSugeridas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {catalogoSeleccionado.tagsSugeridas.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setForm((f) =>
                        f.especificaciones.includes(t) ? f : { ...f, especificaciones: [...f.especificaciones, t] }
                      )
                    }
                    className="rounded-full border border-dashed border-border-line px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                min={0}
                value={form.stockMinimo}
                onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
              />
            </div>
            <div>
              <Label>Stock máximo (reposición)</Label>
              <Input
                type="number"
                min={0}
                value={form.stockMaximo}
                onChange={(e) => setForm({ ...form, stockMaximo: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Proveedor favorito</Label>
            <select
              value={form.proveedorFavoritoId}
              onChange={(e) => setForm({ ...form, proveedorFavoritoId: e.target.value })}
              className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
            >
              <option value="">Sin proveedor favorito</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
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
                  {sel && (
                    <div className="flex w-32 flex-col items-end">
                      <span className="text-xs text-muted">{mxn(sel.precioVenta * (Number(row.cantidad) || 0))}</span>
                      {sel.stock < (Number(row.cantidad) || 0) && (
                        <button type="button" className="text-xs text-accent hover:underline" onClick={() => sugerirSustituto(i)}>
                          Sugerir sustituto
                        </button>
                      )}
                    </div>
                  )}
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
      <Dialog open={!!sustitutos} onClose={() => setSustitutos(null)} title={`Sustitutos · ${sustitutosDe}`}>
        <div className="space-y-4">
          {sustitutos?.componenteCorto && (
            <div className="rounded-md bg-warning-soft p-3 text-sm text-warning">
              Kit sin stock de componentes: falta <strong>{sustitutos.componenteCorto.nombre}</strong> (requerido{" "}
              {sustitutos.componenteCorto.requerido}, hay {sustitutos.componenteCorto.stock}).
            </div>
          )}

          {(sustitutos?.sustitutos.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Sustitutos compatibles</p>
              <div className="space-y-1">
                {sustitutos!.sustitutos.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border border-border-line px-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold">{s.nombre}</p>
                      <p className="font-mono text-xs text-muted">{s.sku} · {s.stock} disp.</p>
                    </div>
                    <span className="font-semibold">{mxn(s.precioVenta)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(sustitutos?.sustitutosComponente.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Sustitutos del componente faltante</p>
              <div className="space-y-1">
                {sustitutos!.sustitutosComponente.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border border-border-line px-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold">{s.nombre}</p>
                      <p className="font-mono text-xs text-muted">{s.sku} · {s.stock} disp.</p>
                    </div>
                    <span className="font-semibold">{mxn(s.precioVenta)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sustitutos &&
            sustitutos.sustitutos.length === 0 &&
            sustitutos.sustitutosComponente.length === 0 && (
              <p className="text-sm text-muted">
                Sin sustitutos disponibles. Asigna un catálogo y especificaciones al producto para habilitar sugerencias.
              </p>
            )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSustitutos(null)}>Cerrar</Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={!!ajustarProducto} onClose={() => setAjustarProducto(null)} title={`Ajustar inventario · ${ajustarProducto?.nombre ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Cantidad positiva = alta por inventario físico; negativa = merma/daño. Stock actual:{" "}
            <strong>{ajustarProducto?.stock ?? 0}</strong>.
          </p>
          <div>
            <Label>Cantidad *</Label>
            <Input type="number" step={1} value={ajuste.cantidad} onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })} />
          </div>
          <div>
            <Label>Motivo *</Label>
            <Input value={ajuste.motivo} onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })} placeholder="Ej. inventario físico / merma" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAjustarProducto(null)}>Cancelar</Button>
            <Button disabled={ajustando || !ajuste.cantidad || !ajuste.motivo} onClick={guardarAjuste}>
              {ajustando ? "Ajustando…" : "Ajustar"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!solicitarProducto} onClose={() => setSolicitarProducto(null)} title={`Solicitar refacción · ${solicitarProducto?.nombre ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Sin stock disponible (<strong>0</strong>). El administrador revisará la solicitud para generar la orden de compra.
          </p>
          <div>
            <Label>Cantidad *</Label>
            <Input type="number" min={1} step={1} value={solicitud.cantidad} onChange={(e) => setSolicitud({ ...solicitud, cantidad: e.target.value })} />
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Input value={solicitud.motivo} onChange={(e) => setSolicitud({ ...solicitud, motivo: e.target.value })} placeholder="Ej. refacción requerida para una orden" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSolicitarProducto(null)}>Cancelar</Button>
            <Button disabled={solicitando || !solicitud.cantidad} onClick={enviarSolicitud}>
              {solicitando ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!movimientosProducto} onClose={() => setMovimientosProducto(null)} title={`Movimientos · ${movimientosProducto?.nombre ?? ""}`}>
        <div className="space-y-3">
          {!movimientos ? (
            <div className="grid place-items-center p-6"><Spinner /></div>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-muted">Sin movimientos registrados.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Cantidad</TH>
                  <TH>Motivo</TH>
                  <TH>Usuario</TH>
                </TR>
              </THead>
              <tbody>
                {movimientos.map((m) => (
                  <TR key={m.id}>
                    <TD className="text-xs text-muted">{new Date(m.fecha).toLocaleString("es-MX")}</TD>
                    <TD className="font-mono text-xs">{m.tipo}</TD>
                    <TD className={cn("text-right font-semibold", m.cantidad < 0 ? "text-danger" : "text-primary")}>
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </TD>
                    <TD className="text-muted">{m.motivo ?? "—"}</TD>
                    <TD>{m.usuario}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setMovimientosProducto(null)}>Cerrar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
