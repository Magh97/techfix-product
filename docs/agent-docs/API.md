# API

Base: `http://localhost:3000/api/v1` · Auth: `Authorization: Bearer <jwt>` (salvo `/auth/login` y `/auth/refresh`).

Response: `{ data: T }` o `{ data: T[], meta: { page, pageSize, totalItems, totalPages } }`
Error: `{ error: { code, message, details?: [{ field, reason }] } }`
Paginación: `?page=1&pageSize=20` (máx 100; UI usa 10/25/50).

## Auth
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /auth/login | -- | {usuario, password} | {token, refreshToken, usuario} |
| POST | /auth/refresh | -- | {refreshToken} | {token, refreshToken} |
| POST | /auth/logout | JWT | {refreshToken} | 204 (revoca) |

## Usuarios (admin)
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET / POST | /usuarios | admin | ?page&search / {nombre, usuario, password, rol} | lista / 201 |
| PUT | /usuarios/:id | admin | {nombre, rol, isActive?} | usuario |
| PATCH | /usuarios/:id/password | admin | {password} | 204 |

## Catálogos (admin) y Productos
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /catalogos | admin | -- | árbol (hijos anidados) |
| POST / PUT / DELETE | /catalogos[/:id] | admin | {nombre, parentId?, tagsSugeridas?, tagsCompatibilidad?} | nodo / 201 / nodo |
| GET | /productos | JWT | ?page&pageSize&q&catalogoId&tags&stockBajo | lista paginada |
| GET | /productos/por-codigo/:codigo | vendedor/admin | -- | producto |
| POST | /productos | admin | {categoriaId (raíz), catalogoId?, sku, nombre, precios, stockMinimo, stockMaximo?, especificaciones?, proveedorFavoritoId?} | 201 |
| PUT / PATCH | /productos/:id · /desactivar | admin | campos / {motivo?} | producto / 204 |
| GET / POST | /productos/:id/movimientos · /ajustar | admin | -- / {cantidad, motivo} | lista / movimiento |
| GET / POST | /productos/exportar · /importar | admin | ?formato=csv\|xlsx / multipart | archivo / {importados, errores[]} |
| GET | /productos/:id/sugerencias | JWT | -- | {compatibles[], faltante?} (sustitutos) |
| GET / PUT | /productos/:id/bom | admin | -- / {componentes[], manoObra?} | kit + componentes |

## Clientes
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET / POST | /clientes | JWT | ?page&q&soloDeudores / {nombre, telefono, ...} | lista / 201 |
| GET / PUT | /clientes/:id | JWT | -- / campos | cliente + saldo |
| PATCH | /clientes/:id/etiquetas | admin | {etiquetas[]} | cliente |
| GET | /clientes/:id/historial · /cxc | JWT | -- | {ordenes, ventas, cotizaciones, quejas, saldo} / {saldo, vencidas, limite} |

## Quejas
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /quejas | JWT | ?page&clienteId&estado&tipo | lista |
| POST | /quejas | vendedor/admin | {clienteId, tipo: queja\|reclamacion_garantia, garantiaId?, descripcion} | 201 (reclamación exige garantía del cliente) |
| POST | /quejas/:quejaId/estado | vendedor/admin | {estado: en_proceso\|resuelta, resolucion?} | queja (resolución obligatoria al resolver) |

## Equipos usados
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /usados | JWT | ?page&estado=disponible\|vendido&origen&clienteId&q | lista (estado derivado del stock; incluye ordenFolio/ventaFolio) |
| POST | /usados | admin | {sku, nombre, valorTradeIn, precioVenta, stock?=1, origen, clienteId?, ordenId?} | 201 (crea producto raíz "Usado" + ENTRADA; con ordenId valida orden y escribe nota en historial) |
| PUT | /usados/:usadoId | admin | {valorTradeIn?, precioVenta?, origen?, observaciones?} | equipo actualizado |

