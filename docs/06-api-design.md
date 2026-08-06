# API Design — Sistema de Administración (Tienda de Cómputo)

> Contrato REST API-first. Fuente de verdad: **OpenAPI 3.1** → `docs/api/openapi.yaml` (endpoints núcleo).
> Stack: Node/Express + Zod (validación en el borde) · Auth: JWT Bearer con roles.

---

## Convenciones

| Aspecto | Convención |
|---------|------------|
| Base URL | `https://<host>/api/v1` |
| Auth | Header `Authorization: Bearer <jwt>` en todos los endpoints salvo `POST /auth/login` |
| Formato éxito | `{ data: T }` · colecciones: `{ data: T[], meta: { page, pageSize, totalItems, totalPages } }` |
| Formato error | `{ error: { code, message, details?: [{ field, reason }] } }` |
| Paginación | `?page=1&pageSize=20` (max `pageSize=100`); presets de UI: 10/25/50; listas siempre paginadas |
| Fechas | ISO 8601 UTC (`TIMESTAMPTZ`) |
| Montos | Números decimales (fuente `NUMERIC(19,4)`); redondeo solo en impresión |
| Naming | camelCase en JSON; singular para recursos, plural para listas |
| Versionado | `/api/v1` en la ruta |

## Respuestas y Status Codes

| Código | Uso |
|--------|-----|
| `200 OK` | GET, PUT, PATCH exitoso |
| `201 Created` | POST que crea recurso (header `Location`) |
| `204 No Content` | DELETE, acciones sin body |
| `400 Bad Request` | Validación de forma (Zod): campo faltante/malformado |
| `401 Unauthorized` | Sin token o token inválido/expirado |
| `403 Forbidden` | Token válido, rol sin permiso |
| `404 Not Found` | Recurso no existe |
| `409 Conflict` | Violación de estado (ej. cancelar orden ya cancelada) |
| `422 Unprocessable Entity` | Violación de regla de negocio (ej. stock insuficiente, excede límite crédito) |
| `429 Too Many Requests` | Rate limit |
| `500 Internal Server Error` | Error inesperado (sin stack trace) |

## Códigos de Error de Negocio

| Code | HTTP | Significado |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Token ausente/inválido/expirado |
| `FORBIDDEN` | 403 | Rol no autorizado para la acción |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `VALIDATION_ERROR` | 400 | Body/query/params no pasan el esquema Zod |
| `INSUFFICIENT_STOCK` | 422 | Cantidad solicitada excede stock (BR-INV-01) |
| `STOCK_RESERVED` | 422 | Stock disponible insuficiente al reservar (piezas reservadas por otra orden) |
| `CREDIT_LIMIT_EXCEEDED` | 422 | Venta a crédito excede límite del cliente (BR-CRE-02) |
| `ORDER_STATE_INVALID` | 409 | Transición de estado no permitida |
| `ORDER_ALREADY_CANCELLED` | 409 | Orden ya cancelada |
| `QUOTE_EXPIRED` | 422 | Cotización fuera de vigencia (BR-COT-01) |
| `QUOTE_NOT_APPROVED` | 422 | Cotización no aprobada |
| `DISCOUNT_NOT_AUTHORIZED` | 403 | Descuento >10% sin rol admin (BR-VEN-05) |
| `REFUND_WINDOW_EXPIRED` | 422 | Devolución fuera de 15 días (BR-VEN-08) |
| `SALE_WITH_PAYMENTS` | 422 | No se puede cancelar/devolver una venta a crédito con abonos cobrados |
| `SALE_ALREADY_CANCELLED` | 409 | Venta ya cancelada |
| `CUSTOMER_NOT_FOUND` | 404 | Cliente no existe (precondición SER-01) |
| `CONFLICT` | 409 | Conflicto genérico (duplicado, estado) |
| `NOTIFICATION_FAILED` | 422 | Envío WhatsApp/correo falló (se registra reintento) |
| `QUOTE_NOT_FOUND` | 404 | Cotización no encontrada o no activa |
| `QUOTE_ALREADY_PROCESSED` | 409 | Cotización ya aprobada/rechazada |
| `STOCK_SUFICIENTE` | 422 | Hay stock suficiente; no aplica sustitución (BR-SUS-01) |
| `SUSTITUCION_NOT_FOUND` | 404 | Sustitución no encontrada |
| `SUSTITUCION_CERRADA` | 409 | Sustitución ya resuelta (aceptada/rechazada/cancelada) |
| `SOLICITUD_NOT_FOUND` | 404 | Solicitud de reabastecimiento no encontrada |
| `SOLICITUD_NO_PENDIENTE` | 409 | Solo se puede operar sobre solicitudes `pendiente` |
| `SOLICITUD_CERRADA` | 409 | La solicitud ya fue cerrada |
| `CATALOGO_NOT_FOUND` | 404 | Nodo de catálogo no encontrado |
| `CATALOGO_DUPLICADO` | 409 | Ya existe un nodo con el mismo nombre en el mismo nivel |
| `CATALOGO_CON_HIJOS` | 409 | No se elimina un nodo con hijos |
| `CATALOGO_CON_PRODUCTOS` | 409 | No se elimina un nodo con productos asignados |
| `SUPPLIER_HAS_PURCHASES` | 409 | No se desactiva un proveedor con compras activas |
| `SOBRE_RECEPCION` | 422 | Recibir más de lo pendiente de la línea (BR-COM-10) |
| `LINEA_NO_EN_COMPRA` | 422 | Línea de `detalle_compra` que no pertenece a la OC (BR-COM-10) |
| `CANTIDAD_INVALIDA` | 422 | Cantidad a recibir no positiva |

