-- ============================================================
-- 0013_equipos_usados.sql — Equipos usados (US-INV-07)
-- Metadatos del producto usado: origen, cliente/orden de origen
-- y valor de parte de pago. El estado (disponible/vendido) es
-- derivado del stock del producto.
-- ============================================================

CREATE TABLE equipos_usados (
  id                SERIAL PRIMARY KEY,
  producto_id       INTEGER NOT NULL UNIQUE REFERENCES productos(id) ON DELETE CASCADE,
  cliente_origen_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  orden_id          INTEGER REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
  valor_trade_in    NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (valor_trade_in >= 0),
  origen            VARCHAR(20) NOT NULL DEFAULT 'otro'
                    CHECK (origen IN ('parte_de_pago','reparacion','otro')),
  observaciones     TEXT,
  created_by        INTEGER NOT NULL REFERENCES usuarios(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_equipos_usados_estado ON equipos_usados (origen);
