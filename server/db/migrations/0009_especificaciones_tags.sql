-- ============================================================
-- 0009_especificaciones_tags.sql — Especificaciones como tags
-- `productos.especificaciones` pasa de objeto {clave: valor} a
-- arreglo de strings (tags). En `catalogos`, los campos de
-- especificación se convierten en `tags_sugeridas` y las claves de
-- compatibilidad en `tags_compatibilidad`.
-- ============================================================

-- 1) productos.especificaciones: objeto → arreglo de tags
UPDATE productos
SET especificaciones = COALESCE(
  (SELECT jsonb_agg(e.value) FROM jsonb_each_text(especificaciones) AS e(k, value)),
  '[]'::jsonb
)
WHERE jsonb_typeof(especificaciones) = 'object';

ALTER TABLE productos ALTER COLUMN especificaciones SET DEFAULT '[]'::jsonb;

CREATE INDEX idx_productos_especificaciones_gin
  ON productos USING GIN (especificaciones);

-- 2) catalogos: renombrar columnas
ALTER TABLE catalogos RENAME COLUMN campos_especificacion TO tags_sugeridas;
ALTER TABLE catalogos RENAME COLUMN claves_compatibilidad TO tags_compatibilidad;

-- 3) tags_sugeridas: de [{clave, etiqueta}] → ['etiqueta'] (labels legibles)
UPDATE catalogos
SET tags_sugeridas = COALESCE(
  (SELECT jsonb_agg(e.value->>'etiqueta')
   FROM jsonb_array_elements(tags_sugeridas) AS e(value)
   WHERE jsonb_typeof(e.value) = 'object'),
  '[]'::jsonb
)
WHERE jsonb_typeof(tags_sugeridas) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(tags_sugeridas) AS e(value)
    WHERE jsonb_typeof(e.value) = 'object'
  );
