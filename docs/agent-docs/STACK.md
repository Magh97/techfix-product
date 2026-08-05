# STACK

| Layer | Tech | Version | Dev-Kit |
|-------|------|---------|---------|
| Runtime (API) | Node.js | 22+ | nodejs-core |
| Framework API | Express | ^5.1.0 | nodejs-express |
| ORM | pg (SQL nativo) | ^8.13.1 | — |
| Validación | Zod | ^3.24 | — |
| Frontend | React | ^19.2 | react-core |
| Build front | Vite | ^8.2 | — |
| CSS | Tailwind CSS | ^4.3 | react-components |
| Data fetching | TanStack Query | ^5.101 | react-state |
| Router | React Router | ^7.18 | react-routing |
| Icons | lucide-react | ^1.28 | — |
| Auth | jsonwebtoken | ^9.0 | — |
| Tests | Vitest + supertest + jsdom | ^3 | nodejs-testing |
| Correo | nodemailer | ^9.0 | — |
| Excel | exceljs | ^4.4 | — |
| Logs | pino | ^9.5 | — |
| TS | TypeScript (strict) | 5.9 client / 5.7 server | — |
| Package manager | pnpm | 11.20.0 | — |
| Base de datos | PostgreSQL | 16 | — |

## Package Manager
pnpm

## Module System
ESM (`"type": "module"`)

## Path Aliases
```json
{ "@/*": "./client/src/*" }
```

## Env Vars (server/.env)
```
DATABASE_URL=postgres://techstore:techstore_dev@localhost:5432/techstore
JWT_SECRET=change_me_access_secret_32_chars_min
JWT_REFRESH_SECRET=change_me_refresh_secret_32_chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGIN=http://localhost:5173
PORT=3000
SMTP_HOST=            # vacío → correos simulados en consola
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

## Seed Users
| User | Pass | Rol |
|------|------|-----|
| admin | admin1234 | admin |
| vendedor | vendedor1234 | vendedor |
| tecnico | tecnico1234 | tecnico |