---

## Auth

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/auth/login` | -- | `{ usuario, password }` | `{ data: { token, refreshToken, usuario: { id, nombre, rol } } }` | `UNAUTHORIZED` |
| POST | `/auth/refresh` | -- | `{ refreshToken }` | `{ data: { token, refreshToken } }` | `UNAUTHORIZED` |
| POST | `/auth/logout` | JWT | `{ refreshToken }` | `204` (revoca el refresh) | -- |

> **Sesiones:** refresh tokens se guardan hasheados en `refresh_tokens` (rotación + revocación en logout). Un worker diario elimina tokens vencidos/revocados (housekeeping).

## Usuarios (admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/usuarios` | admin | `?page&pageSize&search` | lista `{ data, meta }` | `FORBIDDEN` |
| POST | `/usuarios` | admin | `{ nombre, usuario, password, rol }` | `201 { data: Usuario }` | `VALIDATION_ERROR`, `CONFLICT` |
| PUT | `/usuarios/:id` | admin | `{ nombre, rol, isActive? }` | `{ data: Usuario }` | `NOT_FOUND`, `FORBIDDEN` |
| PATCH | `/usuarios/:id/password` | admin | `{ password }` | `204` | `NOT_FOUND` |

## Catálogo y Productos (vendedor/admin; escritura admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/productos` | JWT | `?page&pageSize&q&catalogoId&tags&soloActivos&stockBajo` | `{ data, meta }` | -- |
| GET | `/productos/:id` | JWT | -- | `{ data: Producto + stock }` | `NOT_FOUND` |
| GET | `/productos/por-codigo/:codigo` | vendedor/admin | -- | `{ data: Producto }` | `NOT_FOUND` |
| POST | `/productos` | admin | `{ categoriaId, catalogoId?, sku, codigoBarras?, nombre, marca?, modelo?, precioCompra, precioVenta, stockMinimo, stockMaximo?, especificaciones? (tags), proveedorFavoritoId? }` | `201 { data: Producto }` | `VALIDATION_ERROR`, `CONFLICT` |
| PUT | `/productos/:id` | admin | campos editables | `{ data: Producto }` | `NOT_FOUND` |
| PATCH | `/productos/:id/desactivar` | admin | `{ motivo? }` | `204` | `NOT_FOUND`, `FORBIDDEN` |
| GET | `/productos/:id/movimientos` | admin | `?page&pageSize` | `{ data, meta }` | `NOT_FOUND` |
| POST | `/productos/:id/ajustar` | admin | `{ cantidad, motivo }` | `{ data: Movimiento }` | `VALIDATION_ERROR`, `FORBIDDEN` |
| GET | `/catalogos` | admin | -- | `{ data: Catalogo[] }` (árbol) | `FORBIDDEN` |
| POST | `/catalogos` | admin | `{ nombre, parentId? (máx 4 niveles), tagsSugeridas?, tagsCompatibilidad? }` | `201 { data: Catalogo }` | `CATALOGO_DUPLICADO`, `VALIDATION_ERROR` |
| PUT | `/catalogos/:catalogoId` | admin | campos editables | `{ data: Catalogo }` | `CATALOGO_NOT_FOUND` |
| DELETE | `/catalogos/:catalogoId` | admin | -- | `{ data }` | `CATALOGO_CON_HIJOS`, `CATALOGO_CON_PRODUCTOS` |
| POST | `/productos/:id/bom` | admin | `{ componentes: [{ productoId, cantidad }] }` | `201` | `VALIDATION_ERROR` (solo kits) |
| GET | `/productos/:id/sugerencias` | JWT | -- | `{ data: { compatibles, faltante? } }` | `NOT_FOUND` |

