#!/bin/sh
# Backup diario de PostgreSQL (servicio `backup` de docker-compose.prod.yml).
# pg_dump comprimido → /backups con retención de BACKUP_RETENTION_DAYS.
set -e
: "${POSTGRES_HOST:?POSTGRES_HOST es obligatorio}"
: "${POSTGRES_USER:?POSTGRES_USER es obligatorio}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD es obligatorio}"
: "${POSTGRES_DB:?POSTGRES_DB es obligatorio}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"

echo "Backup service iniciado. Retención: $RETENTION días."

while true; do
  STAMP=$(date +%Y%m%d-%H%M)
  echo "Generando backup $STAMP…"
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    | gzip > "/backups/techstore-$STAMP.sql.gz"
  echo "Backup listo: /backups/techstore-$STAMP.sql.gz"
  find /backups -name 'techstore-*.sql.gz' -mtime +"$RETENTION" -delete
  sleep 86400
done
