-- ============================================================
-- 0011_sustituciones.sql — Sustitución de piezas con validación
-- del cliente en órdenes de servicio
-- ============================================================

ALTER TYPE estado_orden ADD VALUE 'sustitucion_pendiente';

CREATE TABLE sustituciones (
  id                   SERIAL PRIMARY KEY,
  orden_id             INTEGER NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  cotizacion_id        INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  linea_id             INTEGER NOT NULL REFERENCES detalle_cotizacion(id) ON DELETE CASCADE,
  producto_original_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad             INTEGER NOT NULL CHECK (cantidad > 0),
  sustituto_id         INTEGER NOT NULL REFERENCES productos(id),
  justificacion        TEXT,
  cliente_acepta       BOOLEAN,
  estado               VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  solicitud_id         INTEGER REFERENCES solicitudes_reabastecimiento(id) ON DELETE SET NULL,
  creada_por           INTEGER NOT NULL REFERENCES usuarios(id),
  resuelto_por         INTEGER REFERENCES usuarios(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_at          TIMESTAMPTZ
);
CREATE INDEX idx_sustituciones_orden ON sustituciones (orden_id);
