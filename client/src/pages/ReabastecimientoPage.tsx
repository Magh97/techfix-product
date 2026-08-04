import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { comprasApi } from "@/lib/api";
import type { ReabastecimientoGrupo } from "@/lib/types";
import { mxn } from "@/lib/utils";

type Edicion = Record<number, { cantidad: number; incluir: boolean }>;

function estadoDeLinea(ediciones: Edicion, productoId: number, sugerido: number, enOC: boolean) {
  return ediciones[productoId] ?? { cantidad: sugerido, incluir: !enOC };
}

export default function ReabastecimientoPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<"sugerencias" | "solicitudes">("sugerencias");

  const sugerencias = useQuery({ queryKey: ["reabastecimiento"], queryFn: comprasApi.reabastecimiento });
  const solicitudes = useQuery({
    queryKey: ["solicitudes-admin"],
    queryFn: () => comprasApi.solicitudes.list({ pageSize: 100 }),
  });

  const [ediciones, setEdiciones] = useState<Edicion>({});
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [creando, setCreando] = useState<number | null>(null);
  const [aprobando, setAprobando] = useState(false);

  const pendientes = useMemo(
    () => (solicitudes.data?.data ?? []).filter((s) => s.estado === "pendiente"),
    [solicitudes.data]
  );

  function crearOC(grupo: ReabastecimientoGrupo) {
    if (!grupo.proveedorId) {
      toast.error("Este grupo no tiene proveedor asignado", "Asigna un proveedor favorito al producto o crea la OC manualmente");
      return;
    }
    const lineas = grupo.lineas
      .filter((l) => estadoDeLinea(ediciones, l.productoId, l.sugerido, l.enOC).incluir)
      .map((l) => ({
        productoId: l.productoId,
        cantidad: estadoDeLinea(ediciones, l.productoId, l.sugerido, l.enOC).cantidad,
        precioUnitario: l.precio,
      }))
      .filter((l) => l.cantidad > 0);
    if (!lineas.length) {
      toast.error("Selecciona al menos una línea");
      return;
    }
    setCreando(grupo.proveedorId);
    comprasApi
      .create({ proveedorId: grupo.proveedorId, lineas })
      .then((r) => {
        toast.success(`OC ${r.data.folio} creada`);
        navigate(`/compras/${r.data.id}`);
      })
      .catch((e) => toast.error("Error al crear OC", e instanceof Error ? e.message : "Intenta de nuevo"))
      .finally(() => setCreando(null));
  }

  function aprobar() {
    if (!seleccion.length) {
      toast.error("Selecciona al menos una solicitud");
      return;
    }
    setAprobando(true);
    comprasApi.solicitudes
      .aprobar(seleccion)
      .then((r) => {
        if (r.data.compras.length) {
          toast.success(`OC creada: ${r.data.compras.map((c) => c.folio).join(", ")}`);
        }
        if (r.data.sinProveedor.length) {
          toast.error(`Sin proveedor (${r.data.sinProveedor.length})`, "Asigna un proveedor favorito o crea la OC manualmente");
        }
        if (r.data.noPendientes.length) {
          toast.info(`${r.data.noPendientes.length} solicitud(es) ya no estaban pendientes`);
        }
        setSeleccion([]);
        solicitudes.refetch();
        sugerencias.refetch();
      })
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"))
      .finally(() => setAprobando(false));
  }

  function rechazar(id: number) {
    const motivo = window.prompt("Motivo del rechazo:")?.trim();
    if (!motivo) return;
    comprasApi.solicitudes
      .rechazar(id, motivo)
      .then(() => {
        toast.success("Solicitud rechazada");
        solicitudes.refetch();
      })
      .catch((e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"));
  }

  function toggleSeleccion(id: number) {
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const grupos = sugerencias.data?.data.grupos ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reabastecimiento</h1>
        <div className="flex gap-2">
          <Button variant={tab === "sugerencias" ? "accent" : "outline"} size="sm" onClick={() => setTab("sugerencias")}>
            Sugerencias ({grupos.reduce((a, g) => a + g.lineas.length, 0)})
          </Button>
          <Button variant={tab === "solicitudes" ? "accent" : "outline"} size="sm" onClick={() => setTab("solicitudes")}>
            Solicitudes de técnicos ({pendientes.length} pendientes)
          </Button>
        </div>
      </div>

      {tab === "sugerencias" &&
        (sugerencias.isLoading ? (
          <div className="grid place-items-center p-16">
            <Spinner />
          </div>
        ) : grupos.length === 0 ? (
          <Card>
            <CardBody className="text-center text-muted">Todo el inventario está en niveles adecuados.</CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <Card key={g.proveedorId ?? "sin-proveedor"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{g.proveedorNombre}</CardTitle>
                      <p className="text-sm text-muted">Total estimado: {mxn(g.totalEstimado)}</p>
                    </div>
                    <Button
                      onClick={() => crearOC(g)}
                      disabled={!g.proveedorId || creando === g.proveedorId}
                      title={!g.proveedorId ? "Sin proveedor asignado" : undefined}
                    >
                      <ShoppingCart className="h-4 w-4" /> Crear OC
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <Table>
                    <THead>
                      <TR>
                        <TH></TH>
                        <TH>Producto</TH>
                        <TH className="text-right">Stock</TH>
                        <TH className="text-right">Mínimo</TH>
                        <TH className="text-right">Sugerido</TH>
                        <TH className="text-right">P. unitario</TH>
                        <TH className="text-right">Subtotal</TH>
                      </TR>
                    </THead>
                    <tbody>
                      {g.lineas.map((l) => {
                        const est = estadoDeLinea(ediciones, l.productoId, l.sugerido, l.enOC);
                        return (
                          <TR key={l.productoId}>
                            <TD>
                              <input
                                type="checkbox"
                                checked={est.incluir}
                                disabled={l.enOC}
                                onChange={(e) =>
                                  setEdiciones((prev) => ({
                                    ...prev,
                                    [l.productoId]: { ...est, incluir: e.target.checked },
                                  }))
                                }
                              />
                            </TD>
                            <TD>
                              <p>
                                {l.nombre}
                                {l.esFavorito && <Badge variant="accent" className="ml-2">favorito</Badge>}
                                {l.enOC && <Badge variant="warning" className="ml-2">Ya en OC · {l.folioOC}</Badge>}
                              </p>
                              <p className="font-mono text-xs text-muted">{l.sku}</p>
                            </TD>
                            <TD className="text-right">{l.stock}</TD>
                            <TD className="text-right text-muted">{l.stockMinimo}</TD>
                            <TD className="text-right">
                              <input
                                type="number"
                                min={1}
                                value={est.cantidad}
                                disabled={l.enOC}
                                onChange={(e) =>
                                  setEdiciones((prev) => ({
                                    ...prev,
                                    [l.productoId]: { ...est, cantidad: Number(e.target.value) || 0 },
                                  }))
                                }
                                className="h-8 w-20 rounded-md border border-border-line bg-surface px-2 text-right text-sm"
                              />
                            </TD>
                            <TD className="text-right">{mxn(l.precio)}</TD>
                            <TD className="text-right font-semibold">{mxn((est.cantidad || 0) * l.precio)}</TD>
                          </TR>
                        );
                      })}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            ))}
          </div>
        ))}

      {tab === "solicitudes" &&
        (solicitudes.isLoading ? (
          <div className="grid place-items-center p-16">
            <Spinner />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Solicitudes de técnicos</CardTitle>
                <Button disabled={aprobando || !seleccion.length} onClick={aprobar}>
                  {aprobando ? "Procesando…" : `Aprobar selección (${seleccion.length})`}
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {(solicitudes.data?.data.length ?? 0) === 0 ? (
                <p className="p-6 text-center text-muted">Sin solicitudes registradas.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH></TH>
                      <TH>Producto</TH>
                      <TH className="text-right">Cant.</TH>
                      <TH>Orden</TH>
                      <TH>Técnico</TH>
                      <TH>Motivo</TH>
                      <TH>Fecha</TH>
                      <TH>Estado</TH>
                      <TH className="text-right">Acciones</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {solicitudes.data?.data.map((s) => (
                      <TR key={s.id}>
                        <TD>
                          <input
                            type="checkbox"
                            checked={seleccion.includes(s.id)}
                            disabled={s.estado !== "pendiente"}
                            onChange={() => toggleSeleccion(s.id)}
                          />
                        </TD>
                        <TD>
                          <p>{s.productoNombre}</p>
                          <p className="font-mono text-xs text-muted">{s.sku}</p>
                        </TD>
                        <TD className="text-right">{s.cantidad}</TD>
                        <TD className="font-mono text-xs">{s.ordenFolio ?? "—"}</TD>
                        <TD>{s.solicitanteNombre}</TD>
                        <TD className="text-muted">{s.motivo ?? "—"}</TD>
                        <TD className="text-xs text-muted">{new Date(s.createdAt).toLocaleString("es-MX")}</TD>
                        <TD>
                          <Badge variant={s.estado === "aprobada" ? "success" : s.estado === "rechazada" ? "danger" : s.estado === "pendiente" ? "warning" : "default"}>
                            {s.estado}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          {s.estado === "pendiente" && (
                            <Button size="sm" variant="outline" onClick={() => rechazar(s.id)}>
                              Rechazar
                            </Button>
                          )}
                          {s.estado === "aprobada" && s.compraFolio && (
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/compras/${s.compraId}`)}>
                              {s.compraFolio} →
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
        ))}
    </div>
  );
}