> **Taxonomía:** la raíz del árbol `catalogos` es la **categoría** obligatoria del producto (`categoriaId`); `catalogoId` apunta al nodo hoja. Máximo 4 niveles.

## Equipos Usados (listado JWT; alta/edición admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/usados` | JWT | `?page&pageSize&estado=disponible\|vendido&origen&clienteId&q` | `{ data, meta }` (estado derivado del stock; incluye `ordenFolio`/`ventaFolio`) | -- |
| POST | `/usados` | admin | `{ sku, nombre, codigoBarras?, marca?, modelo?, valorTradeIn, precioVenta, stock? (default 1), origen, clienteId?, ordenId?, observaciones? }` | `201 { data: EquipoUsado }` (crea producto bajo raíz "Usado" + ENTRADA; si hay `ordenId` valida la orden y escribe nota en `historial_orden`) | `VALIDATION_ERROR`, `CUSTOMER_NOT_FOUND`, `ORDER_NOT_FOUND`, `CATEGORIA_USADO_NOT_FOUND` |
| PUT | `/usados/:usadoId` | admin | `{ valorTradeIn?, precioVenta?, origen?, observaciones? }` | `{ data: EquipoUsado }` | `USADO_NOT_FOUND` |

> El estado es **derivado**: `disponible` si `stock > 0`, `vendido` si `stock = 0`. `valorTradeIn` es el costo de adquisición (`precio_compra`).

## Clientes (vendedor/admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/clientes` | JWT | `?page&pageSize&q&etiqueta&soloDeudores` | `{ data, meta }` | -- |
| GET | `/clientes/:id` | JWT | -- | `{ data: Cliente + saldo }` | `NOT_FOUND` |
| POST | `/clientes` | vendedor/admin | `{ nombre, telefono, correo?, direccion?, preferenciaContacto, limiteCredito? (default 3000), plazoCreditoDias? (default 15) }` | `201` | `VALIDATION_ERROR`, `CONFLICT` |
| PUT | `/clientes/:id` | vendedor/admin | campos editables | `{ data: Cliente }` | `NOT_FOUND` |
| GET | `/clientes/:id/historial` | vendedor/admin | `?page&pageSize` | `{ data: { ordenes, ventas, cotizaciones, quejas } }` | `NOT_FOUND` |
| PATCH | `/clientes/:id/etiquetas` | admin | `{ etiquetas: string[] }` | `{ data: Cliente }` | `NOT_FOUND` |
| GET | `/clientes/:id/cxc` | vendedor/admin | -- | `{ data: { saldo, vencidas[], limite } }` | `NOT_FOUND` |

## Quejas y Reclamaciones (vendedor/admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/quejas` | JWT | `?page&pageSize&clienteId&estado&tipo` | `{ data, meta }` | -- |
| POST | `/quejas` | vendedor/admin | `{ clienteId, tipo: queja\|reclamacion_garantia, garantiaId?, ordenId?, ventaId?, descripcion }` | `201 { data: Queja }` (reclamación exige garantía del cliente) | `CUSTOMER_NOT_FOUND`, `GARANTIA_REQUERIDA`, `GARANTIA_INVALIDA` |
| POST | `/quejas/:quejaId/estado` | vendedor/admin | `{ estado: en_proceso\|resuelta, resolucion? (obligatoria al resolver) }` | `{ data: Queja }` | `QUEJA_NOT_FOUND`, `ESTADO_INVALIDO`, `RESOLUCION_REQUERIDA` |

