#!/bin/sh
# Restaura un backup de docker-compose.prod.yml.
# Uso: restore.sh <techstore-YYYYMMDD-HHMM.sql.gz> [base]
#   El backup vive en el volumen `pgbackups`; para restaurarlo:
#   docker compose -f docker-compose.prod.yml exec backup cat /backups/<archivo> | ./restore.sh - 
set -e
FILE="${1:?Uso: restore.sh <techstore-YYYYMMDD-HHMM.sql.gz>}"
DB="${2:-techstore}"
USER="${POSTGRES_USER:-techstore}"

if [ "$FILE" = "-" ]; then
  echo "Restaurando desde stdin en la base '$DB'…"
  gunzip -c | docker compose -f docker-compose.prod.yml exec -T db psql -U "$USER" -d "$DB"
else
  echo "Restaurando $FILE en la base '$DB'…"
  docker compose -f docker-compose.prod.yml exec -T backup cat "/backups/$FILE" \
    | gunzip -c \
    | docker compose -f docker-compose.prod.yml exec -T db psql -U "$USER" -d "$DB"
fi
echo "Restauración completada."
