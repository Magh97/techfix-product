import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { auditoriaApi } from "@/lib/api";
import type { AuditoriaEntry } from "@/lib/types";
import { cn, fechaHora } from "@/lib/utils";

const ENTIDADES = ["producto", "venta", "compra", "pago_proveedor", "proveedor"];

export default function AuditoriaPage() {
  const [entidad, setEntidad] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [expandido, setExpandido] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["auditoria", entidad, accion, desde, hasta, page],
    queryFn: () =>
      auditoriaApi.list({
        entidad: entidad || undefined,
        accion: accion || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page,
        pageSize: 20,
      }),
  });

  const totalPages = data?.meta.totalPages ?? 1;

  function cambiarFiltro(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={entidad}
            onChange={(e) => cambiarFiltro(setEntidad, e.target.value)}
            className="h-10 rounded-md border border-border-line bg-surface px-2"
          >
            <option value="">Todas las entidades</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e} className="capitalize">
                {e.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            value={accion}
            onChange={(e) => cambiarFiltro(setAccion, e.target.value)}
            placeholder="Acción (CREAR, CANCELAR…)"
            className="h-10 w-52 rounded-md border border-border-line bg-surface px-2"
          />
          <input
            type="date"
            value={desde}
            onChange={(e) => cambiarFiltro(setDesde, e.target.value)}
            className="h-10 rounded-md border border-border-line bg-surface px-2"
          />
          <input
            type="date"
            value={hasta}
            onChange={(e) => cambiarFiltro(setHasta, e.target.value)}
            className="h-10 rounded-md border border-border-line bg-surface px-2"
          />
        </div>
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
                  <TH>Fecha</TH>
                  <TH>Usuario</TH>
                  <TH>Acción</TH>
                  <TH>Entidad</TH>
                  <TH>Registro</TH>
                  <TH></TH>
                </TR>
              </THead>
              <tbody>
                {data?.data.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="py-8 text-center text-muted">
                      Sin registros de auditoría con los filtros seleccionados
                    </TD>
                  </TR>
                )}
                {data?.data.map((a) => {
                  const tieneDetalle = Boolean(a.antes || a.despues);
                  return (
                    <ResultadoRow
                      key={a.id}
                      a={a}
                      expandido={expandido === a.id}
                      onToggle={() => setExpandido(expandido === a.id ? null : a.id)}
                      detalle={tieneDetalle}
                    />
                  );
                })}
              </tbody>
            </Table>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardBody>
      </Card>
    </div>
  );
}

function ResultadoRow({
  a,
  expandido,
  onToggle,
  detalle,
}: {
  a: AuditoriaEntry;
  expandido: boolean;
  onToggle: () => void;
  detalle: boolean;
}) {
  return (
    <>
      <TR className={cn(expandido && "bg-surface-2/50")}>
        <TD className="whitespace-nowrap text-muted">{fechaHora(a.fecha)}</TD>
        <TD>{a.usuarioNombre}</TD>
        <TD>
          <Badge variant="default">{a.accion}</Badge>
        </TD>
        <TD className="capitalize">{a.entidad.replace("_", " ")}</TD>
        <TD className="font-mono text-xs">{a.entidadId ?? "—"}</TD>
        <TD className="text-right">
          {detalle && (
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {expandido ? "Ocultar" : "Ver detalle"}
            </Button>
          )}
        </TD>
      </TR>
      {expandido && (
        <TR>
          <TD colSpan={6} className="bg-surface-2/50 p-4">
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-muted">Antes</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border-line bg-surface p-3 font-mono text-xs">
                  {JSON.stringify(a.antes, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-semibold text-muted">Después</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border-line bg-surface p-3 font-mono text-xs">
                  {JSON.stringify(a.despues, null, 2)}
                </pre>
              </div>
            </div>
          </TD>
        </TR>
      )}
    </>
  );
}
