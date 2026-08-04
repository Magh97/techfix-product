-- ============================================================
-- 0004_cotizaciones_venta.sql — Cotizaciones de venta (VEN-04..06)
-- ============================================================

CREATE TYPE estado_cotizacion_venta AS ENUM ('emitida', 'aprobada', 'rechazada', 'convertida', 'cancelada', 'expirada');

CREATE TABLE cotizaciones_venta (
  id                SERIAL PRIMARY KEY,
  folio             VARCHAR(20) UNIQUE NOT NULL,
  cliente_id        INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  estado            estado_cotizacion_venta NOT NULL DEFAULT 'emitida',
  subtotal          NUMERIC(19,4) NOT NULL DEFAULT 0,
  iva               NUMERIC(19,4) NOT NULL DEFAULT 0,
  total             NUMERIC(19,4) NOT NULL DEFAULT 0,
  descuento         NUMERIC(19,4) NOT NULL DEFAULT 0,
  motivo_descuento  TEXT,
  vigencia_desde    DATE NOT NULL,
  vigencia_hasta    DATE NOT NULL,
  creada_por        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);
CREATE INDEX idx_cotizaciones_venta_cliente ON cotizaciones_venta (cliente_id, created_at DESC);

CREATE TABLE detalle_cotizacion_venta (
  id            SERIAL PRIMARY KEY,
  cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones_venta(id) ON DELETE CASCADE,
  producto_id   INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad      INT NOT NULL CHECK (cantidad > 0),
  precio_neto   NUMERIC(19,4) NOT NULL CHECK (precio_neto >= 0)
);
CREATE INDEX idx_detalle_cotizacion_venta ON detalle_cotizacion_venta (cotizacion_id);
