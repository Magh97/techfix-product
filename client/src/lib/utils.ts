import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mxn(n: number): string {
  return `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fechaCorta(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export function fechaHora(iso: string): string {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} ${hora}`;
}
