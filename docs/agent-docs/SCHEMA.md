# SCHEMA

Fuente completa: `docs/05-data-model.md`. Resumen ejecutivo para agentes.

## Enums

```
rol: admin | vendedor | tecnico
movimiento_tipo: ENTRADA | SALIDA_VENTA | SALIDA_CONSUMO | AJUSTE | DEVOLUCION | RESERVA | LIBERACION
estado_orden: pendiente | en_diagnostico | cotizado | en_reparacion | sustitucion_pendiente | listo | entregado | cancelado
estado_linea_orden: cotizada | reservada | consumida | liberada
estado_cotizacion: emitida | aprobada | rechazada | expirada | convertida
tipo_linea_cotizacion: refaccion | mano_obra
estado_venta: completada | cancelada | devuelta | credito_pendiente
tipo_pago: contado | credito
metodo_pago: efectivo | tarjeta_credito | tarjeta_debito | transferencia | deposito
estado_compra: borrador | enviada | recibida | cancelada
estado_caja: abierta | cerrada | reabierta
estado_notificacion: enviado | fallido | reintento
tipo_garantia: producto_nuevo | servicio | usado
preferencia_contacto: whatsapp | correo | llamada
tipo_equipo: laptop | desktop | all_in_one | periferico | componente | otro
estado_solicitud (VARCHAR): pendiente | aprobada | entregada | rechazada | cancelada
estado_sustitucion (VARCHAR): pendiente | aceptada | rechazada | cancelada
```

## Tables

```
usuarios(id, nombre, usuario UNIQUE, password_hash, rol, is_active)
refresh_tokens(id, usuario_id FK CASCADE, jti UUID UNIQUE, token_hash, expires_at, revoked)
clientes(id, nombre, telefono NOT NULL, correo, direccion, preferencia_contacto, limite_credito DEFAULT 3000, plazo_credito_dias DEFAULT 15, etiquetas JSONB, is_active)
catalogos(id, parent_id FK CASCADE (árbol máx 4 niveles), nombre, tags_sugeridas JSONB, tags_compatibilidad JSONB) UNIQUE(parent_id,nombre) y UNIQUE(nombre) raíz
productos(id, categoria_id FK→catalogos RESTRICT (raíz, trigger check_categoria_es_raiz), catalogo_id FK SET NULL, sku UNIQUE, codigo_barras UNIQUE, nombre, marca, modelo, precio_compra, precio_venta, stock CHECK>=0, stock_minimo, stock_maximo, proveedor_favorito_id FK SET NULL, especificaciones JSONB tags, is_kit, mano_obra, is_active)
producto_bom(id, kit_producto_id FK CASCADE, componente_id FK RESTRICT, cantidad) UNIQUE(kit, componente)
precio_historial(id, producto_id FK CASCADE, precio_compra, precio_venta, usuario_id, changed_at)
ordenes_servicio(id, cliente_id FK RESTRICT, folio UNIQUE, tipo_equipo, marca, modelo, serie, accesorios, falla_reportada, diagnostico, estado, retrasada, fecha_prometida, fecha_entrega, tecnico_id, vendedor_id, firma_recepcion TEXT PNG-base64)
historial_orden(id, orden_id FK CASCADE, estado, usuario_id, nota, created_at)
cotizaciones(id, orden_id FK CASCADE, folio UNIQUE, estado, subtotal, iva, total, vigencia_desde, vigencia_hasta, creada_por)
detalle_cotizacion(id, cotizacion_id FK CASCADE, tipo_linea, producto_id, cantidad, precio_neto, descripcion_mano_obra, horas, tarifa_hora)
sustituciones(id, orden_id FK CASCADE, cotizacion_id FK CASCADE, linea_id FK CASCADE, producto_original_id FK, cantidad, sustituto_id FK, justificacion, cliente_acepta, estado VARCHAR, solicitud_id FK SET NULL, creada_por, resuelto_por, created_at, resuelto_at)
detalle_orden(id, orden_id FK CASCADE, producto_id FK RESTRICT, cantidad, estado_linea DEFAULT 'cotizada', costo_unitario)
ventas(id, folio UNIQUE, cliente_id, vendedor_id, orden_id, subtotal, iva, total, descuento, motivo_descuento, tipo_pago, metodo_pago, plazo_dias, fecha_vencimiento, monto_recibido, estado, caja_id)
detalle_venta(id, venta_id FK CASCADE, producto_id, cantidad, precio_neto, descuento_linea, descripcion_servicio)
proveedores(id, nombre, contacto, condiciones_pago, is_active)
compras(id, proveedor_id FK RESTRICT, folio UNIQUE, estado, total_neto, fecha_vencimiento, creada_por)
detalle_compra(id, compra_id FK CASCADE, producto_id, cantidad, precio_unitario)
solicitudes_reabastecimiento(id, producto_id FK CASCADE, cantidad, orden_id FK SET NULL, solicitado_por, motivo, estado VARCHAR, rechazo_motivo, compra_id FK SET NULL, resuelto_por, created_at, resuelto_at)
movimientos_inventario(id, producto_id FK RESTRICT, tipo, cantidad CHECK<>0, referencia_id, referencia_tipo, usuario_id, caja_id, motivo)
pagos(id, venta_id FK RESTRICT, monto, metodo, usuario_id, caja_id)
pagos_proveedor(id, compra_id FK RESTRICT, monto, metodo, usuario_id)
cajas(id, usuario_id, fecha, estado, efectivo_fisico, diferencia, apertura, cierre) UNIQUE(usuario_id, fecha)
notificaciones(id, cliente_id, orden_id, cotizacion_id, tipo, canal, estado, contenido, error)
plantillas_notificacion(id, tipo UNIQUE, asunto, cuerpo)
garantias(id, venta_id, orden_id, cliente_id, tipo, inicio, fin)
configuracion(clave PK, valor JSONB)
auditoria(id, usuario_id, accion, entidad, entidad_id, antes JSONB, despues JSONB)
```

