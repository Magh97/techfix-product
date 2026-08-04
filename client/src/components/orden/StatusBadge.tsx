import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "default" | "success" | "danger" | "warning" | "accent" }> = {
  pendiente: { label: "Pendiente", variant: "default" },
  en_diagnostico: { label: "Diagnóstico", variant: "accent" },
  cotizado: { label: "Cotizado", variant: "warning" },
  en_reparacion: { label: "En reparación", variant: "accent" },
  listo: { label: "Listo", variant: "success" },
  entregado: { label: "Entregado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "danger" },
};

export function StatusBadge({ estado, retrasada }: { estado: string; retrasada?: boolean }) {
  if (retrasada && estado !== "entregado" && estado !== "cancelado") {
    return <Badge variant="danger">Retrasada</Badge>;
  }
  const item = MAP[estado] ?? { label: estado, variant: "default" as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
