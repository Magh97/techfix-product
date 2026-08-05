# TechStore — Sistema de Administración (Tienda de Cómputo)

Sistema de administración para un negocio de mantenimiento, reparación, ensamblado y venta de equipo de cómputo: inventario, órdenes de servicio, punto de venta, compras, finanzas, reportes y notificaciones.

## Stack

| Capa | Tech |
|------|------|
| Frontend | React 19 · Vite · Tailwind CSS 4 · shadcn-style UI · TanStack Query |
| Backend | Node 22+ · Express 5 · TypeScript strict · Zod · pg (SQL nativo) |
| Base de datos | PostgreSQL 16 · migraciones SQL propias |
| Tests | Vitest (unit + integración con DB real) |
| Infra | pnpm workspaces · Docker Compose · GitHub Actions |

## Estructura

```
├── server/   # API Express (/api/v1) con migraciones, seed y tests
├── client/   # SPA React (Vite) con diseño del wireframe
├── docs/     # Documentación, wireframe app y landing page
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Puesta en marcha

```bash
# 1. Dependencias
pnpm install

# 2. Base de datos (Docker)
docker compose up -d db

# 3. Migraciones y seed (usuario admin / admin1234)
pnpm db:migrate
pnpm db:seed

# 4. Desarrollo (API :3000 + client :5173, Vite proxy /api)
pnpm dev
```

O todo en contenedores:

```bash
cp .env.example .env   # ajusta credenciales
docker compose up --build
# API  http://localhost:3000/api/v1  ·  Web  http://localhost:8080
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | API + client en dev (hot reload) |
| `pnpm build` | Build de server (tsup) y client (vite) |
| `pnpm lint` / `pnpm typecheck` | ESLint + Prettier / tsc |
| `pnpm test` | Vitest (unit). Con `RUN_DB_TESTS=true` suma integración |
| `pnpm db:migrate` / `pnpm db:seed` | Migraciones y datos iniciales |

## Documentación

- [Manual de usuario](docs/08-manual-usuario.md) · [Planeación](docs/main-planning.md) · [Arquitectura](docs/04-architecture.md) · [API](docs/06-api-design.md) · [Modelo de datos](docs/05-data-model.md) · [Changelog](CHANGELOG.md)
- Prototipo del sistema: `docs/wireframe/app/index.html`
- Landing page: `docs/wireframe/landing-page/index.html`

> Estado: **v0.1.0** — Fase 1 (MVP) completa: inventario, clientes, órdenes de servicio (máquina de estados + reservas + worker de retrasos), POS, caja/finanzas, compras, notificaciones por correo y reportes con exportación CSV/Excel e importación de inventario. Fase 2 en curso: reportes, compras, **auditoría**, **paginación**, **taxonomía unificada (catálogos/tags)** y **reabastecimiento con sustituciones de piezas validadas con el cliente**.

