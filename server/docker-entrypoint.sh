#!/bin/sh
set -e

echo "Aplicando migraciones…"
node dist/migrate.js

echo "Aplicando seed (idempotente)…"
node dist/seed.js

echo "Iniciando API…"
exec node dist/index.js
