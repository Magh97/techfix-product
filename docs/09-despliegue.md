# Despliegue a Producción — TechStore

> Ruta principal: **VPS + Docker Compose + Caddy** (TLS automático). Documenta la puesta en marcha, SMTP real, backups (BR-DAT-01), restauración y actualización.

## 1. Requisitos del servidor

- **VPS Linux** (Debian/Ubuntu) con **Docker** + **Docker Compose** instalados.
- Un **dominio** apuntando al VPS (registro A) para que Caddy emita el certificado TLS.
- El repo clonado en el servidor en la rama `main`, en un directorio p.ej. `/opt/techstore`.

```bash
git clone https://github.com/Magh97/techfix-product.git /opt/techstore
cd /opt/techstore
git checkout main
```

## 2. Configuración (`<repo>/.env`)

```bash
cp .env.production.example .env
nano .env
```

Variables obligatorias (si faltan, `docker compose` falla rápido):

| Variable | Valor |
|----------|-------|
| `POSTGRES_PASSWORD` | contraseña fuerte de la BD |
| `DOMAIN` | dominio público (sin `http://`) |
| `CORS_ORIGIN` | `https://<DOMAIN>` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |

Recomendadas: `SEED_DEMO=false` (no crear usuarios demo), `SMTP_*` (correo real), `BACKUP_RETENTION_DAYS=14`.

> **Seguridad:** con `SEED_DEMO=false` el seed solo carga bootstrap esencial (catálogo "Usado", IVA, plantillas) y **no** crea `admin/admin1234` ni datos demo. El primer usuario se crea por la UI (módulo Usuarios). Cambia siempre los JWT secrets por defecto.

## 3. Primer arranque

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

- `db` → PostgreSQL (healthcheck).
- `api` → API Express en `:3000` (aplica migraciones y seed idempotente al arrancar).
- `web` → SPA (nginx) que proxya `/api` a `api:3000`.
- `caddy` → **TLS automático** en `:80/:443` para `DOMAIN`, reenvía a `web`.
- `backup` → pg_dump diario a `/backups`.

URL de acceso: `https://<DOMAIN>`.

## 4. SMTP real (notificaciones)

Sin `SMTP_HOST` el correo se **simula** (logs del API). Para envío real setea en `.env`:

```
SMTP_HOST=smtp.midominio.com
SMTP_PORT=587
SMTP_USER=no-reply@midominio.com
SMTP_PASS=...
SMTP_FROM=no-reply@midominio.com
```

Se aplica al recrear el API (`docker compose -f docker-compose.prod.yml up -d api`). NOT-02/03/05/06 se envían por este canal.

### WhatsApp real (Twilio)

Sin credenciales Twilio el envío se **simula** (logs del API + registra `enviado`). Para envío real setea en `.env`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_DEFAULT_COUNTRY_CODE=52
```

- `TWILIO_WHATSAPP_FROM` es el número de Twilio (formato `whatsapp:+<E.164>`). En **sandbox** el número de prueba debe estar verificado y solo acepta plantillas de ejemplo; en producción los mensajes requieren **plantillas aprobadas por Meta** (el sistema envía el `body` de la plantilla configurada en Notificaciones).
- Los teléfonos de clientes se normalizan a **E.164** anteponiendo `TWILIO_DEFAULT_COUNTRY_CODE` (default `52` México) cuando no traen código de país.
- **Canal por preferencia** (ADR-0006): `whatsapp` → WhatsApp; si falta teléfono o falla → correo (si hay correo). `correo` → correo. `llamada` → se registra como pendiente de llamada manual. Aplica a NOT-01..04 (workers de retraso y garantía incluidos).
- Se aplica al recrear el API (`docker compose -f docker-compose.prod.yml up -d api`).

## 5. Backups (BR-DAT-01)

El servicio `backup` ejecuta un bucle diario: `pg_dump` comprimido → volumen `pgbackups`, con retención de `BACKUP_RETENTION_DAYS` (default 14).

```bash
# Listar backups
docker compose -f docker-compose.prod.yml exec backup sh -c 'ls -lh /backups'