## Indexes (clave)

```
TABLE       INDEX                                COLUMNS                          TYPE      RAZÓN
productos   idx_productos_especificaciones_gin    (especificaciones)               GIN       sugerencias/sustitutos por tags
productos   idx_productos_catalogo                (catalogo_id)                    B-tree    filtro por catálogo (árbol)
productos   idx_productos_proveedor_favorito      (proveedor_favorito_id)          B-tree    reabastecimiento
productos   idx_productos_codigo_barras           (codigo_barras)                  UNIQUE    escaneo POS
clientes    idx_clientes_telefono                 (telefono)                       UNIQUE    búsqueda tienda
ordenes     idx_ordenes_folio                     (folio)                          UNIQUE    SER-13
ordenes     idx_ordenes_retraso                   (fecha_prometida) WHERE retrasada=false PARTIAL  worker NOT-01
detalle_orden idx_detalle_orden_reserva           (producto_id) WHERE estado_linea='reservada' PARTIAL  validación reservas
sustituciones idx_sustituciones_orden             (orden_id)                       B-tree    sustituciones por orden
solicitudes_reabastecimiento idx_solicitudes_estado (estado)                      B-tree    cola admin
solicitudes_reabastecimiento idx_solicitudes_producto (producto_id)               B-tree    "Ya en OC" / entregada
ventas      idx_ventas_credito_vencimiento        (fecha_vencimiento) WHERE tipo_pago='credito' PARTIAL  CxC vencidas
refresh_tokens idx_refresh_tokens_usuario         (usuario_id)                    B-tree    rotación/revocación
cajas       idx_cajas_usuario_fecha               (usuario_id, fecha)              UNIQUE    1 caja/usuario/día
garantias   idx_garantias_fin                     (fin) WHERE fin > NOW()           PARTIAL   worker NOT-04
```

## Notes
- Stock: CHECK(stock>=0) + FOR UPDATE; reserva en detalle_orden.estado_linea (no tabla aparte).
- `estado_orden` es ENUM (con `sustitucion_pendiente` vía ALTER TYPE ADD VALUE); `estado_solicitud`/`estado_sustitucion` son VARCHAR controlados por la API.
- Dinero NUMERIC(19,4); redondeo solo en impresión. CxC/CxP derivadas (total − Σ pagos).
- Soft delete is_active en usuarios/clientes/productos/proveedores. Taxonomía unificada: categoría = raíz de `catalogos` (trigger `check_categoria_es_raiz`).
