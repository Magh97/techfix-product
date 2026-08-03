# RULES

Apply before every edit. Violations fail review.

## ALWAYS

```
// ARCHITECTURE
- controller (zod validate) → service (negocio) → repository (SQL). No lógica de negocio en controllers.
- Un módulo = carpeta en server/src/modules/<modulo>/ con router, service, repository, schema.
- Transacciones con BEGIN/COMMIT/ROLLBACK para reservas, consumo y venta (FOR UPDATE en stock).

// DATA TYPES
- Dinero: NUMERIC(19,4) en BD, never FLOAT. Decimal en TS (evitar float arithmetic para IVA/descuentos).
- Fechas: TIMESTAMPTZ / ISO-8601 UTC en API. Dates (solo fecha) sin timezone.
- IVA: calcular con calcMoney(net) central en shared. Ticket redondea a 2 decimales, BD guarda 4.

// VALIDACIÓN
- Zod en el borde (body/query/params). Errores de negocio = AppError con código de negocio.

// ERRORES
- Respuesta error: { error: { code, message, details? } }.
- Códigos de negocio de docs/06-api-design.md (INSUFFICIENT_STOCK, CREDIT_LIMIT_EXCEEDED, ORDER_STATE_INVALID...).

// ESTADOS
- Transiciones de orden validadas por máquina de estados (docs/03-business-rules.md §4).
- Todo cambio de estado → historial_orden con usuario, fecha, nota.
- Retraso: marcar cuando fecha_prometida + 1 día calendario < ahora (tolerancia 1 día, incluye domingo).
- Entrega (SER-10): firma obligatoria como PNG base64 (canvas táctil) en firma_recepcion.

// CRÉDITO
- Límite de crédito default $3,000 MXN al crear cliente; ampliable individualmente.
- Bloquear venta a crédito si saldo + monto > limite_credito.

// AUDITORÍA
- Registrar auditoria en: venta, ajuste inventario, cancelación, cierre de caja, descuento >5%.

// UI
- Componentes controlados (value+onChange). submit en <form onSubmit>. labels con htmlFor.
- cursor-pointer en clicables. transición hover 150-300ms. focus-visible ring.
- Skeleton en loading, empty state con acción, error con role="alert" y recuperación.

// STOCK
- Nunca stock negativo: CHECK(stock>=0) + FOR UPDATE al reservar/consumir/vender.
- Reservar al aprobar cotización; descontar al consumir; liberar al cancelar/expirar.
```

## NEVER

```
// TYPES
- No `any`. No `React.FC`. No enums TS (usar union types / const objects).

// IMPORTS
- No barrel exports. No imports relativos más allá de ../../.

// CODE QUALITY
- No console.log en producción (pino). No raw SQL suelto en services (repositorios).
- No `||` para defaults (usar `??`). No `!` non-null assertions.

// REACT
- No default exports en componentes. No inline styles (Tailwind).
- No emojis como iconos (Lucide). No marcas con rutas inventadas (Simple Icons).

// DATA
- No borrado físico de filas con historial (soft delete is_active).
- No vender/consumir sin validar stock y reservas.
- No redondear en BD (solo impresión).

// SEGURIDAD
- No commit de .env. No exponer password_hash. JWT con refresh en httpOnly cookie o almacenado seguro.
```

## Design Constraints (Docs = contract)
| Doc | Regla clave |
|-----|-------------|
| docs/03-business-rules.md | Autoridad sobre reglas. No cambiar sin ADR |
| docs/05-data-model.md | Schema + índices. Migraciones por el mismo camino |
| docs/06-api-design.md + openapi.yaml | Contrato de API. No endpoints sin especificar |
| docs/07-ux-ui-guidelines.md | Tokens y estados de UI |