> Estados: `abierta → en_proceso → resuelta`. Visible en el historial del cliente (BR-CRM-08).

## Órdenes de Servicio

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/ordenes` | vendedor/admin | `{ clienteId, tipoEquipo, marca?, modelo?, serie?, accesorios?, fallaReportada, fechaPrometida?, tecnicoId? }` | `201 { data: Orden }` | `CUSTOMER_NOT_FOUND`, `VALIDATION_ERROR` |
| GET | `/ordenes` | JWT | `?page&pageSize&estado&folio&clienteId&tecnicoId&retrasadas` | `{ data, meta }` | -- |
| GET | `/ordenes/:id` | JWT | -- | `{ data: Orden + historial + cotizaciones }` | `NOT_FOUND` |
| GET | `/ordenes/por-folio/:folio` | JWT | -- | `{ data: Orden }` | `NOT_FOUND` (SER-13) |
| PATCH | `/ordenes/:id/estado` | según transición | `{ nuevoEstado, nota?, tecnicoId? }` | `{ data: Orden }` | `ORDER_STATE_INVALID`, `FORBIDDEN` |
| PUT | `/ordenes/:id/diagnostico` | tecnico | `{ diagnostico, pendienteCompra?: bool }` | `{ data: Orden }` | `ORDER_STATE_INVALID` |
| POST | `/ordenes/:id/cotizaciones` | tecnico | `{ lineas: [{ tipoLinea: refaccion\|mano_obra, productoId?, cantidad?, horas?, tarifaHora?, descripcion? }] }` | `201 { data: Cotizacion }` | `INSUFFICIENT_STOCK`, `VALIDATION_ERROR` |
| POST | `/ordenes/:id/cotizaciones/:cid/aprobar` | vendedor/admin | `{ canal? }` | `{ data: Cotizacion }` (reserva stock + NOT-03) | `QUOTE_EXPIRED`, `STOCK_RESERVED` |
| POST | `/ordenes/:id/cotizaciones/:cid/rechazar` | vendedor/admin | `{ motivo }` | `{ data: Cotizacion }` | `ORDER_STATE_INVALID` |
| POST | `/ordenes/:id/consumo` | tecnico | `{ piezas: [{ productoId, cantidad }] }` | `{ data: Consumo }` (SALIDA_CONSUMO, libera reserva) | `ORDER_STATE_INVALID`, `INSUFFICIENT_STOCK` |
| POST | `/ordenes/:id/mano-obra` | tecnico | `{ horas, tarifaHora, descripcion }` | `201` | `ORDER_STATE_INVALID` |
| POST | `/ordenes/:id/entregar` | vendedor/admin | `{ firma, ventaId? }` · `firma` = PNG base64 (canvas táctil, obligatoria) | `{ data: Orden + Garantia }` | `ORDER_STATE_INVALID`, `VALIDATION_ERROR` |
| POST | `/ordenes/:id/notificar` | vendedor/admin | `{ tipo: listo\|cotizacion, canal? }` | `{ data: Notificacion }` | `NOTIFICATION_FAILED` |
| GET | `/ordenes/:id/historial` | JWT | -- | `{ data: Historial[] }` | `NOT_FOUND` |

### Sustituciones (técnico/admin) — validación del cliente

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/ordenes/:id/sustituciones` | tecnico/admin | `{ lineaId, productoId (sustituto), justificacion? }` | `201 { data: Sustitucion }` (orden → `sustitucion_pendiente`, NOT-06) | `ORDER_STATE_INVALID`, `STOCK_SUFICIENTE`, `INSUFFICIENT_STOCK`, `NOT_FOUND` |
| GET | `/ordenes/:id/sustituciones` | tecnico/admin | -- | `{ data: Sustitucion[] }` | `NOT_FOUND` |
| POST | `/ordenes/:id/sustituciones/:sid/aceptar` | tecnico/admin | -- | `{ data: Sustitucion }` (reemplaza línea con precio del sustituto, recalcula total; orden vuelve a su estado) | `SUSTITUCION_CERRADA`, `INSUFFICIENT_STOCK`, `STOCK_RESERVED` |
| POST | `/ordenes/:id/sustituciones/:sid/rechazar` | tecnico/admin | `{ motivo }` | `{ data: Sustitucion }` (crea solicitud de reabastecimiento del original; orden vuelve a su estado) | `SUSTITUCION_CERRADA` |
| POST | `/ordenes/:id/sustituciones/:sid/cancelar` | tecnico/admin | `{ motivo }` | `{ data: Sustitucion }` | `SUSTITUCION_CERRADA` |

