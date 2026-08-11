# CONTEXT

Read this first. Describe el proyecto, stack, estructura y entry points.

## Project
TechStore (tech-experimental-ui) — Sistema de administración para tienda de cómputo: inventario, órdenes de servicio, POS, compras, finanzas, reportes y notificaciones. Uso interno (clientes no acceden).

## Actors & Devices
| Actor | Device | Access |
|-------|--------|--------|
| Admin | PC, navegador | Todo (usuarios, catálogos, reabastecimiento, compras, configuración, auditoría, reportes) |
| Vendedor | PC/tablet + lector código + impresora térmica | Clientes, órdenes (crear/entregar), POS, cobros, caja, garantías, respuesta de sustitución |
| Técnico | PC/tablet | Diagnóstico, estados, cotizaciones, consumo, mano de obra, proponer sustituciones, solicitar refacciones |

## Stack
Monorepo pnpm: Node 22 + Express 5 + TS strict + Zod + pg (server) · React 19 + Vite + Tailwind 4 + TanStack Query + React Router 7 (client) · PostgreSQL 16 · JWT (roles admin/vendedor/tecnico) · Vitest.

## Repo Structure
```
root/
├── server/src/
│   ├── modules/   [auth, auditoria, catalogos, compras, configuracion, crm,
│   │               dashboard, finance, garantias, inventory, notifications,
│   │               quote, reports, sales, services, usuarios]
│   ├── shared/    [db, AppError, zod, money, auditoria, jwt, export]
│   ├── db/        [migraciones 0001..0017 + seed]
│   └── index.ts   [workers: retrasos/hora, garantías/día, refresh-cleanup/día]
├── client/src/
│   ├── pages/     [24 pantallas, ver ARCHITECTURE]
│   ├── components/ [layout, Pagination, TicketDialog, orden/, ui/]
│   └── lib/       [api, auth, types, utils]
├── docs/
│   ├── 01..08     [charter, backlog, reglas, arquitectura, datos, API, UI, manual]
│   ├── adr/       ADR-0001..0007
│   ├── api/openapi.yaml   Contrato OpenAPI 3.1 (núcleo)
│   └── agent-docs/        Este folder
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

## Key Files
| File | Purpose |
|------|---------|
| docs/03-business-rules.md | Reglas de negocio (autoridad) |
| docs/05-data-model.md | Schema PostgreSQL + índices |
| docs/06-api-design.md | Contrato REST (resumen) |
| docs/api/openapi.yaml | Contrato OpenAPI (endpoints núcleo) |
| docs/08-manual-usuario.md | Manual para usuarios del negocio |
| docs/ONBOARDING.md | Puesta en marcha para devs |

## Ports
| Service | Port |
|---------|------|
| SPA dev (Vite) | 5173 |
| API Express | 3000 |
| PostgreSQL (Docker) | 5432 |
| SPA prod (nginx) | 8080 |

## Read Order
1. CONTEXT.md → 2. STACK.md → 3. RULES.md → 4. ARCHITECTURE.md → 5. SCHEMA.md → 6. API.md → 7. PATTERNS.md → 8. DESIGN.md → 9. WORKFLOWS.md