## Órdenes de servicio
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET / POST | /ordenes | JWT | ?page&estado&folio&clienteId&retrasadas / {clienteId, tipoEquipo, fallaReportada, ...} | lista / 201 |
| GET | /ordenes/:id · /por-folio/:folio | JWT | -- | orden + historial + cotizaciones |
| PATCH | /ordenes/:id/estado | según estados.ts | {nuevoEstado, nota?} | orden (historial) |
| POST | /ordenes/:id/diagnostico · /cotizaciones | tecnico | {diagnostico} / {lineas[]} | orden / 201 |
| POST | /ordenes/:id/cotizaciones/:cid/aprobar · /rechazar | vendedor/admin | -- / {motivo} | reserva stock / -- |
| POST | /ordenes/:id/consumo · /mano-obra | tecnico | {piezas[]} / {horas, tarifaHora} | orden |
| POST | /ordenes/:id/entregar | vendedor/admin | {firma (PNG base64)} | {orden, venta?, garantia} |
| POST | /ordenes/:id/notificar | vendedor/admin | {tipo: listo\|cotizacion} | notificación |

### Sustituciones (técnico/admin)
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST / GET | /ordenes/:id/sustituciones | {lineaId, productoId, justificacion?} / -- | 201 (orden→sustitucion_pendiente, NOT-06) / lista |
| POST | /ordenes/:id/sustituciones/:sid/aceptar | -- | línea = precio sustituto + recalcula total; reservas |
| POST | /ordenes/:id/sustituciones/:sid/rechazar | {motivo} | crea solicitud reabastecimiento (NOT-05); orden vuelve |
| POST | /ordenes/:id/sustituciones/:sid/cancelar | {motivo} | propuesta retirada |

## Ventas / POS
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET / POST | /ventas | JWT | ?page&fechaDesde&fechaHasta&vendedorId / {clienteId?, lineas[], tipoPago, metodoPago?, montoRecibido?, ordenId?, pagos?: [{metodo, monto}], partesDePago?: [{nombre, valor, precioVenta}]} (desglose solo contado) | lista / 201 venta + ticket + garantias + parteDePago + totalAPagar + usadosCreados + pagos |
| GET | /ventas/:id · /por-folio/:folio | JWT | -- | venta + líneas + pagos |
| POST | /ventas/:id/pagos · /cancelar · /devolucion | JWT | {monto, metodo} / {motivo} / {lineas[], reembolsoMetodo?} | pago / venta / devolución |
| GET / POST | /cotizaciones-venta | JWT | ?page&estado / {clienteId, lineas[], vigenciaDias?, descuento?} | lista / 201 |
| POST | /cotizaciones-venta/:id/convertir | JWT | {metodoPago, tipoPago?} | {cotizacionId, folio, venta} |

> Kits (ADR-0003): línea de venta con `is_kit` se desglosa por componente (descuenta stock real de cada pieza) + mano de obra. El kit no descuenta su propio stock.

## Compras (admin) + Reabastecimiento
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET / POST | /proveedores | admin | ?page&q / {nombre, contacto?, condicionesPago?} | lista / 201 |
| PUT / DELETE | /proveedores/:id | admin | campos / -- | proveedor (delete bloqueado con compras) |
| GET / POST | /compras | admin | ?page&estado&proveedorId / {proveedorId, lineas[]} | lista / 201 |
| GET | /compras/reabastecimiento | admin | -- | {grupos: [{proveedorId, lineas[{productoId, sku, stock, sugerido, enOC, folioOC}]}]} |
| GET | /compras/comparacion-precios | admin | ?productoId | {producto{precioCompra, proveedorFavoritoId}, proveedores[{proveedorNombre, ultimoPrecio, ultimaFecha, folioOC, esFavorito, esInactivo, esMasBarato, porDebajoDelActual}]} |
| POST / GET | /compras/solicitudes | tecnico/admin | {productoId, cantidad, ordenId?, motivo?} / ?page&estado&ordenId | 201 (NOT-05) / lista |
| POST | /compras/solicitudes/aprobar | admin | {solicitudes[]} | {creadas[], yaNoPendientes[]} (OC por proveedor) |
| POST | /compras/solicitudes/:id/rechazar | admin | {motivo} | solicitud |
| POST | /compras/solicitudes/:id/cancelar | tecnico/admin | {motivo} (técnico solo suya pendiente) | solicitud |
| POST | /compras/:id/enviar · /recibir | admin | -- / `{ lineas?: [{detalleCompraId, cantidadRecibida}] }` (sin body = todo) | compra (recibir: ENTRADA + CxP por lo recibido + solicitudes de la OC → entregada al completar línea) |
| GET / POST | /compras/:id/pagos | admin | -- / {monto, metodo} | pagos / 201 |

