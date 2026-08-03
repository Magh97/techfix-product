-- ============================================================
-- 0002_egresos.sql — Gastos operativos (FIN-02)
-- ============================================================

CREATE TABLE egresos (
  id          SERIAL PRIMARY KEY,
  concepto    VARCHAR(150) NOT NULL,
  categoria   VARCHAR(60) NOT NULL,
  monto       NUMERIC(19,4) NOT NULL CHECK (monto >= 0),
  metodo      metodo_pago NOT NULL,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  caja_id     INTEGER REFERENCES cajas(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_egresos_caja ON egresos (caja_id);
