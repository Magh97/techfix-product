-- ============================================================
-- 0015_quejas.sql — Quejas y reclamaciones de garantía (US-CRM-07)
-- Seguimiento abierta → en_proceso → resuelta, con vínculo opcional
-- a garantía, orden de servicio o venta.
-- ============================================================

CREATE TABLE quejas (
  id             SERIAL PRIMARY KEY,
  cliente_id     INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo           VARCHAR(20) NOT NULL DEFAULT 'queja'
                 CHECK (tipo IN ('queja','reclamacion_garantia')),
  garantia_id    INTEGER REFERENCES garantias(id) ON DELETE SET NULL,
  orden_id       INTEGER REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
  venta_id       INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
  descripcion    TEXT NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'abierta'
                 CHECK (estado IN ('abierta','en_proceso','resuelta')),
  resolucion     TEXT,
  registrada_por INTEGER NOT NULL REFERENCES usuarios(id),
  resuelta_por   INTEGER REFERENCES usuarios(id),
  resuelta_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quejas_cliente ON quejas (cliente_id);
CREATE INDEX idx_quejas_estado  ON quejas (estado);
CREATE INDEX idx_quejas_garantia ON quejas (garantia_id);
