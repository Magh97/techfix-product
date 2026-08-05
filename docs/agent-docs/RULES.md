# RULES

Apply before every edit. Violations fail review.

## ALWAYS

```
// STRICT MODE
- TypeScript strict. Sin `any`, sin `React.FC`, sin enums TS (union types / const objects).

// ARCHITECTURE
- router (validate zod) → service (negocio + transacciones) → repository (SQL). Sin lógica en routers.
- Un módulo = server/src/modules/<modulo>/ con routes, service, repository, schema.
- Transacciones BEGIN/COMMIT/ROLLBACK para reservas, consumo, venta, sustituciones, recibir OC (FOR UPDATE en stock).
- Registrar el router en server/src/app.ts.

// DATA TYPES
- Dinero NUMERIC(19,4) en BD, nunca float. IVA 16% con calcMoney() central (shared/money).
- Fechas TIMESTAMPTZ / ISO-8601 UTC. JSON snake_case en BD, camelCase en la API.

// VALIDACIÓN Y ERRORES
- Zod en el borde (body/query/params). Negocio = AppError con código (shared/errors).
- Formato error: { error: { code, message, details? } }.

// AUDITORÍA
- Registrar en `auditoria` (shared/auditoria): venta, ajuste de inventario, cancelación, cierre de caja, descuento >5%.

// ESTADOS / REGLAS
- Transiciones de orden validadas por máquina de estados (services/estados.ts; docs/03 §4). Todo cambio → historial_orden.
- Sustitución: proponer solo en cotizado/en_reparacion con stock insuficiente y sustituto sugerido con stock (BR-SUS).
- Reabastecimiento: sugerido = stockMax-stock | stockMin*2-stock; proveedor favorito→último→sin (BR-REA).
- Solicitudes: crear solo si stock < cantidad (STOCK_SUFICIENTE); aprobar admin → OC; entregada al recibir (BR-COM-06..08).
- No stock negativo: CHECK(stock>=0) + FOR UPDATE. Reservar al aprobar cotización; descontar al consumir; liberar al cancelar.
- Límite de crédito default $3,000; bloquear crédito si saldo + monto > límite.

// UI
- Componentes controlados (value+onChange). submit en <form onSubmit>. labels con htmlFor. focus-visible ring.
- Skeleton en loading, empty state con acción, error con role="alert" y recuperación.
- Paginación: componente Pagination con pageSize 10/25/50 en tablas de listado.
```

## NEVER

```
// TYPES
- No `any`. No `React.FC`. No enums TS.

// IMPORTS
- No barrel exports. No imports relativos más allá de ../../. No `import *` para iconos.

// CODE QUALITY
- No console.log en producción (pino). No raw SQL en services (repositorios).
- No `||` para defaults (usar `??`). No `!` non-null assertions.

// REACT
- No default exports en componentes. No inline styles (Tailwind). No emojis como iconos (Lucide).

// DATA
- No borrado físico de filas con historial (soft delete is_active).
- No vender/consumir sin validar stock y reservas. No redondear en BD (solo impresión).

// SEGURIDAD
- No commit de .env. No exponer password_hash. Refresh tokens hasheados en refresh_tokens.
```

## Design Constraints (Docs = contract)
| Doc | Regla clave |
|-----|-------------|
| docs/03-business-rules.md | Autoridad sobre reglas. No cambiar sin ADR |
| docs/05-data-model.md | Schema + índices. Migraciones por el mismo camino |
| docs/06-api-design.md + openapi.yaml | Contrato de API |
| docs/07-ux-ui-guidelines.md | Tokens y estados de UI |
