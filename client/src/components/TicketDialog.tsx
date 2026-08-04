import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { mxn } from "@/lib/utils";
import type { Venta } from "@/lib/types";

export default function TicketDialog({ venta, onClose }: { venta: Venta | null; onClose: () => void }) {
  return (
    <Dialog open={!!venta} onClose={onClose} title="Ticket de venta">
      {venta && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-lg font-bold">TechStore</p>
            <p className="font-mono text-sm">{venta.folio}</p>
            <Badge variant={venta.tipoPago === "credito" ? "warning" : "success"}>{venta.tipoPago}</Badge>
          </div>
          <div className="divide-y divide-border-line text-sm">
            {venta.lineas.map((l, i) => (
              <div key={i} className="flex justify-between py-1.5">
                <span>{l.cantidad} × {l.descripcion}</span>
                <span>{mxn(l.precio)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border-line pt-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{mxn(venta.subtotal)}</span></div>
            {venta.descuento > 0 && <div className="flex justify-between"><span>Descuento</span><span>-{mxn(venta.descuento)}</span></div>}
            <div className="flex justify-between"><span>IVA</span><span>{mxn(venta.iva)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{mxn(venta.total)}</span></div>
            {venta.cambio ? <div className="flex justify-between"><span>Cambio</span><span>{mxn(venta.cambio)}</span></div> : null}
            {venta.fechaVencimiento && <div className="flex justify-between text-xs text-muted"><span>Vence</span><span>{venta.fechaVencimiento}</span></div>}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
