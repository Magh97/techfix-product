# PATTERNS

## Controller-Service-Repository
```ts
// routes: validación zod en el borde + requireRole
ordenesRouter.post("/:id/sustituciones", requireRole("tecnico", "admin"),
  validate(idParams, "params"), validate(crearSustitucionSchema),
  async (req: AuthedRequest, res) => {
    created(res, await service.crearSustitucion(id, getValidated<never>(req, "body"), req.user!));
  });

// service: negocio + transacciones; lanza AppError con código de negocio
export async function crearSustitucion(id, input, user) {
  const orden = await repo.findOrden(id);                       // validar estado
  if (!["cotizado", "en_reparacion"].includes(orden.estado)) throw AppError.conflict(...);
  const sustituto = await repo.findProducto(input.productoId);  // stock
  // BEGIN → insert sustitucion + reserva/liberación → cambiarEstado + historial + NOT-06 → COMMIT
}

// repository: solo SQL (pg). Cada operación transaccional recibe client: PoolClient.
export function insertSustitucion(client, input) { return client.query(`INSERT INTO sustituciones ...`) }
```

## State Machine
```ts
// services/estados.ts
const TRANSICIONES: Record<EstadoOrden, { to: EstadoOrden; roles: Rol[]; condicion?: "cotizacion_aprobada" }[]> = {
  cotizado: [
    { to: "en_reparacion", roles: ["tecnico"], condicion: "cotizacion_aprobada" },
    { to: "sustitucion_pendiente", roles: ["tecnico"] },
    { to: "cancelado", roles: ["vendedor", "admin"] },
  ],
  sustitucion_pendiente: [
    { to: "en_reparacion", roles: ["tecnico"] },
    { to: "cotizado", roles: ["tecnico"] },
    { to: "cancelado", roles: ["vendedor", "admin"] },
  ],
  // ...
};
export function validarTransicion(actual, nuevo, rol, cotizacionAprobada = false) { ... }
// TODO cambio de estado → historial_orden con usuario/fecha/nota
```

## Auth Middleware
```ts
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw AppError.unauthorized();
  const payload = verifyAccess(header.slice(7));
  req.user = { id: payload.sub, usuario: payload.usuario, rol: payload.rol };
  next();
}
export function requireRole(...roles: string[]) {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.rol)) throw AppError.forbidden();
    next();
  };
}
```

## Error Class
```ts
// shared/errors.ts
export class AppError extends Error {
  constructor(message, public statusCode = 500, public code = "INTERNAL_ERROR", public details?: unknown[]) { super(message) }
  static badRequest(code, msg, d?) / unauthorized(msg) / forbidden(msg) / notFound(code?, msg?) / conflict(code, msg) / business(code, msg, d?)
}
// errorHandler → { error: { code, message, details? } } con el status del AppError; 500 sin stack.
```

## Money (nunca float para IVA/totales)
```ts
// shared/money.ts
export function calcMoney(subtotal: number, descuento = 0, ivaRate = 0.16) {
  const net = Math.max(0, subtotal - descuento);
  return { subtotal, descuento, iva: net * ivaRate, total: net + net * ivaRate };
}
export function round2(n: number) { return Math.round(n * 100) / 100; } // solo impresión
```

## Data Fetching (TanStack Query)
```ts
const sustituciones = useQuery({
  queryKey: ["sustituciones", id],
  queryFn: () => ordenesApi.sustituciones.list(id),
});
// mutations con invalidación:
const mut = useMutation({ mutationFn: () => ordenesApi.sustituciones.aceptar(s.id),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orden", id] }); toast.success("..."); } });
```

## State Machine en UI (StatusBadge)
```tsx
const MAP: Record<string, { label: string; variant: "default" | "success" | "danger" | "warning" | "accent" }> = {
  pendiente: "default", en_diagnostico: "accent", cotizado: "warning",
  en_reparacion: "accent", sustitucion_pendiente: "warning", listo: "success",
  entregado: "success", cancelado: "danger",
};
// retrasada → <Badge variant="danger">Retrasada</Badge>
```

## Pagination
```tsx
<Pagination page={meta.page} pageSize={meta.pageSize} totalItems={meta.totalItems}
  onChange={(p, ps) => setParams((s) => ({ ...s, page: p, pageSize: ps }))} />
// presets pageSize: 10 / 25 / 50 · rango "X–Y de Z"
```

## File Naming
```
Componente: PascalCase.tsx · Hook: useX.ts · Util: camelCase.ts · Schema: <modulo>.schema.ts
Test: <file>.test.ts · CSS: nunca (Tailwind) · API client: client/src/lib/api.ts
```

## Test (AAA)
```ts
// Arrange: cliente+producto+orden · Act: POST /ordenes/:id/sustituciones → POST :sid/aceptar · Assert: 200, línea con precio del sustituto, total recalculado, stock reservado
// Integración con DB real: RUN_DB_TESTS=true + DATABASE_URL (ver WORKFLOWS)
```
