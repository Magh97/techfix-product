-- ============================================================
-- 0003_ensamble.sql — Mano de obra de ensamble por kit
-- ============================================================

ALTER TABLE productos ADD COLUMN mano_obra NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (mano_obra >= 0);
