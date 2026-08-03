# Reglas de Negocio — Sistema de Administración (Tienda de Cómputo)

> Fuente: decisiones confirmadas + `main-planning.md`. Formato: `condición → acción`. Prioridad de aplicación: verificar en el orden de este documento dentro de cada flujo.

---

## 1. Moneda e Impuestos

| Regla | Definición |
|-------|------------|
| BR-MON-01 | Moneda única: **MXN**. |
| BR-MON-02 | Los precios se registran **sin IVA** (netos) en catálogo, cotizaciones, compras y costos. |
| BR-MON-03 | Al momento de la venta se calcula **IVA 16%** sobre el subtotal neto. |
| BR-MON-04 | El ticket muestra: subtotal neto, IVA (16%), total. Totales de corte de caja agregan por separado. |
| BR-MON-05 | Montos monetarios en BD como `NUMERIC(19,4)`, redondeo final a 2 decimales en impresión. |

## 2. Catálogo de Productos

| Regla | Definición |
|-------|------------|
| BR-PRD-01 | Todo producto tiene `sku` único. El código de barras es único si se captura. |
| BR-PRD-02 | Precio de compra y precio de venta > 0. `stock_minimo` >= 0. |
| BR-PRD-03 | Categorías fijas por tipo: `componente`, `periférico`, `equipo_completo`, `refaccion`, `usado`. |
| BR-PRD-04 | Baja de producto es **lógica** (`is_active=false`). No se elimina si tiene movimientos, ventas u órdenes. |
| BR-PRD-05 | Cambios de precio quedan auditados (historial con usuario, fecha, valor anterior/nuevo). |
| BR-PRD-06 | Un producto está en `low_stock` si `stock <= stock_minimo`. |

## 3. Inventario y Stock

| Regla | Definición |
|-------|------------|
| BR-INV-01 | **No se permite stock negativo.** El sistema bloquea la venta/consumo si la cantidad excede el stock disponible. |
| BR-INV-02 | Toda entrada o salida de inventario genera un `Movimiento` (tipo: `ENTRADA`, `SALIDA_VENTA`, `SALIDA_CONSUMO`, `AJUSTE`, `DEVOLUCION`, `RESERVA`, `LIBERACION`). |
| BR-INV-03 | **Reserva al aprobar cotización:** al aprobarse una cotización de servicio, se reserva el stock de las piezas cotizadas. |
| BR-INV-04 | **Descuento al consumir:** el inventario se descuenta cuando el técnico registra las piezas consumidas (no al reservar). |
| BR-INV-05 | La reserva se mantiene mientras la orden esté en `en_reparacion`; al pasar a `listo` la reserva se convierte en consumo efectivo. |
| BR-INV-06 | Si la orden se **cancela** o la cotización **expira**, las reservas se liberan (stock vuelve a disponible). |
| BR-INV-07 | Un ajuste de inventario (`AJUSTE`) requiere motivo obligatorio y sólo lo ejecuta el **admin**. |
| BR-INV-08 | Devolución con restitución de stock: al aceptar devolución de producto completo/sellado, `stock += cantidad`. |
| BR-INV-09 | La venta de un ensamblado (BOM) descuenta el stock de **cada componente** del kit, no un item genérico. |

## 4. Máquina de Estados de Orden de Servicio

```
pendiente → en_diagnostico → cotizado → en_reparacion → listo → entregado
                 │  └────────────┘      │                    │
                 └─────── cancelado ◄───┴────────────────────┘
```

| Transición | Quién | Condición adicional |
|------------|-------|---------------------|
| `pendiente → en_diagnostico` | Técnico | — |
| `en_diagnostico → cotizado` | Técnico | Debe existir cotización con líneas válidas |
| `en_diagnostico → cancelado` | Vendedor/Admin | Motivo obligatorio |
| `cotizado → en_reparacion` | Técnico | Cotización aprobada por el cliente |
| `cotizado → cancelado` | Vendedor/Admin | Cotización rechazada o expirada; libera reservas |
| `en_reparacion → listo` | Técnico | Reservas convertidas a consumo; mano de obra registrada |
| `listo → entregado` | Vendedor | Cobro completado o CxC registrada; firma de recepción |
| `listo → cancelado` | Admin | Motivo obligatorio; reversión de consumo (sólo admin) |
| `en_reparacion → en_diagnostico` | Técnico | Si se requiere nueva cotización adicional |

