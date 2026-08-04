import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistorialOrden } from "@/lib/types";

export function Stepper({ historial }: { historial: HistorialOrden[] }) {
  const items = [...historial].reverse();
  return (
    <ol className="relative space-y-4 pl-1">
      {items.map((h, i) => {
        const isLast = i === items.length - 1;
        return (
          <li key={h.id} className="relative flex gap-3">
            {!isLast && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border-line" aria-hidden="true" />}
            <span
              className={cn(
                "z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px]",
                i === 0
                  ? "border-accent bg-accent text-white"
                  : "border-border-line bg-surface-2 text-muted"
              )}
            >
              {i === 0 ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{h.estadoLabel}</p>
              <p className="text-xs text-muted">
                {h.usuarioNombre} · {new Date(h.fecha).toLocaleString("es-MX")}
              </p>
              {h.nota && <p className="mt-0.5 text-xs text-muted italic">{h.nota}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
