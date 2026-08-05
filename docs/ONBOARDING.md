# Onboarding: TechStore — Sistema de Administración (Tienda de Cómputo)

> Quick start: 10 min. Monorepo pnpm (`server` API + `client` SPA) sobre PostgreSQL 16 con Docker.

## Quick Start
```bash
git clone <repo> && cd tech-experimental-ui
pnpm install
cp server/.env.example server/.env      # completa DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
docker compose up -d db
pnpm db:migrate && pnpm db:seed && pnpm dev
```
Open: http://localhost:5173 (client) · http://localhost:3000/api/v1 (API) · :5432 (PostgreSQL)

## Credenciales de seed
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin1234` | Administrador (todo) |
| `vendedor` | `vendedor1234` | Vendedor |
| `tecnico` | `tecnico1234` | Técnico |

## Stack
| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + TypeScript (strict), Tailwind 4, shadcn-style UI, TanStack Query |
| Backend | Node 22+ · Express 5 · TypeScript strict · Zod · pg (SQL nativo) |
| Base de datos | PostgreSQL 16 · migraciones SQL propias (`server/db/migrations/0001..0011`) |
| Auth | JWT Bearer (access + refresh rotado) con roles admin/vendedor/tecnico |
| Tests | Vitest (unit + integración con DB real) |
| Infra | pnpm workspaces · Docker Compose · GitHub Actions |

## Key Commands
| Task | Command |
|------|---------|
| Dev (SPA+API) | `pnpm dev` |
| Migraciones | `pnpm db:migrate` |
| Seed | `pnpm db:seed` |
| Tests | `pnpm test` (integración: `RUN_DB_TESTS=true`) |
| Lint / Typecheck | `pnpm lint` / `pnpm typecheck` |
| Build | `pnpm build` |

## Key Files
| File | Purpose |
|------|---------|
| `docs/03-business-rules.md` | Reglas de negocio (autoridad) |
| `docs/05-data-model.md` | Schema + índices PostgreSQL |
| `docs/06-api-design.md` | Endpoints, errores y convenciones |
| `docs/08-manual-usuario.md` | Manual para usuarios del negocio |
| `docs/api/openapi.yaml` | Contrato OpenAPI (endpoints núcleo) |
| `docs/adr/` | Decisiones de arquitectura (ADR-0001..07) |
| `docs/agent-docs/` | Docs optimizadas para agentes |

## Env Vars (server)
| Variable | Required | Default/Example |
|----------|----------|-----------------|
| DATABASE_URL | sí | `postgres://techstore:techstore_dev@localhost:5432/techstore` |
| JWT_SECRET | sí | `<random ≥32 chars>` |
| JWT_REFRESH_SECRET | sí | `<random ≥32 chars>` |
| JWT_ACCESS_TTL | no | `15m` |
| JWT_REFRESH_TTL | no | `7d` |
| CORS_ORIGIN | no | `http://localhost:5173` |
| SMTP_HOST / USER / PASS | no (dev) | vacío → correos simulados en consola |
| PORT | no | `3000` |

## Architecture (1-min digest)
```
React SPA ──REST/JSON──► Express API ──pg──► PostgreSQL 16
Express API ──► Worker (retrasos/hora, garantías/día, expiración cotizaciones,
                        housekeeping refresh_tokens, respaldo)
Worker ──SMTP──► Correo · SPA ──ESC/POS──► Impresora (ticket; impresión pendiente)
```

### Top 5 Modules
| Module | Purpose |
|--------|---------|
| `services` | Órdenes de servicio: máquina de estados (incl. sustitución), cotización, consumo, entrega |
| `inventory` + `catalogos` | Productos, stock, reservas, movimientos, BOM, árbol de catálogos (4 niveles, tags) |
| `compras` | Proveedores, OC, reabastecimiento (sugerencias + solicitudes de técnicos), CxP |
| `sales` | POS: ventas, descuentos, crédito, tickets, devoluciones |
| `auditoria` | Bitácora de eventos críticos (admin) |

### Top 5 Routes
| Route | Purpose |
|-------|---------|
| `/venta` | Punto de venta (escáner + carrito + pago + ticket) |
| `/ordenes` | Ciclo completo de servicio (recepción → entrega; sustituciones) |
| `/clientes` | CRM con historial y CxC |
| `/reabastecimiento` | Sugerencias y solicitudes de refacciones (admin) |
| `/compras` | Órdenes de compra y entradas de mercancía (admin) |

> Read order de docs técnicas: `docs/agent-docs/CONTEXT.md` → `03-business-rules.md` → `05-data-model.md` → `06-api-design.md`.
