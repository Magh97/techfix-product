-- ============================================================
-- 0012_recepcion_parcial.sql — Recepción parcial por línea de OC
-- - detalle_compra.cantidad_recibida: acumulado recibido por línea
-- - compras.total_recibido: monto recibido acumulado (base de la CxP)
-- ============================================================

ALTER TABLE detalle_compra
  ADD COLUMN cantidad_recibida INT NOT NULL DEFAULT 0
  CHECK (cantidad_recibida >= 0 AND cantidad_recibida <= cantidad);

ALTER TABLE compras
  ADD COLUMN total_recibido NUMERIC(19,4) NOT NULL DEFAULT 0
  CHECK (total_recibido >= 0);