# Backup manual inmediato
docker compose -f docker-compose.prod.yml exec backup sh -c \
  'PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h db -U $POSTGRES_USER -d $POSTGRES_DB | gzip > /backups/manual-$(date +%Y%m%d-%H%M).sql.gz'
```

### Copia externa (offsite, automatizada)

El volumen es local al VPS; para cumplir DR se debe **copiar fuera**. El servicio `offsite` (rclone) lo hace **automáticamente**:

```bash
# 1. En el host, genera el remoto y su configuración (S3/Drive/NAS)
rclone config   # crea un remoto, p. ej. `s3-backups`

# 2. Copia el archivo de configuración junto a docker-compose.prod.yml
rclone config file          # muestra la ruta del archivo de configuración
cp ~/.config/rclone/rclone.conf ./

# 3. Define el destino en .env y levanta el servicio
#    .env: RCLONE_REMOTE=s3-backups:techstore
docker compose -f docker-compose.prod.yml up -d offsite

# Verificar que se copió (fuera del contenedor)
rclone lsf s3-backups:techstore/
```

El servicio `offsite` ejecuta `rclone sync /backups "$RCLONE_REMOTE"` **cada hora** (`OFFSITE_INTERVAL_SECONDS`, default 3600). Al usar `sync`, la retención local (`BACKUP_RETENTION_DAYS`) se replica al remoto (espejo). Requiere que exista al menos un backup local; si no, espera al siguiente ciclo.

Alternativa manual (sin el servicio):

```bash
rclone copy /backups backup-remoto:techstore/
```

## 6. Restauración

```bash
# Desde el volumen del backup service
./scripts/restore.sh techstore-20260805-0200.sql.gz

# Desde un archivo local
cat backup.sql.gz | ./scripts/restore.sh -
```

`restore.sh` lanza el `psql` dentro del contenedor `db`. Se recomienda detener el API durante la restauración.

## 7. Actualización (deploy)

El CI despliega automáticamente al hacer **push a `main`** (job `deploy`): por SSH hace `git pull --ff-only origin main` y `docker compose -f docker-compose.prod.yml up -d --build`. Requiere secrets en GitHub:

| Secret | Valor |
|--------|-------|
| `SSH_HOST` | IP/host del VPS |
| `SSH_USER` | usuario SSH con acceso a Docker |
| `SSH_KEY` | clave privada SSH |
| `DEPLOY_DIR` | ruta del repo en el VPS (p.ej. `/opt/techstore`) |

Manualmente:

```bash
cd /opt/techstore && git pull --ff-only origin main
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
```

## 8. Checklist post-deploy

- [ ] `https://<DOMAIN>` responde (TLS válido).
- [ ] Login funciona con el usuario real (creado por la UI; sin usuarios demo).
- [ ] Un correo de prueba (NOT-02) llega al destinatario (SMTP real).
- [ ] `docker compose -f docker-compose.prod.yml ps` → todos los servicios `Up (healthy)`.
- [ ] Existe al menos un backup en `/backups` y se puede listar.
- [ ] Corte de caja / ventas operan desde el dominio de producción.

---

## Alternativa: YunoHost (notas, sin empaquetar)

YunoHost (Debian autogestionado) es viable pero **no está empaquetado** como app de YunoHost. Consideraciones si se opta por YunoHost:

- La app debe empaquetarse como **paquete YunoHost** (`manifest.toml`, scripts `install/remove/backup/restore`, integración con SSO, dominio y TLS gestionados por YunoHost).
- El **backup** debe declararse en el manifiesto del paquete (YunoHost ejecuta sus propios backups de la BD y de los archivos).
- El **SMTP** puede integrarse con el relay de correo de YunoHost.
- Dado el esfuerzo de empaquetado, la ruta recomendada por ahora es **VPS + Docker Compose + Caddy** (secciones 1–8).
