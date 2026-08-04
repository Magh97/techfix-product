import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { comprasApi } from "@/lib/api";
import type { EstadoCompra } from "@/lib/types";
import { mxn } from "@/lib/utils";

const estadoVariant: Record<EstadoCompra, "default" | "success" | "warning" | "accent"> = {
  borrador: "default",
  enviada: "accent",
  recibida: "success",
  cancelada: "warning",
};

export default function ComprasPage() {
  const navigate = useNavigate();
  const esAdmin = getSessionUser()?.rol === "admin";
  const [folio, setFolio] = useState("");
  const [estado, setEstado] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["compras", folio, estado],
    queryFn: () => comprasApi.list({ folio: folio || undefined, estado: estado || undefined, pageSize: 50 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órdenes de compra</h1>
        {esAdmin && (
          <Button onClick={() => navigate("/compras/nueva")}>
            <Plus className="h-4 w-4" /> Nueva compra
          </Button>
        )}
      </div>

      <div className="flex max-w-md gap-2">
        <Input placeholder="Buscar por folio…" value={folio} onChange={(e) => setFolio(e.target.value)} />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="h-10 rounded-md border border-border-line bg-surface px-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="borrador">Borrador</option>
          <option value="enviada">Enviada</option>
          <option value="recibida">Recibida</option>
          <option value="cancelada">Cancelada</option>
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
                  <TH>Folio</TH>
                  <TH>Proveedor</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Saldo</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {data?.data.map((c) => (
                  <TR key={c.id} className="cursor-pointer" onClick={() => navigate(`/compras/${c.id}`)}>
                    <TD className="font-mono text-xs">{c.folio}</TD>
                    <TD>{c.proveedorNombre}</TD>
                    <TD>
                      <Badge variant={estadoVariant[c.estado]}>{c.estadoLabel}</Badge>
                    </TD>
                    <TD className="text-right">{mxn(c.total)}</TD>
                    <TD className="text-right">{mxn(c.saldo)}</TD>
                    <TD className="text-right text-muted">Ver →</TD>
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
