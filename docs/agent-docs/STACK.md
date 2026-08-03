# STACK

Versiones no definidas (fase de diseño). Usar `?` hasta crear package.json.

| Layer | Tech | Version | Dev-Kit |
|-------|------|---------|---------|
| Runtime (API) | Node.js | ? | nodejs-core |
| Framework API | Express | ? | nodejs-express |
| Frontend | React + Vite | ? | react-core |
| Language | TypeScript (strict) | ? | — |
| Base de datos | PostgreSQL | 16 | — |
| Validación | Zod | ? | — |
| UI lib | shadcn/ui (Tailwind 4) | ? | react-components |
| Iconos | Lucide | ? | — |
| Impresión | node-thermal-printer (ESC/POS) | ? | — |
| WhatsApp | Twilio WhatsApp API | ? | — |
| Jobs | node-cron | ? | — |
| Logs | pino (JSON) | ? | — |

## Package Manager
npm

## Module System
ESM

## Path Aliases
```
@/      → ./client/src/
@server → ./server/src/
```

## Env Vars Requeridas (diseño)
```
DATABASE_URL=postgres://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SMTP_HOST / SMTP_USER / SMTP_PASS
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM
PORT=3000
```
