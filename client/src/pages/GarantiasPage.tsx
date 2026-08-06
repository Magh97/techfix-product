import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { garantiasApi, quejasApi } from "@/lib/api";
import { fechaCorta } from "@/lib/utils";
import type { Garantia } from "@/lib/types";

const estadoVariant: Record<string, "success" | "warning" | "danger"> = {
  vigente: "success",
  por_vencer: "warning",
  vencida: "danger",
};

export default function GarantiasPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [reclamar, setReclamar] = useState<Garantia | null>(null);
  const [descripcion, setDescripcion] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["garantias", estado, page, pageSize],
    queryFn: () => garantiasApi.list({ estado: estado || undefined, page, pageSize }),
  });

  const reclamacion = useMutation({
    mutationFn: () =>
      quejasApi.create({
        clienteId: reclamar!.clienteId,
        tipo: "reclamacion_garantia",
        garantiaId: reclamar!.id,
        descripcion: descripcion,
      }),
    onSuccess: () => {
      toast.success("Reclamación registrada");
      setReclamar(null);
      setDescripcion("");
      qc.invalidateQueries({ queryKey: ["quejas"] });
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Garantías</h1>
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-border-line bg-surface px-2 text-sm"
        >
          <option value="">Todas</option>
          <option value="vigente">Vigentes</option>
          <option value="por_vencer">Por vencer (3 días)</option>
          <option value="vencida">Vencidas</option>
        </select>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10"><Spinner /></div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Folio</TH>
                  <TH>Tipo</TH>
                  <TH>Inicio</TH>
                  <TH>Fin</TH>
                  <TH>Estado</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {data?.data.map((g) => (
                  <TR key={g.id}>
                    <TD>{g.clienteNombre}</TD>
                    <TD className="font-mono text-xs">{g.folio ?? "—"}</TD>
                    <TD className="capitalize">{g.tipo.replace("_", " ")}</TD>
                    <TD className="text-muted">{fechaCorta(g.inicio)}</TD>
                    <TD className="text-muted">{fechaCorta(g.fin)}</TD>
                    <TD><Badge variant={estadoVariant[g.estado] ?? "default"}>{g.estado}</Badge></TD>
                    <TD className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setReclamar(g); setDescripcion(""); }}>
                        Reclamar
                      </Button>
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

      <Dialog open={!!reclamar} onClose={() => setReclamar(null)} title={`Reclamar garantía · ${reclamar?.clienteNombre ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Garantía {reclamar?.folio ?? "—"} ({reclamar ? fechaCorta(reclamar.fin) : ""}). La reclamación se vincula a esta garantía.
          </p>
          <div>
            <Label>Descripción de la reclamación *</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalla el problema cubierto por la garantía…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReclamar(null)}>Cancelar</Button>
            <Button disabled={!descripcion.trim() || reclamacion.isPending} onClick={() => reclamacion.mutate()}>
              {reclamacion.isPending ? "Registrando…" : "Registrar reclamación"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
