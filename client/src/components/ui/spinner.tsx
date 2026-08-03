import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-3 border-t-accent",
        className
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}
