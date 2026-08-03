# WORKFLOWS

Proyecto en fase de diseño (sin código). Comandos objetivo del stack elegido.

## First Setup
```bash
git clone <repo> && cd tech-experimental-ui
docker compose up -d db          # PostgreSQL 16
npm install -w server -w client
cp server/.env.example server/.env   # completar DATABASE_URL, JWT_SECRET, SMTP, TWILIO
npm run db:migrate
npm run db:seed
npm run dev                       # SPA :5173 + API :3000
```

## Add Server Module
```bash
mkdir server/src/modules/<modulo>
# router.<modulo>.ts  (rutas + requireRole + validate)
# <modulo>.service.ts (negocio + transacciones)
# <modulo>.repository.ts (SQL)
# <modulo>.schema.ts   (zod: request/response)
# registrar router en server/src/index.ts
```

## Add Client Page
```bash
mkdir client/src/app/<ruta>
# page.tsx (screen) + components/<Screen>/  + hooks/use<Screen>.ts
# agregar ruta en router con el rol requerido
# seguir DESIGN.md (tokens, estados loading/empty/error)
```

## Database Migration
```bash
npm run db:migrate --name add_<descripcion>   # nuevo archivo SQL en server/db/migrations
npm run db:migrate                            # aplica pendientes
# convención: 0001_init.sql, 0002_add_foo.sql (orden cronológico)
```

## Run Tests
```bash
npm test                # vitest (server) 
npm run test:client     # vitest + testing-library (SPA)
npm run test:e2e        # playwright (opcional)
```

## Seed Database
```bash
npm run db:seed   # admin inicial, categorías, plantillas de notificación, config (iva=16)
```

## Lint and Typecheck
```bash
npm run lint       # eslint (TS strict)
npm run typecheck  # tsc --noEmit
```

## Git Workflow
```bash
git checkout -b feat/<modulo>-<desc>
git add . && git commit -m "feat(<modulo>): descripción"
git push -u origin feat/...   # PR → squash merge
```
Convenciones: `feat: | fix: | chore: | docs: | test: | refactor:` (+ scope `(<modulo>)`).

## Docker
```bash
docker compose up -d            # db + api + worker + nginx(spa)
docker compose logs -f api
docker compose exec db psql -U <user> -d tienda
```

## CI Pipeline
```
Lint → Typecheck → Test (unit+integration) → Build (server + client) → Push imagen → Deploy VPS
Workers/jobs: node-cron (retrasos cada hora, garantías diarias) — un solo worker (job_locks anti-duplicado)
```

## Jobs Programados
```bash
# worker: 
#   */60 * * * *  detectar retrasos (SER-09) → marcar retrasada → NOT-01
#   0 0 * * *     recordatorios de garantía 3 y 1 días antes (NOT-04)
#   0 0 * * *     expirar cotizaciones (emitida + vigencia_hasta < hoy → expirada, libera reservas)
#   0 2 * * *     respaldo automático de BD
```
