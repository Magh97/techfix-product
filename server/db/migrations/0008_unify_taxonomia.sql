-- ============================================================
-- 0008_unify_taxonomia.sql — Categorías = raíces del árbol de catálogos
-- La categoría de un producto pasa a ser la raíz de su cadena en
-- `catalogos`. Se elimina la tabla `categorias` y el enum
-- `tipo_producto` (modelo duplicado).
-- ============================================================

-- 1) Categoría por defecto "General"
INSERT INTO catalogos (nombre)
SELECT 'General'
WHERE NOT EXISTS (SELECT 1 FROM catalogos WHERE nombre = 'General' AND parent_id IS NULL);

-- 2) Soltar la FK antigua hacia categorias
ALTER TABLE productos DROP CONSTRAINT productos_categoria_id_fkey;

-- 3) Backfill: para productos con catálogo, la categoría = raíz del catálogo
UPDATE productos p
SET categoria_id = (
  WITH RECURSIVE cadena AS (
    SELECT id, parent_id FROM catalogos WHERE id = p.catalogo_id
    UNION ALL
    SELECT c.id, c.parent_id FROM catalogos c JOIN cadena x ON c.id = x.parent_id
  )
  SELECT MIN(id) FROM cadena WHERE parent_id IS NULL
)
WHERE p.catalogo_id IS NOT NULL;

-- 4) Nueva FK: productos.categoria_id → catalogos(id)
ALTER TABLE productos ADD CONSTRAINT productos_categoria_id_fkey
  FOREIGN KEY (categoria_id) REFERENCES catalogos(id) ON DELETE RESTRICT;

-- 5) Invariante: la categoría siempre es un catálogo raíz
CREATE OR REPLACE FUNCTION check_categoria_es_raiz() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM catalogos WHERE id = NEW.categoria_id AND parent_id IS NOT NULL) THEN
    RAISE EXCEPTION 'La categoría debe ser un catálogo raíz';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_productos_categoria_raiz
  BEFORE INSERT OR UPDATE OF categoria_id ON productos
  FOR EACH ROW EXECUTE FUNCTION check_categoria_es_raiz();

-- 6) Eliminar el modelo duplicado
DROP TABLE categorias;
DROP TYPE tipo_producto;
