import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { notificacionesApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PlantillaInfo } from "@/lib/types";

const TIPO_LABEL: Record<string, string> = {
  "NOT-01": "Retraso",
  "NOT-02": "Equipo listo",
  "NOT-03": "Cotización lista",
  "NOT-05": "Solicitud de refacción",
  "NOT-06": "Sustitución propuesta",
};

const estadoVariant: Record<string, "success" | "danger" | "warning"> = {
  enviado: "success",
  fallido: "danger",
  reintento: "warning",
};

export default function NotificacionesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"historial" | "plantillas">("historial");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [drafts, setDrafts] = useState<Record<string, { asunto: string; cuerpo: string }>>({});

  const historial = useQuery({
    queryKey: ["notif-historial", page, pageSize],
    queryFn: () => notificacionesApi.historial({ page, pageSize }),
  });
  const plantillas = useQuery({ queryKey: ["notif-plantillas"], queryFn: notificacionesApi.plantillas });

  const save = useMutation({
    mutationFn: (p: PlantillaInfo) => {
      const d = drafts[p.tipo] ?? { asunto: p.asunto, cuerpo: p.cuerpo };
      return notificacionesApi.guardarPlantilla(p.tipo, d);
    },
    onSuccess: () => {
      toast.success("Plantilla guardada");
      qc.invalidateQueries({ queryKey: ["notif-plantillas"] });
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notificaciones</h1>

      <div className="flex gap-2">
        <Button variant={tab === "historial" ? "accent" : "outline"} size="sm" onClick={() => setTab("historial")}>Historial</Button>
        <Button variant={tab === "plantillas" ? "accent" : "outline"} size="sm" onClick={() => setTab("plantillas")}>Plantillas</Button>
      </div>

      {tab === "historial" &&
        (historial.isLoading ? (
          <div className="grid place-items-center p-10"><Spinner /></div>
        ) : (
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Fecha</TH>
                    <TH>Tipo</TH>
                    <TH>Cliente</TH>
                    <TH>Orden</TH>
                    <TH>Canal</TH>
                    <TH>Estado</TH>
                    <TH>Error</TH>
                  </TR>
                </THead>
                <tbody>
                  {historial.data?.data.map((n) => (
                    <TR key={n.id}>
                      <TD className="text-xs text-muted">{new Date(n.fecha).toLocaleString("es-MX")}</TD>
                      <TD><Badge variant="default">{TIPO_LABEL[n.tipo] ?? n.tipo}</Badge></TD>
                      <TD>{n.clienteNombre ?? "—"}</TD>
                      <TD className="font-mono text-xs">{n.ordenFolio ?? "—"}</TD>
                      <TD className="capitalize text-muted">{n.canal}</TD>
                      <TD><Badge variant={estadoVariant[n.estado] ?? "default"}>{n.estado}</Badge></TD>
                      <TD className="text-xs text-danger">{n.error ?? ""}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={page}
                totalPages={historial.data?.meta.totalPages ?? 1}
                totalItems={historial.data?.meta.totalItems}
                pageSize={pageSize}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                onPageChange={setPage}
              />
            </CardBody>
          </Card>
        ))}

      {tab === "plantillas" &&
        (plantillas.isLoading ? (
          <div className="grid place-items-center p-10"><Spinner /></div>
        ) : (
          <div className="space-y-4">
            {plantillas.data?.data.map((p) => {
              const d = drafts[p.tipo] ?? { asunto: p.asunto, cuerpo: p.cuerpo };
              return (
                <Card key={p.tipo}>
                  <CardBody className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{TIPO_LABEL[p.tipo] ?? p.tipo}</h3>
                      <span className="font-mono text-xs text-muted">{p.tipo}</span>
                    </div>
                    <div>
                      <Label>Asunto</Label>
                      <Input
                        value={d.asunto}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [p.tipo]: { ...d, asunto: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <Label>Cuerpo</Label>
                      <textarea
                        value={d.cuerpo}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [p.tipo]: { ...d, cuerpo: e.target.value } }))}
                        rows={5}
                        className="w-full rounded-md border border-border-line bg-surface px-3 py-2 text-sm"
                      />
                      <p className={cn("mt-1 text-xs text-muted")}>
                        Variables: {"{cliente}"} {"{folio}"} {"{fecha}"}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(p)}>
                        <Save className="h-4 w-4" /> Guardar
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ))}
    </div>
  );
}
