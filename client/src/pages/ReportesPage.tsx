import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { reportsApi, usuariosApi } from "@/lib/api";
import { cn, mxn } from "@/lib/utils";

const CATS: Record<string, string> = {
  componente: "Componente",
  periferico: "Periférico",
  equipo_completo: "Equipo",
  refaccion: "Refacción",
  usado: "Usado",
};

const ESTADOS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_diagnostico: "Diagnóstico",
  cotizado: "Cotizado",
  en_reparacion: "En reparación",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

type Tab = "inventario" | "ventas" | "servicios" | "rentabilidad" | "clientes" | "financiero";

export default function ReportesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("inventario");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [agrupar, setAgrupar] = useState("dia");
  const [estado, setEstado] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");

  const range = { desde: desde || undefined, hasta: hasta || undefined };

  const inventario = useQuery({
    queryKey: ["reporte-inventario"],
    queryFn: () => reportsApi.inventario(),
    enabled: tab === "inventario",
  });

  const ventas = useQuery({
    queryKey: ["reporte-ventas", desde, hasta, agrupar],
    queryFn: () => reportsApi.ventas({ ...range, agrupar }),
    enabled: tab === "ventas",
  });

  const servicios = useQuery({
    queryKey: ["reporte-servicios", desde, hasta, estado, tecnicoId],
    queryFn: () =>
      reportsApi.servicios({
        ...range,
        estado: estado || undefined,
        tecnicoId: tecnicoId ? Number(tecnicoId) : undefined,
      }),
    enabled: tab === "servicios",
  });

  const rentabilidad = useQuery({
    queryKey: ["reporte-rentabilidad", desde, hasta],
    queryFn: () => reportsApi.rentabilidad(range),
    enabled: tab === "rentabilidad",
  });

  const clientes = useQuery({
    queryKey: ["reporte-clientes", desde, hasta],
    queryFn: () => reportsApi.clientes(range),
    enabled: tab === "clientes",
  });

  const financiero = useQuery({
    queryKey: ["reporte-financiero", desde, hasta],
    queryFn: () => reportsApi.financiero(range),
    enabled: tab === "financiero",
  });

  const tecnicos = useQuery({
    queryKey: ["usuarios", "tecnicos"],
    queryFn: () => usuariosApi.list({ rol: "tecnico" }),
    enabled: tab === "servicios",
  });

  function exportar(tipo: Tab, formato: "csv" | "xlsx") {
    const params =
      tipo === "ventas"
        ? { ...range, agrupar }
        : tipo === "servicios"
          ? { ...range, estado: estado || undefined, tecnicoId: tecnicoId ? Number(tecnicoId) : undefined }
          : { ...range };
    reportsApi
      .exportar(tipo, formato, params as Record<string, string | number | undefined>)
      .then(() => toast.success("Exportación iniciada"))
      .catch((e) => toast.error("Error al exportar", e instanceof Error ? e.message : ""));
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "inventario", label: "Inventario" },
    { id: "ventas", label: "Ventas" },
    { id: "servicios", label: "Servicios" },
    { id: "rentabilidad", label: "Rentabilidad" },
    { id: "clientes", label: "Clientes" },
    { id: "financiero", label: "Financiero" },
  ];

  const conFiltros = tab !== "inventario";
  const cargando = [inventario, ventas, servicios, rentabilidad, clientes, financiero].find((q) => q.isFetching && q.isEnabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportar(tab, "csv")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportar(tab, "xlsx")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {conFiltros && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          {tab === "ventas" && (
            <div>
              <Label>Agrupar por</Label>
              <select
                value={agrupar}
                onChange={(e) => setAgrupar(e.target.value)}
                className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
              >
                <option value="dia">Día</option>
                <option value="producto">Producto</option>
                <option value="vendedor">Vendedor</option>
                <option value="metodo">Método de pago</option>
              </select>
            </div>
          )}
          {tab === "servicios" && (
            <>
              <div>
                <Label>Estado</Label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
                >
                  <option value="">Todos</option>
                  {Object.entries(ESTADOS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Técnico</Label>
                <select
                  value={tecnicoId}
                  onChange={(e) => setTecnicoId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm"
                >
                  <option value="">Todos</option>
                  {tecnicos.data?.data.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {cargando && (
        <div className="grid place-items-center p-10">
          <Spinner />
        </div>
      )}

      {!cargando && tab === "inventario" && inventario.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Total artículos</p>
                <p className="text-2xl font-bold">{inventario.data.data.resumen.totalArticulos}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Valor a costo</p>
                <p className="text-2xl font-bold">{mxn(inventario.data.data.resumen.valorTotalCosto)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Con stock bajo</p>
                <p className="text-2xl font-bold text-warning">{inventario.data.data.resumen.stockBajo}</p>
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>SKU</TH>
                    <TH>Producto</TH>
                    <TH>Categoría</TH>
                    <TH className="text-right">Stock</TH>
                    <TH className="text-right">Valoración</TH>
                  </TR>
                </THead>
                <tbody>
                  {inventario.data.data.data.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-mono text-xs text-muted">{p.sku}</TD>
                      <TD>
                        {p.nombre}
                        {p.lowStock && <Badge variant="warning" className="ml-2">bajo</Badge>}
                      </TD>
                      <TD>{CATS[p.categoria] ?? p.categoria}</TD>
                      <TD className="text-right">{p.stock}</TD>
                      <TD className="text-right">{mxn(p.valoracionCosto)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}

      {!cargando && tab === "ventas" && ventas.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Ventas</p>
                <p className="text-2xl font-bold">{ventas.data.data.resumen.totalVentas}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Importe total</p>
                <p className="text-2xl font-bold">{mxn(ventas.data.data.resumen.totalImporte)}</p>
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Grupo</TH>
                    <TH className="text-right">Ventas</TH>
                    {agrupar === "producto" && <TH className="text-right">Unidades</TH>}
                    <TH className="text-right">Total</TH>
                  </TR>
                </THead>
                <tbody>
                  {ventas.data.data.data.map((v) => (
                    <TR key={v.grupo}>
                      <TD className="capitalize">{v.grupo}</TD>
                      <TD className="text-right">{v.ventas}</TD>
                      {agrupar === "producto" && <TD className="text-right">{v.unidades ?? 0}</TD>}
                      <TD className="text-right">{mxn(v.total)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}

      {!cargando && tab === "servicios" && servicios.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Total órdenes</p>
                <p className="text-2xl font-bold">{servicios.data.data.resumen.total}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">En proceso</p>
                <p className="text-2xl font-bold">{servicios.data.data.resumen.enProceso}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">T. promedio reparación</p>
                <p className="text-2xl font-bold">{servicios.data.data.resumen.tiempoPromedioReparacionDias} días</p>
              </CardBody>
            </Card>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <p className="mb-2 text-sm font-semibold">Por estado</p>
                <Table>
                  <THead>
                    <TR>
                      <TH>Estado</TH>
                      <TH className="text-right">Órdenes</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {servicios.data.data.porEstado.map((s) => (
                      <TR key={s.estado}>
                        <TD className="capitalize">{ESTADOS_LABEL[s.estado] ?? s.estado}</TD>
                        <TD className="text-right">{s.ordenes}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="mb-2 text-sm font-semibold">Por técnico</p>
                <Table>
                  <THead>
                    <TR>
                      <TH>Técnico</TH>
                      <TH className="text-right">Órdenes</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {servicios.data.data.porTecnico.map((s) => (
                      <TR key={s.tecnico}>
                        <TD>{s.tecnico}</TD>
                        <TD className="text-right">{s.ordenes}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {!cargando && tab === "rentabilidad" && rentabilidad.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Ingreso total</p>
                <p className="text-2xl font-bold">{mxn(rentabilidad.data.data.resumen.ingresoTotal)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Margen total</p>
                <p className="text-2xl font-bold text-primary">{mxn(rentabilidad.data.data.resumen.margenTotal)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Margen %</p>
                <p className="text-2xl font-bold">{rentabilidad.data.data.resumen.margenPctPromedio}%</p>
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH className="text-right">Unidades</TH>
                    <TH className="text-right">Ingreso</TH>
                    <TH className="text-right">Margen</TH>
                    <TH className="text-right">Margen %</TH>
                  </TR>
                </THead>
                <tbody>
                  {rentabilidad.data.data.data.map((p) => (
                    <TR key={p.producto}>
                      <TD>{p.producto}</TD>
                      <TD className="text-right">{p.unidades}</TD>
                      <TD className="text-right">{mxn(p.ingreso)}</TD>
                      <TD className="text-right">{mxn(p.margen)}</TD>
                      <TD className="text-right">{p.margenPct}%</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}

      {!cargando && tab === "clientes" && clientes.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Clientes</p>
                <p className="text-2xl font-bold">{clientes.data.data.resumen.totalClientes}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Total compras</p>
                <p className="text-2xl font-bold">{mxn(clientes.data.data.resumen.totalCompras)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Saldo pendiente</p>
                <p className="text-2xl font-bold text-danger">{mxn(clientes.data.data.resumen.saldoTotal)}</p>
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Cliente</TH>
                    <TH className="text-right">Ventas</TH>
                    <TH className="text-right">Total compras</TH>
                    <TH className="text-right">Ticket promedio</TH>
                    <TH className="text-right">Saldo</TH>
                  </TR>
                </THead>
                <tbody>
                  {clientes.data.data.data.map((c) => (
                    <TR key={c.clienteId}>
                      <TD>{c.cliente}</TD>
                      <TD className="text-right">{c.ventas}</TD>
                      <TD className="text-right">{mxn(c.totalCompras)}</TD>
                      <TD className="text-right">{mxn(c.ticketPromedio)}</TD>
                      <TD className={cn("text-right", c.saldo > 0 && "text-danger")}>{mxn(c.saldo)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}

      {!cargando && tab === "financiero" && financiero.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Ingresos</p>
                <p className="text-2xl font-bold text-primary">{mxn(financiero.data.data.resumen.totalIngresos)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Egresos</p>
                <p className="text-2xl font-bold text-danger">{mxn(financiero.data.data.resumen.totalEgresos)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted">Utilidad neta</p>
                <p className="text-2xl font-bold">{mxn(financiero.data.data.resumen.utilidad)}</p>
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Mes</TH>
                    <TH className="text-right">Ventas</TH>
                    <TH className="text-right">Ingresos</TH>
                    <TH className="text-right">Egresos</TH>
                    <TH className="text-right">Utilidad</TH>
                  </TR>
                </THead>
                <tbody>
                  {financiero.data.data.data.map((f) => (
                    <TR key={f.mes}>
                      <TD className="capitalize">{f.mes}</TD>
                      <TD className="text-right">{f.ventas}</TD>
                      <TD className="text-right">{mxn(f.ingresos)}</TD>
                      <TD className="text-right">{mxn(f.egresos)}</TD>
                      <TD className={cn("text-right", f.utilidad < 0 && "text-danger")}>{mxn(f.utilidad)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
