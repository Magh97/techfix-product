# CONTEXT

Read this first. Project is in design phase (no code yet). Docs are the contract.

## Project
tech-experimental-ui — Sistema de Administración para negocio de mantenimiento, reparación, ensamblado y venta de equipo de cómputo. Uso interno en tienda (clientes no acceden).

## Actors & Devices
| Actor | Device | Access |
|-------|--------|--------|
| Admin | PC Desktop, navegador | Todo: usuarios, configuración, reportes, catálogos, ajustes |
| Vendedor/Recepcionista | PC o tablet + lector código barras + impresora térmica | Clientes, órdenes, ventas, cobros, entregas, notificaciones, corte de caja |
| Técnico | PC o tablet, navegador | Diagnóstico, estados, consumo de piezas, mano de obra |

## Stack
TypeScript (Node/Express API + React/Vite SPA) + PostgreSQL 16 + JWT (roles) + shadcn/ui (Tailwind) + Lucide icons. WhatsApp: Twilio. Impresión: ESC/POS 80mm.

## Repo Structure
```
root/
├── server/src/
│   ├── modules/   [auth, inventory, crm, services, sales, purchases, finance, notifications, reports]
│   ├── shared/    [db, AppError, zod schemas, auditoria, money utils]
│   ├── db/        [migraciones SQL]
│   └── index.ts
├── client/src/
│   ├── app/       [/venta /clientes /productos /inventario /ordenes /compras /caja /finanzas /reportes /configuracion /usuarios]
│   ├── components/
│   ├── hooks/
│   └── lib/
├── docs/
│   ├── main-planning.md          Planeación inicial
│   ├── 01..07                    Charter, backlog, reglas, arquitectura, datos, API, UI
│   ├── adr/                      ADR-0001..0006
│   ├── api/openapi.yaml          Contrato OpenAPI 3.1 (fuente de verdad)
│   └── agent-docs/               Este folder
├── docker-compose.yml
└── README.md
```

## Key Files
| File | Purpose |
|------|---------|
| docs/main-planning.md | Origen: objetivos, módulos, roadmap |
| docs/03-business-rules.md | Reglas de negocio (fuente única de reglas) |
| docs/05-data-model.md | Schema PostgreSQL + índices |
| docs/06-api-design.md | Contrato REST (resumen) |
| docs/api/openapi.yaml | Contrato OpenAPI completo |
| docs/07-ux-ui-guidelines.md | Tokens de diseño y estados UI |

## Ports
| Service | Port |
|---------|------|
| SPA (nginx) | 80/443 |
| API Express | 3000 |
| PostgreSQL | 5432 |
| Impresión ESC/POS | 9100 |

## Read Order
1. CONTEXT.md → 2. STACK.md → 3. RULES.md → 4. ARCHITECTURE.md → 5. SCHEMA.md → 6. API.md → 7. PATTERNS.md → 8. DESIGN.md → 9. WORKFLOWS.md