- Todo cambio de estado se registra en `historial_orden` con usuario, fecha y nota.
- **BR-SER-01 (Firma de recepción):** la entrega (SER-10) captura la firma del cliente en un **canvas táctil** que se guarda como **PNG en base64** en `ordenes_servicio.firma_recepcion`. Si el equipo no tiene pantalla táctil, el vendedor puede usar el mouse; la firma es obligatoria para cerrar la orden en estado `entregado`.

## 5. Retrasos y Notificaciones

| Regla | Definición |
|-------|------------|
| BR-RET-01 | La orden se marca `retrasada` cuando **`fecha_prometida + 1 día calendario < fecha_actual`** (incluye domingo) y estado ∉ {`entregado`, `cancelado`}. |
| BR-RET-02 | Job de retrasos: revisión **cada hora**; tolerancia de **1 día calendario (lun–dom)**; se notifica el día siguiente a exceder `fecha_prometida`. |
| BR-RET-03 | Al detectar retraso se notifica por el **canal preferido** del cliente (WhatsApp > correo > llamada). |
| BR-RET-04 | Si no hay correo ni WhatsApp registrados, la notificación se convierte en tarea de llamada para el vendedor. |
| BR-RET-05 | NOT-02 (equipo listo) y NOT-03 (cotización lista) se disparan manualmente por el vendedor; NOT-01 y NOT-04 automáticas. |
| BR-RET-06 | Toda notificación se registra en `Notificacion` con canal, estado (enviado/fallido/reintento) y payload. |
| BR-RET-07 | WhatsApp se integra vía **API real (Twilio)**, con plantillas aprobadas por Meta; fallback a correo si la API falla. |

## 6. Cotizaciones (Servicio y Venta)

| Regla | Definición |
|-------|------------|
| BR-COT-01 | Toda cotización tiene folio propio y **vigencia de 7 días** desde su emisión. |
| BR-COT-02 | Cotización de servicio: líneas de refacciones (validadas vs stock) + mano de obra (tiempo × tarifa) + IVA. |
| BR-COT-03 | Cotización de venta: productos/servicios + descuento autorizado + IVA. |
| BR-COT-04 | Sólo se convierte en venta si está **aprobada** y **dentro de vigencia**. |
| BR-COT-05 | Si faltan piezas para una cotización, se marca `pendiente_compra` y se registra la pieza faltante como pendiente. |
| BR-COT-06 | Piezas en cotización **no** se reservan; la reserva ocurre al **aprobar** (BR-INV-03). |

## 7. Ventas y Cobro

| Regla | Definición |
|-------|------------|
| BR-VEN-01 | La venta descuenta stock en el momento de completarse (SALIDA_VENTA). Bloqueada si no hay stock (BR-INV-01). |
| BR-VEN-02 | Métodos de pago: `efectivo`, `tarjeta_credito`, `tarjeta_debito`, `transferencia`, `deposito`. Una venta puede tener pagos mixtos. |
| BR-VEN-03 | En efectivo se calcula el cambio; el registro guarda monto recibido. |
| BR-VEN-04 | El ticket se emite al completar la venta; formato ESC/POS 80mm; reimpresión se marca "COPIA". |
| BR-VEN-05 | **Descuentos:** vendedor puede aplicar hasta **10%** sin autorización. Descuentos >10% requieren rol **admin**. |
| BR-VEN-06 | Todo descuento requiere motivo; queda registrado en la venta. |
| BR-VEN-07 | Cancelación de venta: sólo del mismo día o con autorización admin; reversión de inventario; motivo obligatorio. |
| BR-VEN-08 | Devolución: dentro de **15 días** desde la venta y con ticket; reembolso por método original o nota de crédito; restituye stock si producto completo/sellado; registra `DEVOLUCION`. |

## 8. Crédito (Cuentas por Cobrar)

