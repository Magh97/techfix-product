import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { garantiasApi } from "@/lib/api";
import { fechaCorta } from "@/lib/utils";

const estadoVariant: Record<string, "success" | "warning" | "danger"> = {
  vigente: "success",
  por_vencer: "warning",
  vencida: "danger",
};

export default function GarantiasPage() {
  const [estado, setEstado] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["garantias", estado],
    queryFn: () => garantiasApi.list({ estado: estado || undefined, pageSize: 100 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Garantías</h1>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
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
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