## Caja / Finanzas
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | /caja/abrir · /caja/cerrar | vendedor/admin / admin | -- / {efectivoFisico} | caja / caja + diferencia |
| GET | /caja/actual · /caja/corte | JWT / vendedor/admin | -- | caja|null / resumen por método |
| POST | /finanzas/ingresos | vendedor/admin | {concepto, monto, metodo, cajaId} | 201 |
| POST | /finanzas/egresos | admin | {concepto, categoria, monto, metodo} | 201 |
| GET | /finanzas/cxc · /finanzas/cxp | vendedor/admin / admin | ?estado / ?estado&proveedorId | lista |

## Notificaciones (admin)
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | /notificaciones | admin | ?page&tipo&estado&desde&hasta | lista |
| GET / PUT | /plantillas | admin | -- / {tipo, asunto?, cuerpo} | plantillas / plantilla |
| POST | /notificaciones/enviar-manual | vendedor/admin | {clienteId, tipo, ordenId?, canal?} | 201 |

Tipos: NOT-02 listo · NOT-03 cotización · NOT-05 solicitud refacción · NOT-06 sustitución propuesta.

## Reportes (admin)
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | /reportes/inventario | ?categoria&stockBajo | {items, valorTotal, lowStock[]} |
| GET | /reportes/ventas | ?desde&hasta&grupo=dia\|producto | agregados |
| GET | /reportes/servicios | ?desde&hasta&estado&tecnicoId | {porEstado, porTecnico, tiempoPromedio} |
| GET | /reportes/rentabilidad · /clientes · /finanzas | ?desde&hasta | agregados |
| GET | /reportes/:tipo/exportar | ?formato=csv\|xlsx (+filtros) | archivo |

## Auditoría (admin)
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | /auditoria | ?page&accion&entidad&usuarioId&desde&hasta | {data, meta} |

## Configuración (admin)
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | /configuracion | -- | {iva, tiemposServicio, toleranciaRetraso, plantillas, garantias} |
| PUT | /configuracion/:clave | {valor} | config |

## Error Codes (núcleo)
| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 400 | no pasa zod |
| UNAUTHORIZED | 401 | token ausente/inválido |
| FORBIDDEN | 403 | rol sin permiso |
| NOT_FOUND | 404 | recurso inexistente |
| CONFLICT | 409 | duplicado / transición no permitida |
| ORDER_STATE_INVALID | 409 | transición de estado no permitida |
| QUOTE_NOT_APPROVED | 422 | reparación sin cotización aprobada |
| INSUFFICIENT_STOCK | 422 | stock insuficiente |
| STOCK_RESERVED | 422 | no hay reservas suficientes |
| SOBRE_RECEPCION | 422 | recibir más de lo pendiente de la línea |
| LINEA_NO_EN_COMPRA | 422 | línea que no pertenece a la OC |
| STOCK_SUFICIENTE | 422 | hay stock; no aplica sustitución |
| SUSTITUCION_NOT_FOUND / SUSTITUCION_CERRADA | 404 / 409 | sustitución inexistente / ya resuelta |
| SOLICITUD_NOT_FOUND / SOLICITUD_NO_PENDIENTE | 404 / 409 | solicitud inexistente / no pendiente |
| CREDIT_LIMIT_EXCEEDED | 422 | excede límite de crédito |
| DISCOUNT_NOT_AUTHORIZED | 403 | descuento >10% sin admin |
| INTERNAL_ERROR | 500 | error no controlado |
