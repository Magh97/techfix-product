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
import { cn } from "@/lib/utils";

const mxn = (n: number | undefined) => (n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

type Tab = "inventario" | "ventas" | "servicios";

export default function ReportesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("inventario");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [agrupar, setAgrupar] = useState("dia");
  const [estado, setEstado] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");

  const inventario = useQuery({
    queryKey: ["reporte-inventario"],
    queryFn: () => reportsApi.inventario(),
    enabled: tab === "inventario",
  });

  const ventas = useQuery({
    queryKey: ["reporte-ventas", desde, hasta, agrupar],
    queryFn: () => reportsApi.ventas({ desde: desde || undefined, hasta: hasta || undefined, agrupar }),
    enabled: tab === "ventas",
  });

  const servicios = useQuery({
    queryKey: ["reporte-servicios", desde, hasta, estado, tecnicoId],
    queryFn: () =>
      reportsApi.servicios({
        desde: desde || undefined,
        hasta: hasta || undefined,
        estado: estado || undefined,
        tecnicoId: tecnicoId ? Number(tecnicoId) : undefined,
      }),
    enabled: tab === "servicios",
  });

  const tecnicos = useQuery({
    queryKey: ["usuarios", "tecnicos"],
    queryFn: () => usuariosApi.list({ rol: "tecnico" }),
    enabled: tab === "servicios",
  });

  const filtrosVentas = { desde: desde || undefined, hasta: hasta || undefined, agrupar };
  const filtrosServicios = {
    desde: desde || undefined,
    hasta: hasta || undefined,
    estado: estado || undefined,
    tecnicoId: tecnicoId || undefined,
  };

  function exportar(tipo: "inventario" | "ventas" | "servicios", formato: "csv" | "xlsx") {
    const params = tipo === "ventas" ? filtrosVentas : tipo === "servicios" ? filtrosServicios : {};
    reportsApi
      .exportar(tipo, formato, params as Record<string, string | undefined>)
      .then(() => toast.success("Exportación iniciada"))
      .catch((e) => toast.error("Error al exportar", e instanceof Error ? e.message : ""));
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "inventario", label: "Inventario" },
    { id: "ventas", label: "Ventas" },
    { id: "servicios", label: "Servicios" },
  ];

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

      {(tab === "ventas" || tab === "servicios") && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          {tab === "ventas" ? (
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
          ) : (
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
          )}
          <div>
            <Label>{tab === "ventas" ? "Filtros" : "Técnico"}</Label>
            {tab === "servicios" ? (
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
            ) : (
              <p className="h-10 text-sm text-muted">Rango de fechas</p>
            )}
          </div>
        </div>
      )}

      {tab === "inventario" &&
        (inventario.isLoading ? (
          <div className="grid place-items-center p-10">
            <Spinner />
          </div>
        ) : inventario.isError ? (
          <p className="text-danger" role="alert">Error al cargar inventario</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">Total artículos</p>
                  <p className="text-2xl font-bold">{inventario.data?.data.resumen.totalArticulos}</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">Valor a costo</p>
                  <p className="text-2xl font-bold">${mxn(inventario.data?.data.resumen.valorTotalCosto)}</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">Con stock bajo</p>
                  <p className="text-2xl font-bold text-warning">{inventario.data?.data.resumen.stockBajo}</p>
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
                    {inventario.data?.data.data.map((p) => (
                      <TR key={p.id}>
                        <TD className="font-mono text-xs text-muted">{p.sku}</TD>
                        <TD>
                          {p.nombre}
                          {p.lowStock && <Badge variant="warning" className="ml-2">bajo</Badge>}
                        </TD>
                        <TD>{CATS[p.categoria] ?? p.categoria}</TD>
                        <TD className="text-right">{p.stock}</TD>
                        <TD className="text-right">${mxn(p.valoracionCosto)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </div>
        ))}

      {tab === "ventas" &&
        (ventas.isLoading ? (
          <div className="grid place-items-center p-10">
            <Spinner />
          </div>
        ) : ventas.isError ? (
          <p className="text-danger" role="alert">Error al cargar ventas</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">Ventas</p>
                  <p className="text-2xl font-bold">{ventas.data?.data.resumen.totalVentas}</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">Importe total</p>
                  <p className="text-2xl font-bold">${mxn(ventas.data?.data.resumen.totalImporte)}</p>
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
                    {ventas.data?.data.data.map((v) => (
                      <TR key={v.grupo}>
                        <TD className="capitalize">{v.grupo}</TD>
                        <TD className="text-right">{v.ventas}</TD>
                        {agrupar === "producto" && <TD className="text-right">{v.unidades ?? 0}</TD>}
                        <TD className="text-right">${mxn(v.total)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </div>
        ))}

      {tab === "servicios" &&
        (servicios.isLoading ? (
          <div className="grid place-items-center p-10">
            <Spinner />
          </div>
        ) : servicios.isError ? (
          <p className="text-danger" role="alert">Error al cargar servicios</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">Total órdenes</p>
                  <p className="text-2xl font-bold">{servicios.data?.data.resumen.total}</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">En proceso</p>
                  <p className="text-2xl font-bold">{servicios.data?.data.resumen.enProceso}</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-sm text-muted">T. promedio reparación</p>
                  <p className="text-2xl font-bold">{servicios.data?.data.resumen.tiempoPromedioReparacionDias} días</p>
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
                      {servicios.data?.data.porEstado.map((s) => (
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
                      {servicios.data?.data.porTecnico.map((s) => (
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
        ))}
    </div>
  );
}
