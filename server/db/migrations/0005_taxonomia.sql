-- ============================================================
-- 0005_taxonomia.sql — Catálogo jerárquico + especificaciones
-- ============================================================

CREATE TABLE catalogos (
  id                    SERIAL PRIMARY KEY,
  parent_id             INTEGER REFERENCES catalogos(id) ON DELETE CASCADE,
  nombre                VARCHAR(80) NOT NULL,
  campos_especificacion JSONB NOT NULL DEFAULT '[]',
  claves_compatibilidad JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_catalogos_nombre_sibling ON catalogos (parent_id, nombre) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX idx_catalogos_root_nombre ON catalogos (nombre) WHERE parent_id IS NULL;

ALTER TABLE productos ADD COLUMN catalogo_id INTEGER REFERENCES catalogos(id) ON DELETE SET NULL;
ALTER TABLE productos ADD COLUMN especificaciones JSONB NOT NULL DEFAULT '{}';

CREATE INDEX idx_productos_catalogo ON productos (catalogo_id);
