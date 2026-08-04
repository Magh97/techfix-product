# API

Base: `http://localhost:3000/api/v1` · Auth: `Authorization: Bearer <jwt>` (salvo `/auth/login`).

Response: `{ data: T }` o `{ data: T[], meta: { page, pageSize, totalItems, totalPages } }`
Error: `{ error: { code, message, details?: [{ field, reason }] } }`

## Auth
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /auth/login | -- | {usuario, password} | {token, refreshToken, usuario} |
| POST | /auth/refresh | -- | {refreshToken} | {token, refreshToken} |

## Productos
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /productos | JWT | ?page&pageSize&q&categoria&stockBajo | lista paginada (con `lowStock`) |
| GET | /productos/por-codigo/:codigo | JWT | -- | producto |
| GET | /productos/exportar | JWT | ?formato=csv\|xlsx | archivo `catalogo-productos` |
| GET | /productos/plantilla | JWT | ?formato=csv\|xlsx | plantilla de importación (con fila de ejemplo) |
| POST | /productos | admin | CreateProducto | 201 |
| POST | /productos/importar | admin | multipart `archivo` (.csv/.xlsx) | `{ importados, omitidos[], errores[] }` |
| PUT | /productos/:productoId | admin | campos | producto |
| PATCH | /productos/:productoId/desactivar | admin | -- | producto |
| GET | /productos/:productoId/bom | admin | -- | kit + componentes con precio/stock |
| PUT | /productos/:productoId/bom | admin | `{ componentes: [{productoId, cantidad}], manoObra? }` | kit con precio recalculado (Σ componentes + ensamble) |

## Clientes
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /clientes | JWT | ?page&pageSize&q | lista |
| GET | /clientes/:clienteId | JWT | -- | cliente + saldoPendiente |
| POST | /clientes | JWT | {nombre, telefono, correo?, ...} | 201 |
| PUT | /clientes/:clienteId | JWT | campos | cliente |
| PATCH | /clientes/:clienteId/etiquetas | JWT | {etiquetas[]} | cliente |
| GET | /clientes/:clienteId/historial | JWT | -- | {ordenes, ventas, cotizaciones} |
| GET | /clientes/:clienteId/cxc | JWT | -- | {limiteCredito, saldoTotal, items} |

## Órdenes de servicio
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /ordenes | JWT | ?page&pageSize&estado&retrasadas&folio&clienteId | lista |
| POST | /ordenes | JWT | {clienteId, tipoEquipo, fallaReportada, ...} | 201 orden |
| GET | /ordenes/por-folio/:folio | JWT | -- | orden |
| GET | /ordenes/:id | JWT | -- | orden |
| PATCH | /ordenes/:id/estado | según máquina de estados | {nuevoEstado, nota?} | orden |
| POST | /ordenes/:id/diagnostico | tecnico | {diagnostico} | orden |
| POST | /ordenes/:id/cotizaciones | tecnico | {lineas[]} | 201 cotización |
| POST | /ordenes/:id/cotizaciones/:cid/aprobar | vendedor/admin | -- | reserva stock |
| POST | /ordenes/:id/cotizaciones/:cid/rechazar | vendedor/admin | {motivo} | -- |
| POST | /ordenes/:id/consumo | tecnico | {piezas[]} | orden |
| POST | /ordenes/:id/mano-obra | tecnico | {horas, tarifaHora} | orden |
| POST | /ordenes/:id/entregar | vendedor/admin | {firma, metodoPago?} | {orden, ventaFolio} + garantía |
| POST | /ordenes/:id/cancelar | JWT | {motivo} | orden |
| POST | /ordenes/:id/notificar | JWT | {tipo: listo\|cotizacion, canal?} | {enviado, canal, folio, simulated?, error?} |

## Ventas (POS)
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /ventas | JWT | ?page&pageSize&desde&hasta&vendedorId | lista |
| POST | /ventas | JWT | {clienteId?, lineas[], tipoPago, metodoPago?, descuento?} | 201 venta + ticket |

