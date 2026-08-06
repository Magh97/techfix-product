-- ============================================================
-- 0014_trade_in.sql — Parte de pago en especie (equipo usado)
-- - ventas.parte_de_pago: valor total aceptado como parte de pago
--   (reduce el efectivo/terminal a recibir; el total no cambia)
-- - equipos_usados.venta_id: vincula el usado a la venta donde se
--   recibió como parte de pago
-- ============================================================

ALTER TABLE ventas
  ADD COLUMN parte_de_pago NUMERIC(19,4) NOT NULL DEFAULT 0
  CHECK (parte_de_pago >= 0);

ALTER TABLE equipos_usados
  ADD COLUMN venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL;
CREATE INDEX idx_equipos_usados_venta ON equipos_usados (venta_id);
