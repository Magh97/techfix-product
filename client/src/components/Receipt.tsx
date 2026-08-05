import { mxn } from "@/lib/utils";
import type { Venta } from "@/lib/types";

function fmtFecha(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function Receipt({ venta, reimpresion = false }: { venta: Venta; reimpresion?: boolean }) {
  return (
    <div className="w-[80mm] bg-white px-2 py-3 font-mono text-[11px] leading-tight text-black">
      <div className="text-center">
        <p className="text-base font-bold">TechStore</p>
        <p className="text-[10px]">Sistema de Administración</p>
        <p className="mt-1 text-sm font-bold">{venta.folio}</p>
        {reimpresion && <p className="text-[10px] font-bold">COPIA</p>}
      </div>
      <div className="mt-2 border-t border-dashed border-black/60 pt-1 text-[10px]">
        {venta.clienteNombre && (
          <div className="flex justify-between gap-2">
            <span>Cliente</span>
            <span className="text-right">{venta.clienteNombre}</span>
          </div>
        )}
        {venta.vendedorNombre && (
          <div className="flex justify-between gap-2">
            <span>Vendedor</span>
            <span>{venta.vendedorNombre}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span>Fecha</span>
          <span>{fmtFecha(venta.createdAt)}</span>
        </div>
      </div>
      <div className="mt-1 border-t border-dashed border-black/60 pt-1">
        {venta.lineas.map((l, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="flex-1">
              {l.cantidad} × {l.descripcion}
            </span>
            <span>{mxn(l.precio)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 border-t border-dashed border-black/60 pt-1">
        <div className="flex justify-between gap-2">
          <span>Subtotal</span>
          <span>{mxn(venta.subtotal)}</span>
        </div>
        {venta.descuento > 0 && (
          <div className="flex justify-between gap-2">
            <span>Descuento</span>
            <span>-{mxn(venta.descuento)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span>IVA</span>
          <span>{mxn(venta.iva)}</span>
        </div>
        <div className="flex justify-between gap-2 text-sm font-bold">
          <span>Total</span>
          <span>{mxn(venta.total)}</span>
        </div>
        {typeof venta.cambio === "number" && venta.cambio > 0 && (
          <div className="flex justify-between gap-2">
            <span>Cambio</span>
            <span>{mxn(venta.cambio)}</span>
          </div>
        )}
        {venta.fechaVencimiento && (
          <div className="flex justify-between gap-2 text-[10px]">
            <span>Vence</span>
            <span>{venta.fechaVencimiento}</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-center text-[10px]">¡Gracias por su compra!</div>
    </div>
  );
}
