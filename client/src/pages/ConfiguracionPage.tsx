import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { configuracionApi, type ConfigClave } from "@/lib/api";
import type { BusinessConfig } from "@/lib/types";

const CAMPOS: { clave: ConfigClave; etiqueta: string; field: keyof BusinessConfig; factor: number }[] = [
  { clave: "iva.rate", etiqueta: "Tasa de IVA (%)", field: "ivaRate", factor: 100 },
  { clave: "credito.limite_default", etiqueta: "Límite de crédito default ($)", field: "limiteCreditoDefault", factor: 1 },
  { clave: "credito.plazo_default", etiqueta: "Plazo de crédito default (días)", field: "plazoCreditoDefault", factor: 1 },
  { clave: "ventas.descuento_vendedor_max", etiqueta: "Descuento máximo vendedor (%)", field: "descuentoVendedorMax", factor: 100 },
  { clave: "ventas.dias_devolucion", etiqueta: "Días de devolución", field: "diasDevolucion", factor: 1 },
  { clave: "servicios.dias_garantia", etiqueta: "Días de garantía de servicio", field: "diasGarantiaServicio", factor: 1 },
  { clave: "ordenes.tolerancia_retraso_dias", etiqueta: "Tolerancia de retraso (días)", field: "toleranciaRetrasoDias", factor: 1 },
];

export default function ConfiguracionPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["configuracion"], queryFn: configuracionApi.get });
  const [form, setForm] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () =>
      Promise.all(
        CAMPOS.map((c) =>
          configuracionApi.update(c.clave, Number(form[c.field]) / c.factor)
        )
      ),
    onSuccess: () => {
      toast.success("Configuración guardada");
      qc.invalidateQueries({ queryKey: ["configuracion"] });
    },
    onError: (e) => toast.error("Error", e instanceof Error ? e.message : "Intenta de nuevo"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center p-10">
        <Spinner />
      </div>
    );
  }
  if (!data?.data) return <p>No se pudo cargar la configuración.</p>;

  const cfg = data.data;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          <Save className="h-4 w-4" /> {save.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Parámetros de negocio</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {CAMPOS.map((c) => (
            <div key={c.clave}>
              <Label>{c.etiqueta}</Label>
              <Input
                type="number"
                step="any"
                value={form[c.field] ?? String(cfg[c.field] * c.factor)}
                onChange={(e) => setForm((f) => ({ ...f, [c.field]: e.target.value }))}
              />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