> Estados de sustitución: `pendiente → aceptada | rechazada | cancelada`. Se propone solo en órdenes `cotizado`/`en_reparacion`, sobre líneas sin stock suficiente y con sustituto sugerido con stock (BR-SUS-01..07).

## Ventas / POS

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/ventas` | vendedor/admin | `{ clienteId?, lineas, descuento?, tipoPago, metodoPago?, montoRecibido?, ordenId?, pagos?: [{ metodo, monto }], partesDePago?: [...] }` (desglose mixto solo contado; Σ pagos = total − parte de pago) | `201 { data: Venta + ticket + garantias + parteDePago + totalAPagar + usadosCreados + pagos }` (BR-GAR-06, BR-VEN-13, BR-VEN-14) | `INSUFFICIENT_STOCK`, `DISCOUNT_NOT_AUTHORIZED`, `CREDIT_LIMIT_EXCEEDED`, `PARTE_DE_PAGO_INVALIDA`, `PAGOS_INVALIDOS`, `PAYMENT_INVALID`, `VALIDATION_ERROR` |
| GET | `/ventas` | JWT | `?page&pageSize&fechaDesde&fechaHasta&vendedorId&metodoPago&estado` | `{ data, meta }` | -- |
| GET | `/ventas/:id` | JWT | -- | `{ data: Venta + lineas + pagos }` | `NOT_FOUND` |
| GET | `/ventas/por-folio/:folio` | JWT | -- | `{ data: Venta }` | `NOT_FOUND` (reimpresión VEN-10) |
| POST | `/ventas/:id/cancelar` | admin | `{ motivo }` | `{ data: Venta }` (reversión stock; reintegra usados de trade-in) | `SALE_ALREADY_CANCELLED`, `SALE_WITH_PAYMENTS`, `FORBIDDEN` |
| POST | `/ventas/:id/devolucion` | vendedor/admin | `{ lineas, motivo? }` | `{ data: Venta }` (restituye stock; `motivo` opcional va a auditoría) | `SALE_ALREADY_PROCESSED`, `SALE_WITH_PAYMENTS`, `REFUND_WINDOW_EXPIRED`, `VALIDATION_ERROR` |
| POST | `/ventas/:id/pagos` | vendedor/admin | `{ monto, metodo, cajaId }` | `201 { data: Pago }` | `VALIDATION_ERROR` |
| GET | `/cotizaciones` | JWT | `?page&pageSize&estado&vencidas` | `{ data, meta }` | -- |
| POST | `/cotizaciones/:id/convertir` | vendedor/admin | `{ tipoPago, metodoPago, descuento?, ... }` | `201 { data: Venta }` | `QUOTE_EXPIRED`, `INSUFFICIENT_STOCK` |

## Compras (admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/proveedores` | admin | `?page&pageSize&q` | `{ data, meta }` | `FORBIDDEN` |
| POST | `/proveedores` | admin | `{ nombre, contacto?, condicionesPago? }` | `201` | `VALIDATION_ERROR` |
| PUT | `/proveedores/:id` | admin | campos editables | `{ data }` | `NOT_FOUND` |
| GET | `/compras` | admin | `?page&pageSize&estado&proveedorId` | `{ data, meta }` | `FORBIDDEN` |
| POST | `/compras` | admin | `{ proveedorId, lineas: [{ productoId, cantidad, precioUnitario }] }` | `201 { data: Compra }` | `VALIDATION_ERROR` |
| GET | `/compras/reabastecimiento` | admin | -- | `{ data: { grupos: [{ proveedorId, proveedorNombre, esFavorito, lineas: [{ productoId, sku, nombre, stock, sugerido, enOC, folioOC }] }] } }` | `FORBIDDEN` |
| GET | `/compras/comparacion-precios` | admin | `?productoId` | `{ data: { producto: { id, sku, nombre, precioCompra, proveedorFavoritoId }, proveedores: [{ proveedorId, proveedorNombre, ultimoPrecio, ultimaFecha, folioOC, cantidad, esFavorito, esInactivo, esMasBarato, porDebajoDelActual }] } }` | `FORBIDDEN`, `PRODUCT_NOT_FOUND` |
| POST | `/compras/solicitudes` | tecnico/admin | `{ productoId, cantidad, ordenId?, motivo? }` (solo si `stock < cantidad`) | `201 { data: Solicitud }` (NOT-05 al admin) | `STOCK_SUFICIENTE`, `NOT_FOUND` |
| GET | `/compras/solicitudes` | tecnico/admin | `?page&pageSize&estado&ordenId` (técnico debe enviar `ordenId`) | `{ data, meta }` | `VALIDATION_ERROR` |
| POST | `/compras/solicitudes/aprobar` | admin | `{ solicitudes: number[] }` | `{ data: { creadas: [], yaNoPendientes: [] } }` (crea OC por proveedor) | `FORBIDDEN`, `NOT_FOUND` |
| POST | `/compras/solicitudes/:solicitudId/rechazar` | admin | `{ motivo }` | `{ data: Solicitud }` | `SOLICITUD_NO_PENDIENTE` |
| POST | `/compras/solicitudes/:solicitudId/cancelar` | tecnico/admin | `{ motivo }` (técnico solo su propia solicitud `pendiente`) | `{ data: Solicitud }` | `SOLICITUD_NO_PENDIENTE`, `FORBIDDEN` |
| POST | `/compras/:id/enviar` | admin | -- | `{ data }` (estado enviada) | `ORDER_STATE_INVALID` |
| POST | `/compras/:id/recibir` | admin | `{ lineas?: [{ detalleCompraId, cantidadRecibida }] }` (sin body = recibir todo lo pendiente) | `{ data }` (ENTRADA + CxP por lo recibido; solicitudes de la OC → `entregada`; `recibida` solo si todas las líneas completas) | `SOBRE_RECEPCION`, `LINEA_NO_EN_COMPRA`, `CONFLICT` |
| GET | `/compras/:id/pagos` | admin | -- | `{ data }` | `NOT_FOUND` |
| POST | `/compras/:id/pagos` | admin | `{ monto, metodo }` | `201` | `VALIDATION_ERROR` |

