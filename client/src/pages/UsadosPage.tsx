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
import { clientesApi, usadosApi } from "@/lib/api";
import type { Cliente, OrigenUsado } from "@/lib/types";

const mxn = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ORIGEN_LABEL: Record<OrigenUsado, string> = {
  parte_de_pago: "Parte de pago",
  reparacion: "Reparación",
  otro: "Otro",
};

const inicial = {
  sku: "",
  nombre: "",
  codigoBarras: "",
  marca: "",
  modelo: "",
  valorTradeIn: "0",
  precioVenta: "",
  stock: "1",
  origen: "otro" as OrigenUsado,
  clienteId: "",
  observaciones: "",
};

export default function UsadosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const esAdmin = getSessionUser()?.rol === "admin";
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [origen, setOrigen] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState(inicial);

  const { data, isLoading } = useQuery({
    queryKey: ["usados", busqueda, estado, origen, page, pageSize],
    queryFn: () =>
      usadosApi.list({
        q: busqueda || undefined,
        estado: estado || undefined,
        origen: origen || undefined,
        page,
        pageSize,
      }),
  });

  const clientes = useQuery({
    queryKey: ["clientes", "busqueda-usados"],
    queryFn: () => clientesApi.list({ q: form.clienteId ? undefined : "", page: 1, pageSize: 50 }),
    enabled: nuevo,
  });

  function resetForm() {
    setForm(inicial);
    setNuevo(true);
  }

  const guardar = useMutation({
    mutationFn: () =>
      usadosApi.create({
        sku: form.sku,
        nombre: form.nombre,
        codigoBarras: form.codigoBarras || null,
        marca: form.marca || null,
        modelo: form.modelo || null,
        valorTradeIn: Number(form.valorTradeIn),
        precioVenta: Number(form.precioVenta),
        stock: Number(form.stock) || 1,
        origen: form.origen,
        clienteId: form.clienteId ? Number(form.clienteId) : null,
        observaciones: form.observaciones || undefined,
      }),
    onSuccess: () => {
      toast.success("Equipo usado registrado");
      setNuevo(false);
      qc.invalidateQueries({ queryKey: ["usados"] });
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  const valido = form.sku.trim() && form.nombre.trim() && Number(form.precioVenta) > 0 && Number(form.valorTradeIn) >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipos usados</h1>
        {esAdmin && (
          <Button onClick={resetForm}>
            <Plus className="h-4 w-4" /> Registrar usado
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nombre o SKU…"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-border-line bg-surface px-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="disponible">Disponible</option>
          <option value="vendido">Vendido</option>
        </select>
        <select
          value={origen}
          onChange={(e) => {
            setOrigen(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-border-line bg-surface px-2 text-sm"
        >
          <option value="">Todos los orígenes</option>
          <option value="parte_de_pago">Parte de pago</option>
          <option value="reparacion">Reparación</option>
          <option value="otro">Otro</option>
        </select>
      </div>

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
                  <TH>Producto</TH>
                  <TH>Origen</TH>
                  <TH>Cliente origen</TH>
                  <TH className="text-right">Valor trade-in</TH>
                  <TH className="text-right">P. venta</TH>
                  <TH className="text-right">Stock</TH>
                  <TH>Estado</TH>
                </TR>
              </THead>
              <tbody>
                {data?.data.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <p className="font-semibold">{u.nombre}</p>
                      <p className="font-mono text-xs text-muted">{u.sku}</p>
                    </TD>
                    <TD className="capitalize">{ORIGEN_LABEL[u.origen]}</TD>
                    <TD className="text-muted">{u.clienteOrigenNombre ?? "—"}</TD>
                    <TD className="text-right">{mxn(u.valorTradeIn)}</TD>
                    <TD className="text-right">{mxn(u.precioVenta)}</TD>
                    <TD className="text-right">{u.stock}</TD>
                    <TD>
                      <Badge variant={u.estado === "disponible" ? "success" : "default"}>{u.estado}</Badge>
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

      <Dialog open={nuevo} onClose={() => setNuevo(false)} title="Registrar equipo usado">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SKU *</Label>
              <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Código de barras</Label>
              <Input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Nombre del equipo *</Label>
            <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor de parte de pago / costo *</Label>
              <Input type="number" min={0} step="0.01" value={form.valorTradeIn} onChange={(e) => setForm({ ...form, valorTradeIn: e.target.value })} />
            </div>
            <div>
              <Label>Precio de venta *</Label>
              <Input type="number" min={0.01} step="0.01" value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stock (default 1)</Label>
              <Input type="number" min={1} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div>
              <Label>Origen</Label>
              <select value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value as OrigenUsado })} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
                <option value="parte_de_pago">Parte de pago</option>
                <option value="reparacion">Reparación</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Cliente que lo entregó (opcional)</Label>
            <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="h-10 w-full rounded-md border border-border-line bg-surface px-2 text-sm">
              <option value="">— Sin cliente —</option>
              {clientes.data?.data.map((c: Cliente) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {c.telefono}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Observaciones</Label>
            <Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Ej. recibido como parte de pago del equipo nuevo" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNuevo(false)}>Cancelar</Button>
            <Button disabled={!valido || guardar.isPending} onClick={() => guardar.mutate()}>
              {guardar.isPending ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
