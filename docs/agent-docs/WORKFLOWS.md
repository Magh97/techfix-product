# WORKFLOWS

## First Setup
```bash
git clone <repo> && cd tech-experimental-ui
pnpm install
cp server/.env.example server/.env   # completar DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev                             # SPA :5173 + API :3000
```

## Add Server Module
```bash
mkdir server/src/modules/<modulo>
# <modulo>.routes.ts  (router + requireRole + validate)   → registrar en server/src/app.ts
# <modulo>.service.ts (negocio + transacciones + AppError)
# <modulo>.repository.ts (SQL; client: PoolClient en transacciones)
# <modulo>.schema.ts   (zod request/response)
```

## Add Client Page
```bash
# pages/<Name>Page.tsx + endpoint en lib/api.ts + ruta en App.tsx + nav en components/layout.tsx
# admin-only → adminOnly: true en el nav; seguir DESIGN.md (loading/empty/error)
```

## Database Migration
```bash
# nuevo archivo server/db/migrations/00XX_<descripcion>.sql (orden cronológico, actual 0011)
pnpm db:migrate   # aplica pendientes (registra en _migrations)
```

## Run Tests
```bash
# server (unit + integración con DB real):
$env:RUN_DB_TESTS="true"
$env:DATABASE_URL="postgres://techstore:techstore_dev@localhost:5432/techstore"
$env:JWT_SECRET="smoke_secret_min_16_chars_ok"
$env:JWT_REFRESH_SECRET="smoke_refresh_secret_min_16"
pnpm --filter server test
# suite completa (server + client):
pnpm test
```

## Seed Database
```bash
pnpm db:seed   # admin/vendedor/tecnico, árbol catálogos 4 niveles, productos, proveedores, plantillas, iva=16
```

## Lint and Typecheck
```bash
pnpm lint       # eslint (server + client)
pnpm typecheck  # tsc --noEmit (server + client)
pnpm build      # tsup (server) + tsc && vite build (client)
```

## Git Workflow
```bash
git checkout -b feature/<descripcion>
git add <archivos específicos> && git commit -m "<tipo>(<scope>): <descripción>"
git checkout develop && git merge --no-ff feature/<descripcion> -m "Merge branch 'feature/<descripcion>' into develop"
git push origin develop
git branch -d feature/<descripcion>
```
Convenciones: `feat: | fix: | chore: | docs: | test: | refactor:` + scope `(server|client|seed|docs)`. Merge siempre `--no-ff` a `develop`. No commitear `docs/wireframe/**` ajeno ni `.env`.

## Docker
```bash
docker compose up -d db        # PostgreSQL 16 (solo dev)
docker compose up --build      # db + api + web (producción local, web :8080)
docker compose exec db psql -U techstore -d techstore
```

## Producción
```bash
cp .env.production.example .env   # DOMAIN, CORS_ORIGIN, JWT_SECRET, POSTGRES_PASSWORD, SMTP_*
docker compose -f docker-compose.prod.yml up -d --build   # db + api + web + caddy(TLS) + backup
docker compose -f docker-compose.prod.yml exec backup sh -c 'ls -lh /backups'   # backups diarios
./scripts/restore.sh techstore-YYYYMMDD-HHMM.sql.gz       # restaurar
# Deploy automático: push a main → CI ejecuta git pull + compose up --build (secrets SSH_*)
```

## CI Pipeline
```
Lint → Typecheck → db:migrate (test DB) → db:seed → Test (RUN_DB_TESTS=true, Postgres 16 service) → Build
+ Deploy (solo push a main): SSH → git pull --ff-only → docker compose -f docker-compose.prod.yml up -d --build
```

## Workers (server/src/index.ts, setInterval)
```bash
# cada hora:            marcarRetrasadas() → retrasada = true (SER-09)
# cada 24h (+al arrancar): marcarGarantiasPorVencer() → NOT-04 recordatorio garantías
# cada 24h (+al arrancar): limpiarRefreshTokens() → purga refresh_tokens vencidos/revocados (30 días)
```