> Estados de solicitud: `pendiente → aprobada → entregada` (o `rechazada`/`cancelada`). Al **recibir** la OC, las solicitudes aprobadas del producto pasan a `entregada` y se registra el historial en la orden (BR-COM-08). Con recepción parcial (BR-COM-09..11), la entrega ocurre **al completarse la línea** y **solo para las solicitudes ligadas a esa OC**.

## Finanzas y Caja

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/caja/abrir` | vendedor/admin | -- | `201 { data: Caja }` | `CONFLICT` (ya abierta) |
| GET | `/caja/actual` | JWT | -- | `{ data: Caja \| null }` | -- |
| GET | `/caja/movimientos` | JWT | `?page&pageSize&tipo&desde&hasta&usuarioId` | `{ data, meta }` | -- |
| GET | `/caja/corte` | vendedor/admin | `?fecha&usuarioId` | `{ data: { ingresos, egresos, porMetodo[], diferencia, partesDePago } }` (efectivo = Σ pagos recibidos; `partesDePago` = ingreso no monetario) | -- |
| POST | `/caja/cerrar` | admin | `{ efectivoFisico }` | `{ data: Caja }` (arqueo + diferencia) | `FORBIDDEN`, `CONFLICT` |
| POST | `/finanzas/ingresos` | vendedor/admin | `{ concepto, monto, metodo, cajaId, referenciaTipo?, referenciaId? }` | `201` | `VALIDATION_ERROR` |
| POST | `/finanzas/egresos` | admin | `{ concepto, categoria, monto, metodo, proveedorId? }` | `201` | `FORBIDDEN`, `VALIDATION_ERROR` |
| GET | `/finanzas/cxc` | vendedor/admin | `?estado=vigente\|vencido\|pagado&clienteId` | `{ data, meta }` | -- |
| GET | `/finanzas/cxp` | admin | `?estado&proveedorId` | `{ data, meta }` | `FORBIDDEN` |

## Notificaciones (admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/notificaciones` | admin | `?page&pageSize&clienteId&tipo&estado&desde&hasta` | `{ data, meta }` | `FORBIDDEN` |
| GET | `/plantillas` | admin | -- | `{ data: Plantilla[] }` | `FORBIDDEN` |
| PUT | `/plantillas/:tipo` | admin | `{ asunto?, cuerpo }` | `{ data }` | `NOT_FOUND` |
| POST | `/notificaciones/enviar-manual` | vendedor/admin | `{ clienteId, tipo, ordenId?, canal? }` | `201` | `NOTIFICATION_FAILED` |

