import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/orden/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { ordenesApi } from "@/lib/api";
import { fechaCorta } from "@/lib/utils";
import { OrdenNuevaDialog } from "./OrdenNuevaDialog";

const FILTROS = [
  { key: "", label: "Todas" },
  { key: "pendiente", label: "Pendiente" },
  { key: "en_diagnostico", label: "Diagnóstico" },
  { key: "cotizado", label: "Cotizado" },
  { key: "en_reparacion", label: "Reparación" },
  { key: "listo", label: "Listo" },
  { key: "entregado", label: "Entregado" },
  { key: "cancelado", label: "Cancelado" },
  { key: "retrasadas", label: "Retrasadas" },
];

export default function OrdenesPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("");
  const [folio, setFolio] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [nueva, setNueva] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ordenes", filtro, folio, page, pageSize],
    queryFn: () =>
      ordenesApi.list({
        estado: filtro && filtro !== "retrasadas" ? filtro : undefined,
        retrasadas: filtro === "retrasadas" ? true : undefined,
        folio: folio || undefined,
        page,
        pageSize,
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órdenes de Servicio</h1>
        <Button onClick={() => setNueva(true)}>
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFiltro(f.key);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filtro === f.key ? "bg-accent text-white" : "border border-border-line bg-surface text-muted hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}
        <Input
          placeholder="Buscar folio…"
          value={folio}
          onChange={(e) => {
            setFolio(e.target.value);
            setPage(1);
          }}
          className="ml-auto max-w-[180px]"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="p-6 text-danger" role="alert">
              {error instanceof Error ? error.message : "Error al cargar órdenes"}
              <button onClick={() => refetch()} className="ml-3 text-accent underline">
                Reintentar
              </button>
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Folio</TH>
                  <TH>Cliente</TH>
                  <TH>Equipo</TH>
                  <TH>Estado</TH>
                  <TH>Prometida</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {data?.data.map((o) => (
                  <TR key={o.id} className="cursor-pointer" onClick={() => navigate(`/ordenes/${o.id}`)}>
                    <TD className="font-mono text-xs">{o.folio}</TD>
                    <TD>{o.clienteNombre}</TD>
                    <TD>
                      {o.marca ?? ""} {o.modelo ?? ""}
                      <span className="ml-1 text-xs text-muted">({o.tipoEquipo.replace("_", " ")})</span>
                    </TD>
                    <TD>
                      <StatusBadge estado={o.estado} retrasada={o.retrasada} />
                    </TD>
                    <TD className="text-muted">{fechaCorta(o.fechaPrometida)}</TD>
                    <TD className="text-right text-muted">Ver →</TD>
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

      <OrdenNuevaDialog open={nueva} onClose={() => setNueva(false)} />
    </div>
  );
}
