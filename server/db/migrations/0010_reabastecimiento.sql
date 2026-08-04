-- ============================================================
-- 0010_reabastecimiento.sql — Reabastecimiento sugerido
-- - Nivel objetivo de stock por producto (stock_maximo)
-- - Proveedor favorito por producto
-- - Solicitudes de reabastecimiento de técnicos
-- ============================================================

ALTER TABLE productos ADD COLUMN stock_maximo INT NOT NULL DEFAULT 0 CHECK (stock_maximo >= 0);
ALTER TABLE productos ADD COLUMN proveedor_favorito_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL;
CREATE INDEX idx_productos_proveedor_favorito ON productos (proveedor_favorito_id);

CREATE TABLE solicitudes_reabastecimiento (
  id             SERIAL PRIMARY KEY,
  producto_id    INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad       INTEGER NOT NULL CHECK (cantidad > 0),
  orden_id       INTEGER REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
  solicitado_por INTEGER NOT NULL REFERENCES usuarios(id),
  motivo         TEXT,
  estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  rechazo_motivo TEXT,
  compra_id      INTEGER REFERENCES compras(id) ON DELETE SET NULL,
  resuelto_por   INTEGER REFERENCES usuarios(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_at    TIMESTAMPTZ
);
CREATE INDEX idx_solicitudes_estado ON solicitudes_reabastecimiento (estado);
CREATE INDEX idx_solicitudes_producto ON solicitudes_reabastecimiento (producto_id);
