-- Notas de crédito por devoluciones (BR-VEN-08). Saldo a favor del cliente
-- aplicable a futuras ventas; sin vigencia.
CREATE TABLE notas_credito (
  id            SERIAL PRIMARY KEY,
  folio         VARCHAR(20) UNIQUE NOT NULL,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  monto_original NUMERIC(19,4) NOT NULL CHECK (monto_original > 0),
  saldo         NUMERIC(19,4) NOT NULL CHECK (saldo >= 0),
  venta_origen_id INTEGER REFERENCES ventas(id) ON DELETE RESTRICT,
  motivo        TEXT,
  created_by    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notas_credito_cliente ON notas_credito (cliente_id) WHERE saldo > 0;

-- Monto aplicado de nota de crédito en una venta y la nota usada (auditoría)
ALTER TABLE ventas ADD COLUMN nota_credito NUMERIC(19,4) NOT NULL DEFAULT 0;
ALTER TABLE ventas ADD COLUMN nota_credito_id INTEGER REFERENCES notas_credito(id) ON DELETE SET NULL;
