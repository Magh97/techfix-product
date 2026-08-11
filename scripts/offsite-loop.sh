#!/bin/sh
# Copia offsite del backup diario (BR-DAT-01) vía rclone.
# Espeja el volumen pgbackups hacia un remoto configurado con rclone:
#   rclone sync /backups "$RCLONE_REMOTE"
# Como usa sync, la retención local (BACKUP_RETENTION_DAYS) se replica al remoto.
# Config: rclone config en el host → rclone.conf montada en /config/rclone/rclone.conf.
set -e
: "${RCLONE_REMOTE:?RCLONE_REMOTE es obligatorio (ej. s3-backups:techstore)}"
INTERVAL="${OFFSITE_INTERVAL_SECONDS:-3600}"

echo "Offsite service iniciado. Remoto: $RCLONE_REMOTE (intervalo ${INTERVAL}s)"

while true; do
  if [ -z "$(ls -A /backups 2>/dev/null)" ]; then
    echo "Sin backups locales aún; reintentando en ${INTERVAL}s…"
  else
    echo "Sincronizando backups a $RCLONE_REMOTE…"
    rclone sync /backups "$RCLONE_REMOTE"
    echo "Sincronización completada."
  fi
  sleep "$INTERVAL"
done
