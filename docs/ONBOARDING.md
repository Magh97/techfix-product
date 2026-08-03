# Onboarding: Sistema de Administración (Tienda de Cómputo)

> Quick start time: 15 min (diseño completo; código aún no creado)

## Quick Start
```bash
git clone <repo> && cd tech-experimental-ui
docker compose up -d db
npm install -w server -w client
cp server/.env.example server/.env   # completar DATABASE_URL, JWT_SECRET, SMTP, TWILIO
npm run db:migrate && npm run db:seed && npm run dev
```
Open: http://localhost:5173 (client) · http://localhost:3000/api/v1 (API) · :5432 (PostgreSQL)

## Stack
| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript (strict), shadcn/ui + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL 16 |
| Validación | Zod |
| Auth | JWT Bearer (roles admin/vendedor/tecnico) |
| Notificaciones | Twilio WhatsApp API + SMTP |
| Impresión | ESC/POS 80mm |

## Key Commands
| Task | Command |
|------|---------|
| Dev (SPA+API) | `npm run dev` |
| Migraciones | `npm run db:migrate` |
| Seed | `npm run db:seed` |
| Tests | `npm test` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |

## Key Files
| File | Purpose |
|------|---------|
| `docs/03-business-rules.md` | Reglas de negocio (autoridad) |
| `docs/05-data-model.md` | Schema + índices PostgreSQL |
| `docs/api/openapi.yaml` | Contrato de API (fuente de verdad) |
| `docs/06-api-design.md` | Resumen de endpoints y errores |
| `docs/07-ux-ui-guidelines.md` | Design tokens y estados UI |
| `docs/adr/` | Decisiones de arquitectura (ADR-0001..06) |
| `docs/agent-docs/` | Docs optimizadas para agentes |

## Env Vars
| Variable | Required | Default/Example |
|----------|----------|-----------------|
| DATABASE_URL | sí | `postgres://user:pass@localhost:5432/tienda` |
| JWT_SECRET | sí | `<random>` |
| JWT_REFRESH_SECRET | sí | `<random>` |
| SMTP_HOST / SMTP_USER / SMTP_PASS | no (dev) | — |
| TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM | no (dev) | — |
| PORT | no | `3000` |

## Architecture (1-min digest)
```
React SPA ──REST/JSON──► Express API ──pg──► PostgreSQL 16
Express API ──► Worker (retrasos/hora, garantías/día, expiración cotizaciones, respaldo)
Worker ──SMTP──► Correo · Worker ──Twilio──► WhatsApp · SPA ──ESC/POS──► Impresora
```

### Top 3 Modules
| Module | Purpose |
|--------|---------|
| services | Órdenes de servicio: estados, cotización, consumo, entrega |
| inventory | Productos, stock, reservas, movimientos, BOM |
| sales | POS: ventas, descuentos, crédito, tickets, devoluciones |

### Top 3 Routes
| Route | Purpose |
|-------|---------|
| `/venta` | Punto de venta (escáner + carrito + pago + ticket) |
| `/ordenes` | Ciclo completo de servicio (recepción → entrega) |
| `/clientes` | CRM con historial y CxC |

> Estructura de repo y read order de docs: `docs/agent-docs/CONTEXT.md`.