| Regla | Definición |
|-------|------------|
| BR-CRE-01 | La venta a crédito está sujeta a **límite de crédito** y **plazo** configurados por cliente. Default al registrar cliente: **límite $3,000 MXN**, ampliable individualmente. |
| BR-CRE-02 | Se bloquea la venta a crédito si `saldo_adeudado + monto_venta > limite_credito`. |
| BR-CRE-03 | Plazo por defecto: **15 días** desde la venta (configurable por cliente). |
| BR-CRE-04 | Un cliente con saldo **vencido** se segmenta automáticamente como `deudor` (CRM-06). |
| BR-CRE-05 | Abonos y pagos completos registran un `Pago` ligado a la venta; la CxC pasa a `pagado` cuando saldo = 0. |
| BR-CRE-06 | La entrega de una orden de servicio a crédito queda sujeta a BR-CRE-02 (no superar límite). |

## 9. Garantías

| Regla | Definición |
|-------|------------|
| BR-GAR-01 | Períodos por defecto, configurables por tipo: **producto nuevo 30 días · servicio 30 días · usado 15 días**. |
| BR-GAR-02 | La garantía inicia en la fecha de entrega/venta. |
| BR-GAR-03 | La garantía cubre la reparación del defecto cubierto; las reparaciones en garantía no generan cargo por mano de obra ni piezas. |
| BR-GAR-04 | Job diario: notifica (NOT-04) a 3 y 1 días antes del vencimiento, según canal preferido. |
| BR-GAR-05 | Una reclamación de garantía se registra como queja (CRM-07) vinculada a la garantía. |

## 10. Compras y Cuentas por Pagar

| Regla | Definición |
|-------|------------|
| BR-COM-01 | Orden de compra: estados `borrador → enviada → recibida` (y `cancelada`). |
| BR-COM-02 | Al registrar la entrada de mercancía: `stock += cantidad` y se genera `Movimiento ENTRADA` con el costo de compra. |
| BR-COM-03 | La recepción genera la CxP por el monto total neto de la compra (sin IVA); pagos parciales permitidos. |
| BR-COM-04 | Comparación de precios usa el historial de compras por producto/proveedor. |
| BR-COM-05 | Solo el **admin** crea/recibe órdenes de compra. |

## 11. Caja (Corte y Cierre)

| Regla | Definición |
|-------|------------|
| BR-CAJ-01 | Cada usuario tiene una **caja abierta** por día; los movimientos del día se asignan a la caja del usuario que los registró. |
| BR-CAJ-02 | El **corte de caja** es por usuario y resume entradas/salidas del día con totales por método de pago. |
| BR-CAJ-03 | El **cierre de caja** requiere arqueo: se captura efectivo físico y se calcula la diferencia vs sistema. |
| BR-CAJ-04 | Al cerrar la caja, el usuario no puede registrar nuevas ventas en esa caja hasta abrir una nueva. |
| BR-CAJ-05 | Un admin puede reabrir una caja cerrada sólo con autorización y registro de motivo. |

## 12. Roles y Permisos

| Regla | Definición |
|-------|------------|
| BR-ROL-01 | Roles: `admin`, `vendedor`, `tecnico`. Un usuario tiene exactamente un rol. |
| BR-ROL-02 | `admin`: todo. `vendedor`: CRM, órdenes (crear/entregar), ventas, cobros, notificaciones, corte de caja. `tecnico`: diagnóstico, estados, consumo de piezas, mano de obra. |
| BR-ROL-03 | Ajustes de inventario, cancelación de ventas fuera de plazo, cierre de caja, configuración, usuarios y reportes avanzados: **solo admin**. |
| BR-ROL-04 | Descuentos >10%: requiere rol `admin` (BR-VEN-05). |
| BR-ROL-05 | Toda operación crítica (venta, ajuste, cancelación, cierre de caja, descuento >5%) se registra en auditoría con usuario, fecha, antes/después. |

## 13. Retención de Datos y Respaldo

| Regla | Definición |
|-------|------------|
| BR-DAT-01 | Respaldo automático **diario** de la base de datos (cron + almacenamiento externo). |
| BR-DAT-02 | Se conservan: órdenes, ventas, movimientos, notificaciones y auditoría **indefinidamente** (historial comercial y de garantías). |
| BR-DAT-03 | Baja lógica de clientes/productos; nunca se eliminan registros con historial. |

---

> **Referencias:** estados y funcionalidades en `main-planning.md`; historias de usuario en `02-product-backlog.md`.
