# API

Base: `https://<host>/api/v1` · Auth: `Authorization: Bearer <jwt>` (salvo `/auth/login`).

Response: `{ data: T }` o `{ data: T[], meta: { page, pageSize, totalItems, totalPages } }`
Error: `{ error: { code, message, details?: [{ field, reason }] } }`

## Auth
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /auth/login | -- | {usuario, password} | {token, refreshToken, usuario} |
| POST | /auth/refresh | -- | {refreshToken} | {token, refreshToken} |
| POST | /auth/logout | JWT | -- | 204 |

## Productos
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /productos | JWT | ?page&pageSize&q&categoria&stockBajo | lista paginada |
| GET | /productos/por-codigo/:codigo | vendedor | -- | producto |
| POST | /productos | admin | CreateProducto | 201 |
| PUT | /productos/:id | admin | campos | producto |
| PATCH | /productos/:id/desactivar | admin | {motivo?} | 204 |
| GET | /productos/:id/movimientos | admin | ?page | lista |
| POST | /productos/:id/ajustar | admin | {cantidad, motivo} | movimiento |
| POST | /productos/:id/bom | admin | {componentes[]} | 201 |

## Clientes
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /clientes | JWT | ?page&q&soloDeudores | lista |
| GET | /clientes/:id | JWT | -- | cliente + saldo |
| POST | /clientes | vendedor | {nombre, telefono, ...} | 201 |
| PUT | /clientes/:id | vendedor | campos | cliente |
| GET | /clientes/:id/historial | vendedor | ?page | {ordenes, ventas, cotizaciones, saldo} |
| GET | /clientes/:id/cxc | vendedor | -- | {saldo, vencidas, limite} |

## Órdenes
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /ordenes | vendedor | {clienteId, tipoEquipo, fallaReportada, ...} | 201 orden |
| GET | /ordenes | JWT | ?page&estado&folio&retrasadas | lista |
| GET | /ordenes/por-folio/:folio | JWT | -- | orden |
| PATCH | /ordenes/:id/estado | según transición | {nuevoEstado, nota?} | orden |
| PUT | /ordenes/:id/diagnostico | tecnico | {diagnostico} | orden |
| POST | /ordenes/:id/cotizaciones | tecnico | {lineas[]} | 201 cotización |
| POST | /ordenes/:id/cotizaciones/:cid/aprobar | vendedor | -- | cotización (reserva stock) |
| POST | /ordenes/:id/cotizaciones/:cid/rechazar | vendedor | {motivo} | cotización |
| POST | /ordenes/:id/consumo | tecnico | {piezas[]} | consumo |
| POST | /ordenes/:id/mano-obra | tecnico | {horas, tarifaHora} | 201 |
| POST | /ordenes/:id/entregar | vendedor | {firma?, ventaId?} | orden + garantía |
| POST | /ordenes/:id/notificar | vendedor | {tipo, canal?} | notificación |

## Ventas
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /ventas | vendedor | CreateVentaRequest | 201 venta + ticket |
| GET | /ventas | JWT | ?page&fechaDesde&fechaHasta&vendedorId | lista |
| GET | /ventas/por-folio/:folio | JWT | -- | venta (reimpresión) |
| POST | /ventas/:id/cancelar | admin | {motivo} | venta |
| POST | /ventas/:id/devolucion | vendedor | {lineas[], reembolsoMetodo?} | devolución |
| POST | /ventas/:id/pagos | vendedor | {monto, metodo} | pago |
| POST | /cotizaciones/:id/convertir | vendedor | {tipoPago, metodoPago, descuento?} | 201 venta |

## Compras (admin)
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /proveedores | admin | ?page&q | lista |
| POST | /proveedores | admin | {nombre, contacto?} | 201 |
| POST | /compras | admin | {proveedorId, lineas[]} | 201 |
| POST | /compras/:id/enviar | admin | -- | compra |
| POST | /compras/:id/recibir | admin | {lineas[]} | compra (ENTRADA + CxP) |
| POST | /compras/:id/pagos | admin | {monto, metodo} | 201 |

## Finanzas / Caja
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /caja/abrir | vendedor | -- | 201 caja |
| GET | /caja/actual | JWT | -- | caja o null |
| GET | /caja/movimientos | JWT | ?page&tipo&desde&hasta | lista |
| GET | /caja/corte | vendedor | ?fecha&usuarioId | resumen + porMetodo |
| POST | /caja/cerrar | admin | {efectivoFisico} | caja + diferencia |
| POST | /finanzas/ingresos | vendedor | {concepto, monto, metodo} | 201 |
| POST | /finanzas/egresos | admin | {concepto, categoria, monto} | 201 |
| GET | /finanzas/cxc | vendedor | ?estado&clienteId | lista |
| GET | /finanzas/cxp | admin | ?estado&proveedorId | lista |

## Notificaciones / Reportes / Config
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /notificaciones | admin | ?page&clienteId&tipo&estado | lista |
| GET | /plantillas | admin | -- | lista |
| PUT | /plantillas/:tipo | admin | {asunto?, cuerpo} | plantilla |
| GET | /reportes/ventas | admin | ?desde&hasta&grupo | agregados |
| GET | /reportes/inventario | admin | ?categoria&stockBajo | {items, valorTotal} |
| GET | /reportes/servicios | admin | ?desde&hasta&estado | {porEstado, tiempoPromedio} |
| GET | /reportes/rentabilidad | admin | ?desde&hasta | {porProducto, total} |
| GET | /reportes/clientes | admin | ?desde&hasta | {frecuentes, deudores} |
| GET | /reportes/finanzas | admin | ?desde&hasta | {ingresos, egresos, utilidad} |
| GET | /reportes/:tipo/exportar | admin | ?formato=excel\|pdf | archivo |
| GET | /configuracion | admin | -- | parámetros |
| PUT | /configuracion/:clave | admin | {valor} | valor |

## Error Codes (núcleo)
| Code | HTTP | Meaning |
|------|------|---------|
| UNAUTHORIZED | 401 | token ausente/inválido |
| FORBIDDEN | 403 | rol sin permiso |
| NOT_FOUND | 404 | recurso inexistente |
| VALIDATION_ERROR | 400 | no pasa zod |
| INSUFFICIENT_STOCK | 422 | excede stock |
| STOCK_RESERVED | 422 | no hay disponible por reservas |
| CREDIT_LIMIT_EXCEEDED | 422 | excede límite cliente |
| ORDER_STATE_INVALID | 409 | transición no permitida |
| QUOTE_EXPIRED | 422 | cotización vencida |
| DISCOUNT_NOT_AUTHORIZED | 403 | descuento >10% sin admin |
| REFUND_WINDOW_EXPIRED | 422 | devolución >15 días |
| NOTIFICATION_FAILED | 422 | envío falló |
