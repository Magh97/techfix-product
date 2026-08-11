import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const METODOS = ["efectivo", "tarjeta_credito", "tarjeta_debito", "transferencia", "deposito"];

export default function DesglosePago({
  pagos,
  onChange,
}: {
  pagos: { metodo: string; monto: string }[];
  onChange: (pagos: { metodo: string; monto: string }[]) => void;
}) {
  function setFila(i: number, campo: "metodo" | "monto", valor: string) {
    onChange(pagos.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  }
  function todo(metodo: string) {
    const total = pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0);
    if (total <= 0) return;
    onChange([{ metodo, monto: String(total) }]);
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted">Dividir abono en métodos</p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => todo("efectivo")}>Todo efectivo</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => todo("tarjeta_debito")}>Todo tarjeta</Button>
        </div>
      </div>
      {pagos.map((p, i) => (
        <div key={i} className="flex items-center gap-1">
          <select
            value={p.metodo}
            onChange={(e) => setFila(i, "metodo", e.target.value)}
            className="h-9 w-40 rounded-md border border-border-line bg-surface px-1 text-sm"
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>{m.replace("_", " ")}</option>
            ))}
          </select>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={p.monto}
            onChange={(e) => setFila(i, "monto", e.target.value)}
            className="h-9 flex-1 text-right"
            placeholder="Monto"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Quitar método"
            onClick={() => onChange(pagos.filter((_, j) => j !== i))}
          >
            ✕
          </Button>
        </div>
      ))}
      {pagos.length < 5 && (
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...pagos, { metodo: "efectivo", monto: "" }])}>
          <Plus className="h-3.5 w-3.5" /> Método
        </Button>
      )}
    </div>
  );
}
