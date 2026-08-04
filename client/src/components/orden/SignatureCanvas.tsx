import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export function SignatureCanvas({
  onSigned,
  onError,
}: {
  onSigned: (dataUrl: string) => void;
  onError?: (msg: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [empty, setEmpty] = useState(true);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasInk.current) {
      hasInk.current = true;
      setEmpty(false);
    }
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    setEmpty(true);
  }

  function confirm() {
    if (!hasInk.current || !canvasRef.current) {
      onError?.("La firma es obligatoria para entregar la orden");
      return;
    }
    onSigned(canvasRef.current.toDataURL("image/png"));
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={640}
        height={280}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-36 w-full cursor-crosshair touch-none rounded-md border border-dashed border-border-line bg-surface-2"
        aria-label="Firma del cliente"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{empty ? "El cliente firma aquí (táctil o mouse)" : "Firma capturada"}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            <Eraser className="h-3.5 w-3.5" /> Borrar
          </Button>
          <Button type="button" size="sm" onClick={confirm}>
            Confirmar firma
          </Button>
        </div>
      </div>
    </div>
  );
}
