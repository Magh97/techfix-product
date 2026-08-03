# PATTERNS

Convenciones a implementar (proyecto en fase de diseño; sin código aún).

## Controller-Service-Repository
```ts
// router: validación zod en el borde
router.post('/ordenes', requireRole('vendedor'), validate(createOrdenSchema), services.crearOrden)
// service: negocio + transacciones; lanza AppError con código de negocio
async function crearOrden(input: CreateOrdenInput) {
  // BEGIN
  const cliente = await repo.clientePorId(input.clienteId)
  if (!cliente) throw AppError.notFound('CUSTOMER_NOT_FOUND')
  const folio = await nextFolio('OS')
  const orden = await repo.insertarOrden({ ...input, folio, estado: 'pendiente' })
  // COMMIT
  return orden
}
// repository: solo SQL (pg), devuelve filas crudas
```

## Validación (Zod) + Error
```ts
export const createOrdenSchema = z.object({
  clienteId: z.number().int().positive(),
  tipoEquipo: z.enum(['laptop','desktop','all_in_one','periferico','componente','otro']),
  fallaReportada: z.string().min(1),
  fechaPrometida: z.coerce.date().optional(),
})
export class AppError extends Error {
  constructor(public code: string, public status: number, message: string, public details?: unknown[]) { super(message) }
  static notFound(code: string, message: string) { return new AppError(code, 404, message) }
  static business(code: string, message: string) { return new AppError(code, 422, message) }
}
```

## Estado de Orden (validación de transición)
```ts
const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  pendiente: ['en_diagnostico', 'cancelado'],
  en_diagnostico: ['cotizado', 'cancelado'],
  cotizado: ['en_reparacion', 'cancelado'],
  en_reparacion: ['listo', 'cancelado', 'en_diagnostico'],
  listo: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
}
function validarTransicion(actual: EstadoOrden, nuevo: EstadoOrden) {
  if (!TRANSICIONES[actual].includes(nuevo)) throw new AppError('ORDER_STATE_INVALID', 409, `No se puede pasar de ${actual} a ${nuevo}`)
}
```

## Reserva/Consumo de Stock (transaccional)
```ts
// al aprobar cotización: dentro de una transacción
await tx('SELECT stock FROM productos WHERE id=$1 FOR UPDATE', [productoId])
// INSERT movimiento RESERVA + detalle_orden estado_linea='reservada'
// al consumir: verificar reserva, INSERT SALIDA_CONSUMO, UPDATE productos SET stock = stock - qty
// UPDATE detalle_orden SET estado_linea='consumida' → si stock quedara < 0, ROLLBACK
```

## Auth Middleware
```ts
function requireRole(...roles: Rol[]) {
  return (req, res, next) => {
    const payload = verificarJwt(req.headers.authorization) // throws UNAUTHORIZED
    if (!roles.includes(payload.rol)) throw new AppError('FORBIDDEN', 403, 'Sin permisos')
    req.user = payload
    next()
  }
}
```

## Money (nunca float)
```ts
// calcMoney(net): { subtotal, iva, total } con NUMERIC(19,4) → string/Decimal; redondeo solo en ticket
```

## Componente Controlado (React)
```tsx
const [qty, setQty] = useState(1)
<input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} />
// submit en <form onSubmit>, labels con htmlFor, error con role="alert"
```

## File Naming
```
Componente: PascalCase.tsx · Hook: useX.ts · Util: camelCase.ts · Schema: <modulo>.schema.ts · Test: <file>.test.ts · CSS: nunca (Tailwind)
```

## Test (AAA)
```ts
// Arrange: preparar cliente+producto · Act: POST /ventas · Assert: 201, stock descontado, movimiento SALIDA_VENTA
```
