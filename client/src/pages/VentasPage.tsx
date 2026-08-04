import { useQuery } from "@tanstack/react-query";
import { FileSearch } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import TicketDialog from "@/components/TicketDialog";
import { useToast } from "@/components/ui/toast";
import { ventasApi } from "@/lib/api";
import { fechaCorta, mxn } from "@/lib/utils";
import type { Venta } from "@/lib/types";

const estadoVariant: Record<string, "success" | "danger" | "warning"> = {
  completada: "success",
  cancelada: "danger",
  devuelta: "warning",
};

export default function VentasPage() {
  const toast = useToast();
  const [folio, setFolio] = useState("");
  const [ticket, setTicket] = useState<Venta | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ventas-historial"],
    queryFn: () => ventasApi.list({ pageSize: 50 }),
  });

  function buscarFolio() {
    const f = folio.trim();
    if (!f) return;
    ventasApi
      .getByFolio(f)
      .then((r) => setTicket(r.data))
      .catch((e) => toast.error("Venta no encontrada", e instanceof Error ? e.message : ""));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar folio (VEN-0001)…"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscarFolio();
              }
            }}
            className="w-56"
          />
          <Button variant="outline" onClick={buscarFolio}>
            <FileSearch className="h-4 w-4" /> Buscar
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-10"><Spinner /></div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Folio</TH>
                  <TH>Fecha</TH>
                  <TH>Cliente</TH>
                  <TH>Vendedor</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Tipo</TH>
                  <TH>Estado</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {data?.data.map((v) => (
                  <TR key={v.id} className="cursor-pointer" onClick={() => setTicket(v)}>
                    <TD className="font-mono text-xs">{v.folio}</TD>
                    <TD className="text-muted">{v.createdAt ? fechaCorta(String(v.createdAt).slice(0, 10)) : "—"}</TD>
                    <TD>{v.clienteNombre ?? "Mostrador"}</TD>
                    <TD className="text-muted">{v.vendedorNombre}</TD>
                    <TD className="text-right font-semibold">{mxn(v.total)}</TD>
                    <TD className="capitalize">{v.tipoPago}</TD>
                    <TD><Badge variant={estadoVariant[v.estado] ?? "default"}>{v.estado}</Badge></TD>
                    <TD className="text-right text-muted">Ver →</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <TicketDialog venta={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}
