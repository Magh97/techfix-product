# SCHEMA

Fuente completa con atributos: `docs/05-data-model.md`. Resumen ejecutivo para agentes.

## Enums

```
rol: admin | vendedor | tecnico
tipo_producto: componente | periferico | equipo_completo | refaccion | usado
movimiento_tipo: ENTRADA | SALIDA_VENTA | SALIDA_CONSUMO | AJUSTE | DEVOLUCION | RESERVA | LIBERACION
estado_orden: pendiente | en_diagnostico | cotizado | en_reparacion | listo | entregado | cancelado
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
```

## Tables (resumen)

```
usuarios(id, nombre, usuario UNIQUE, password_hash, rol, is_active)
clientes(id, nombre, telefono NOT NULL, correo, direccion, preferencia_contacto, limite_credito NUMERIC(19,4) DEFAULT 3000, plazo_credito_dias DEFAULT 15, etiquetas JSONB, is_active)
proveedores(id, nombre, contacto, condiciones_pago, is_active)
categorias(id, nombre, tipo)
productos(id, categoria_id FK RESTRICT, sku UNIQUE, codigo_barras UNIQUE, nombre, marca, modelo, precio_compra, precio_venta, stock CHECK>=0, stock_minimo, is_kit, is_active)
producto_bom(id, kit_producto_id FK CASCADE, componente_id FK RESTRICT, cantidad) UNIQUE(kit, componente)
precio_historial(id, producto_id FK CASCADE, precio_compra, precio_venta, usuario_id, changed_at)
ordenes_servicio(id, cliente_id FK RESTRICT, folio UNIQUE, tipo_equipo, marca, modelo, serie, accesorios, falla_reportada, diagnostico, estado, retrasada, fecha_prometida, fecha_entrega, tecnico_id, vendedor_id, firma_recepcion TEXT PNG-base64)
historial_orden(id, orden_id FK CASCADE, estado, usuario_id, nota, created_at)
cotizaciones(id, orden_id FK CASCADE, folio UNIQUE, estado, subtotal, iva, total, vigencia_desde, vigencia_hasta, creada_por)
detalle_cotizacion(id, cotizacion_id FK CASCADE, tipo_linea, producto_id, cantidad, precio_neto, descripcion_mano_obra, horas, tarifa_hora)
detalle_orden(id, orden_id FK CASCADE, producto_id FK RESTRICT, cantidad, estado_linea DEFAULT 'cotizada', costo_unitario)
ventas(id, folio UNIQUE, cliente_id, vendedor_id, orden_id, subtotal, iva, total, descuento, motivo_descuento, tipo_pago, metodo_pago, plazo_dias, fecha_vencimiento, monto_recibido, estado, caja_id)
detalle_venta(id, venta_id FK CASCADE, producto_id, cantidad, precio_neto, descuento_linea, descripcion_servicio)
compras(id, proveedor_id FK RESTRICT, folio UNIQUE, estado, total_neto, fecha_vencimiento, creada_por)
detalle_compra(id, compra_id FK CASCADE, producto_id, cantidad, precio_unitario)
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
TABLE        INDEX                         COLUMNS                    TIPO      RAZÓN
productos    idx_productos_codigo_barras    (codigo_barras)            UNIQUE    escaneo POS
productos    idx_productos_low_stock        (stock_minimo, stock)      B-tree    alertas
clientes     idx_clientes_telefono          (telefono)                 UNIQUE    búsqueda tienda
ordenes      idx_ordenes_folio              (folio)                    UNIQUE    SER-13
ordenes      idx_ordenes_retraso            (fecha_prometida) WHERE retrasada=false PARTIAL  job NOT-01
ordenes      idx_ordenes_cliente_estado     (cliente_id, estado)       B-tree    historial
detalle_orden idx_detalle_orden_reserva     (producto_id) WHERE estado_linea='reservada' PARTIAL  validación reservas
ventas       idx_ventas_folio               (folio)                    UNIQUE    reimpresión
ventas       idx_ventas_credito_vencimiento (fecha_vencimiento) WHERE tipo_pago='credito' PARTIAL  CxC vencidas
movimientos  idx_mov_producto_fecha         (producto_id, created_at DESC) B-tree  INV-06
cajas        idx_cajas_usuario_fecha        (usuario_id, fecha)        UNIQUE    1 caja/usuario/día
garantias    idx_garantias_fin              (fin) WHERE fin > NOW()    PARTIAL   job NOT-04
```

## Notes
- Stock: CHECK(stock>=0) + FOR UPDATE; reserva en detalle_orden.estado_linea (no tabla aparte).
- Dinero NUMERIC(19,4); redondeo solo en impresión. Precios netos; IVA derivado.
- CxC/CxP derivadas (total − Σ pagos), con fecha_vencimiento; sin tablas de saldos.
- Soft delete is_active en usuarios/clientes/productos/proveedores. Nada de borrado físico con historial.
