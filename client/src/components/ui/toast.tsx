import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  msg?: string;
}

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

interface ToastApi {
  success: (title: string, msg?: string) => void;
  error: (title: string, msg?: string) => void;
  info: (title: string, msg?: string) => void;
}

export const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((type: ToastType, title: string, msg?: string) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, type, title, msg }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (t, m) => push("success", t, m),
      error: (t, m) => push("error", t, m),
      info: (t, m) => push("info", t, m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-[60] flex flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-2 rounded-md border border-border-line bg-surface px-4 py-3 shadow-md",
                t.type === "success" && "text-primary",
                t.type === "error" && "text-danger",
                t.type === "info" && "text-accent"
              )}
              role={t.type === "error" ? "alert" : "status"}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-foreground">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.msg && <p className="text-xs text-muted">{t.msg}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