> Tipos de notificación: **NOT-02** (equipo listo), **NOT-03** (cotización lista), **NOT-05** (solicitud de refacción → admin), **NOT-06** (sustitución propuesta → admin).

## Reportes (admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/reportes/inventario` | admin | `?categoria&stockBajo` | `{ data: { items, valorTotal, lowStock[] } }` | `FORBIDDEN` |
| GET | `/reportes/ventas` | admin | `?desde&hasta&vendedorId&metodoPago&grupo=dia\|producto` | `{ data }` | `FORBIDDEN` |
| GET | `/reportes/servicios` | admin | `?desde&hasta&estado&tecnicoId` | `{ data: { porEstado, porTecnico, tiempoPromedio } }` | `FORBIDDEN` |
| GET | `/reportes/rentabilidad` | admin | `?desde&hasta` | `{ data: { porProducto, porServicio, total } }` | `FORBIDDEN` |
| GET | `/reportes/clientes` | admin | `?desde&hasta&top` | `{ data: { frecuentes, ticketPromedio, deudores } }` | `FORBIDDEN` |
| GET | `/reportes/finanzas` | admin | `?desde&hasta` | `{ data: { ingresos, egresos, utilidad, flujoMensual } }` | `FORBIDDEN` |
| GET | `/reportes/:tipo/exportar` | admin | `?formato=excel\|pdf&...filtros` | `200` (archivo descargable, `Content-Disposition`) | `FORBIDDEN` |

## Auditoría (admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/auditoria` | admin | `?page&pageSize&accion&entidad&usuarioId&desde&hasta` | `{ data, meta }` | `FORBIDDEN` |

> Registra eventos críticos (venta, ajuste, cancelación, cierre de caja, descuento >5%) con usuario, fecha, entidad y valores antes/después (BR-ROL-05).

## Configuración (admin)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/configuracion` | admin | -- | `{ data: { iva, tiemposServicio, toleranciaRetraso, plantillas, garantias } }` | `FORBIDDEN` |
| PUT | `/configuracion/:clave` | admin | `{ valor }` | `{ data }` | `NOT_FOUND` |

---

## Observaciones de Diseño

- **Acciones sobre verbos:** transiciones de estado y aprobaciones usan `POST /recurso/:id/accion` (RPC puntual), no `PATCH` con estados mágicos.
- **Validación en el borde:** Zod valida body/query/params; los errores de negocio salen de los servicios como `AppError` con código de negocio.
- **Listas siempre paginadas:** `meta` incluye `page`, `pageSize`, `totalItems`, `totalPages`.
- **Saldo CxC derivado:** `GET /clientes/:id/cxc` y `GET /finanzas/cxc` calculan saldo sobre la marcha (sin tabla de saldos).
- **Firma de recepción (SER-10):** se captura en un **canvas táctil** y se envía como **PNG en base64** (obligatoria) en `POST /ordenes/:id/entregar`; se almacena en `ordenes_servicio.firma_recepcion`.
- **Reintentos de notificación:** la API no bloquea la operación si el envío falla; se registra `fallido`/`reintento` y el worker reintenta.

## Referencia

- Esquema OpenAPI completo (paths núcleo + schemas + security): `docs/api/openapi.yaml`.
- Códigos de error por regla de negocio ↔ `03-business-rules.md`.
