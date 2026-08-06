-- ============================================================
-- 0006_notif_garantia.sql — Vínculo notificación ↔ garantía
-- ============================================================

ALTER TABLE notificaciones ADD COLUMN garantia_id INTEGER REFERENCES garantias(id) ON DELETE SET NULL;
