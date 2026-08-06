-- Tipos de ajuste de inventario específicos por merma/daño (INV-05).
-- El código los usa a partir del siguiente deploy; no se usan en este archivo.
ALTER TYPE movimiento_tipo ADD VALUE IF NOT EXISTS 'MERMA';
ALTER TYPE movimiento_tipo ADD VALUE IF NOT EXISTS 'DANO';