> **Kits (ADR-0003):** una línea `tipo:"producto"` cuyo producto tenga `is_kit` se desglosa en una línea por componente (descontando stock real de cada pieza) + una línea de "Mano de obra de ensamble". El precio se calcula en el servidor; el kit no descuenta su propio stock.
| GET | /ventas/por-folio/:folio | JWT | -- | venta |
| GET | /ventas/:ventaId | JWT | -- | venta |
| POST | /ventas/:ventaId/pagos | JWT | {monto, metodo} | pago |
| POST | /ventas/:ventaId/cancelar | JWT | {motivo} | venta |
| POST | /ventas/:ventaId/devolucion | JWT | {lineas[]} | devolución |

## Caja / Finanzas
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /caja/abrir | vendedor/admin | -- | caja |
| GET | /caja/actual | JWT | -- | caja o null |
| GET | /caja/corte | vendedor/admin | -- | corte por método |
| POST | /caja/cerrar | admin | {efectivoFisico} | caja + diferencia |
| GET | /finanzas/movimientos | JWT | ?page&pageSize | lista |
| GET | /finanzas/egresos | JWT | ?page&pageSize | lista |
| POST | /finanzas/ingresos | vendedor/admin | {concepto, monto, metodo} | -- |
| POST | /finanzas/egresos | admin | {concepto, categoria, monto, metodo} | -- |
| GET | /finanzas/cxc | vendedor/admin | ?estado | lista |

## Compras (admin)
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /proveedores | admin | ?page&q | lista |
| POST | /proveedores | admin | {nombre, contacto?} | 201 |
| GET | /proveedores/:proveedorId | admin | -- | proveedor |
| PUT | /proveedores/:proveedorId | admin | campos | proveedor |
| DELETE | /proveedores/:proveedorId | admin | -- | {id} |
| GET | /compras | admin | ?page&proveedorId&estado&folio | lista |
| POST | /compras | admin | {proveedorId, lineas[], fechaVencimiento?} | 201 |
| GET | /compras/cxp | admin | -- | lista CxP |
| GET | /compras/:compraId | admin | -- | compra + pagos |
| POST | /compras/:compraId/enviar | admin | -- | compra |
| POST | /compras/:compraId/recibir | admin | -- | compra (ENTRADA stock + CxP) |
| POST | /compras/:compraId/pagos | admin | {monto, metodo} | {saldoPendiente} |
| POST | /compras/:compraId/cancelar | admin | -- | compra |

## Reportes (admin)
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | /reports/inventario | -- | `{ data, resumen: { totalArticulos, valorTotalCosto, stockBajo } }` |
| GET | /reports/ventas | ?desde&hasta&agrupar=dia\|producto\|vendedor\|metodo | `{ data, resumen }` |
| GET | /reports/servicios | ?desde&hasta&estado&tecnicoId | `{ resumen, porEstado, porTecnico, porTipoEquipo }` |
| GET | /reports/:tipo/export | ?formato=csv\|xlsx (+filtros del reporte) | archivo `reporte-<tipo>` |

## Worker
- Cada hora marca `retrasada = true` en órdenes abiertas con `fecha_prometida < hoy - 1 día` (US-SER-09). Se ejecuta al arrancar el servidor y con `setInterval` cada 60 min.

## Error Codes (núcleo)
| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 400 | no pasa zod |
| UNAUTHORIZED | 401 | token ausente/inválido |
| FORBIDDEN | 403 | rol sin permiso |
| NOT_FOUND | 404 | recurso inexistente |
| CONFLICT | 409 | conflicto (duplicado, estado) |
| ORDER_STATE_INVALID | 409 | transición de estado no permitida |
| ORDER_NOT_READY | 422 | notificar "listo" en orden no lista |
| QUOTE_NOT_APPROVED | 422 | reparación sin cotización aprobada |
| CUSTOMER_NOT_FOUND | 404 | cliente no existe |
| PRODUCT_NOT_FOUND | 404 | producto no existe |
| ARCHIVO_VACIO / FORMATO_NO_SOPORTADO | 400 | importación inválida |
| INTERNAL_ERROR | 500 | error no controlado |
