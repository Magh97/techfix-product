import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { comprasApi, productsApi, proveedoresApi } from "@/lib/api";
import { mxn } from "@/lib/utils";

interface LineaNueva {
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: string;
  precioUnitario: string;
}

export default function NuevaCompraPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [proveedorId, setProveedorId] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<LineaNueva[]>([]);

  const { data: proveedores } = useQuery({ queryKey: ["proveedores-lista"], queryFn: () => proveedoresApi.list({ pageSize: 100 }) });
  const { data: productos } = useQuery({
    queryKey: ["productos-buscar", busqueda],
    queryFn: () => productsApi.list({ q: busqueda || undefined, pageSize: 20 }),
    enabled: busqueda.trim().length > 0,
  });

  const total = useMemo(() => lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0), [lineas]);

  const crear = useMutation({
    mutationFn: () =>
      comprasApi.create({
        proveedorId: Number(proveedorId),
        fechaVencimiento: fechaVencimiento || null,
        lineas: lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precioUnitario),
        })),
      }),
    onSuccess: (res) => {
      toast.success("Orden de compra creada");
      navigate(`/compras/${res.data.id}`);
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  function agregar(producto: { id: number; sku: string; nombre: string; precioCompra: number }) {
    if (lineas.some((l) => l.productoId === producto.id)) return;
    setLineas((prev) => [
      ...prev,
      { productoId: producto.id, sku: producto.sku, nombre: producto.nombre, cantidad: "1", precioUnitario: String(producto.precioCompra) },
    ]);
    setBusqueda("");
  }

  const valido = Number(proveedorId) > 0 && lineas.length > 0 && lineas.every((l) => Number(l.cantidad) > 0 && Number(l.precioUnitario) >= 0);

  return (
    <div className="space-y-4">
      <Link to="/compras" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Órdenes de compra
      </Link>
      <h1 className="text-2xl font-bold">Nueva orden de compra</h1>

      <div className="grid max-w-xl grid-cols-2 gap-3">
        <div>
          <Label>Proveedor *</Label>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm"
          >
            <option value="">Seleccionar…</option>
            {proveedores?.data.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Fecha de vencimiento (pago)</Label>
          <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div>
            <Label>Agregar producto</Label>
            <Input placeholder="Buscar producto por nombre, SKU o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          {productos && (
            <div className="overflow-hidden rounded-md border border-border-line">
              <Table>
                <tbody>
                  {productos.data.map((p) => (
                    <TR key={p.id} className="cursor-pointer" onClick={() => agregar(p)}>
                      <TD className="font-mono text-xs text-muted">{p.sku}</TD>
                      <TD>{p.nombre}</TD>
                      <TD className="text-right text-muted">{p.stock} disp.</TD>
                      <TD className="text-right">{mxn(p.precioCompra)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      {lineas.length > 0 && (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH className="text-right">Cantidad</TH>
                  <TH className="text-right">P. unitario</TH>
                  <TH className="text-right">Subtotal</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {lineas.map((l) => (
                  <TR key={l.productoId}>
                    <TD>
                      <p>{l.nombre}</p>
                      <p className="font-mono text-xs text-muted">{l.sku}</p>
                    </TD>
                    <TD className="text-right">
                      <input
                        type="number"
                        min={1}
                        value={l.cantidad}
                        onChange={(e) => setLineas((prev) => prev.map((x) => (x.productoId === l.productoId ? { ...x, cantidad: e.target.value } : x)))}
                        className="h-8 w-20 rounded-md border border-border-line bg-surface px-2 text-right text-sm"
                      />
                    </TD>
                    <TD className="text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.precioUnitario}
                        onChange={(e) => setLineas((prev) => prev.map((x) => (x.productoId === l.productoId ? { ...x, precioUnitario: e.target.value } : x)))}
                        className="h-8 w-28 rounded-md border border-border-line bg-surface px-2 text-right text-sm"
                      />
                    </TD>
                    <TD className="text-right">{mxn((Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0))}</TD>
                    <TD className="text-right">
                      <button
                        className="text-muted hover:text-danger"
                        onClick={() => setLineas((prev) => prev.filter((x) => x.productoId !== l.productoId))}
                        aria-label="Quitar línea"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </tbody>
              <tfoot>
                <TR>
                  <TD colSpan={3} className="text-right font-semibold">Total neto</TD>
                  <TD className="text-right font-bold">{mxn(total)}</TD>
                  <TD />
                </TR>
              </tfoot>
            </Table>
          </CardBody>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/compras")}>Cancelar</Button>
        <Button disabled={!valido || crear.isPending} onClick={() => crear.mutate()}>
          <Plus className="h-4 w-4" /> {crear.isPending ? "Creando…" : "Crear orden de compra"}
        </Button>
      </div>
    </div>
  );
}
