import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import Receipt from "@/components/Receipt";
import type { Venta } from "@/lib/types";

export default function TicketDialog({
  venta,
  onClose,
  reimpresion = false,
}: {
  venta: Venta | null;
  onClose: () => void;
  reimpresion?: boolean;
}) {
  return (
    <>
      <Dialog open={!!venta} onClose={onClose} title="Ticket de venta">
        {venta && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border border-dashed border-border-line bg-white p-2">
              <Receipt venta={venta} reimpresion={reimpresion} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      {venta && (
        <div id="print-area" aria-hidden="true">
          <Receipt venta={venta} reimpresion={reimpresion} />
        </div>
      )}
    </>
  );
}
