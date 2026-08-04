-- ============================================================
-- 0007_refresh_tokens.sql — Rotación y revocación de refresh
-- ============================================================

CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  jti         UUID NOT NULL UNIQUE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens (usuario_id);
