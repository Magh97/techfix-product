# Product Backlog — Sistema de Administración (Tienda de Cómputo)

> Fuente: `main-planning.md` · Stack: React + Node/Express + PostgreSQL · Convención de IDs: `US-<MODULO>-<NN>`.
> Prioridad: **P0** (Fase 1 MVP) · **P1** (Fase 2) · **P2** (Fase 3) · **P3** (Futuro).
> Cada historia incluye criterios de aceptación verificables. Formato de respuesta API y validaciones según convenciones del sistema.

---

## Módulo: Inventario

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-INV-01 | Como **vendedor** quiero registrar un producto con nombre, categoría, marca, modelo, código de barras, precios y stock mínimo para tenerlo disponible en venta. | Producto creado con `sku` único; código de barras único o vacío; precio compra/venta > 0; `stock=0` inicial; respuesta `201`. | P0 |
| US-INV-02 | Como **vendedor** quiero editar un producto para corregir datos o precios. | Solo productos activos editables; cambio de precio registra auditoría; `updated_at` se actualiza. | P0 |
| US-INV-03 | Como **admin** quiero desactivar un producto discontinuado para que no aparezca en venta. | Baja lógica (`is_active=false`); no editable ni vendible; se conserva historial. | P0 |
| US-INV-04 | Como **vendedor** quiero consultar stock en tiempo real con alerta de stock mínimo para decidir si vendo. | Lista con stock actual y flag `low_stock` cuando `stock <= stock_minimo`; filtros por categoría/marca/búsqueda. | P0 |
| US-INV-05 | Como **admin** quiero ajustar inventario por daño/merma/físico para corregir existencias. | Requiere motivo; genera `Movimiento` tipo `AJUSTE`; no afecta precios; sólo admin. | P1 |
| US-INV-06 | Como **admin** quiero ver el historial de movimientos de un producto para auditar entradas/salidas. | Lista paginada de `Movimiento` por producto, tipo, fecha, usuario, referencia. | P1 |
| US-INV-07 | Como **vendedor** quiero registrar un equipo usado recibido en parte de pago o reparación. | Alta con estado `USADO`; puede vincularse a orden de servicio; inventario propio de usados. | P1 |
| US-INV-08 | Como **vendedor** quiero categorizar productos para organizar el catálogo. | Categorías: componentes, periféricos, equipos completos, refacciones; editable por admin. | P1 |
| US-INV-09 | Como **admin** quiero importar productos masivamente desde un archivo CSV/Excel. | Plantilla descargable; acepta `.csv` y `.xlsx`; filas validadas con las mismas reglas del alta; duplicados por `sku`/`codigo_barras` se saltan; respuesta con `{ importados, omitidos[], errores[] }` por número de fila; solo admin. | P2 |

## Módulo: CRM

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-CRM-01 | Como **vendedor** quiero registrar un cliente con teléfono, correo, dirección y preferencia de contacto para poder atenderlo. | Teléfono obligatorio; correo opcional validado; `preferencia_contacto` en (whatsapp, correo, llamada); `201`. | P0 |
| US-CRM-02 | Como **vendedor** quiero buscar un cliente por nombre, teléfono o correo para ubicarlo rápido en tienda. | Búsqueda parcial case-insensitive; resultados con duplicados marcados. | P0 |
| US-CRM-03 | Como **vendedor** quiero editar datos de contacto de un cliente. | Validaciones iguales al alta; se conserva historial. | P0 |
| US-CRM-04 | Como **vendedor** quiero ver el historial completo del cliente (órdenes, compras, cotizaciones) para dar mejor servicio. | Secciones por tipo; ordenado por fecha desc; paginado; muestra saldo de CxC pendiente. | P0 |
| US-CRM-05 | Como **vendedor** quiero registrar el canal preferido de contacto para notificar correctamente. | Modifica `preferencia_contacto`; usado por NOT-01/NOT-03. | P1 |
| US-CRM-06 | Como **admin** quiero segmentar clientes (frecuente, ocasional, corporativo, deudor) para campañas/reportes. | Etiqueta manual + automática (deudor si saldo vencido); filtrable. | P1 |
| US-CRM-07 | Como **vendedor** quiero registrar quejas o garantías post-servicio para dar seguimiento. | Vínculo a orden/venta; estado abierto → resuelto; visible en historial. | P1 |

## Módulo: Servicios Técnicos

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-SER-01 | Como **vendedor** quiero crear una orden de servicio con datos del equipo y falla reportada para iniciar la reparación. | Cliente existente obligatorio; tipo/marca/modelo/serie, accesorios, falla; `folio` único automático; estado inicial `pendiente`; fecha prometida por defecto según tipo de servicio. | P0 |
| US-SER-02 | Como **vendedor** quiero que el sistema genere un folio único para rastrear la orden. | Folio correlativo por año (ej. `2026-000123`); inmutable. | P0 |
| US-SER-03 | Como **técnico** quiero registrar el diagnóstico del problema para decidir la reparación. | Requiere estado `en_diagnostico`; descripción obligatoria; permite "pendiente de compra" si faltan piezas. | P0 |
| US-SER-04 | Como **técnico** quiero generar una cotización con mano de obra + refacciones para aprobación. | Líneas: piezas (validadas vs stock) + mano de obra (tiempo × tarifa); subtotal + IVA; vigencia 7 días; estado `cotizado`. | P0 |
| US-SER-05 | Como **vendedor** quiero enviar la cotización al cliente para su aprobación presencial. | Notificación vía canal preferido; registro en historial; aprobar/rechazar. | P0 |
| US-SER-06 | Como **técnico** quiero ejecutar la reparación consumiendo piezas del inventario. | Solo con cotización aprobada; piezas reservadas al aprobar; consumo descuenta inventario; reserva liberada al finalizar. | P0 |
| US-SER-07 | Como **técnico** quiero registrar mano de obra (tiempo y costo) para facturar el trabajo. | Horas y tarifa; total calculado; visible en cotización y venta. | P0 |
| US-SER-08 | Como **técnico** quiero actualizar el estado de la orden para reflejar el avance. | Transiciones permitidas por máquina de estados; registro de historial con usuario y fecha. | P0 |
| US-SER-09 | Como **sistema** quiero detectar retrasos automáticamente para notificar al cliente. | Job cada hora; marca `retrasada` si `fecha_prometida < now` y estado ∉ {entregado, cancelado}; dispara NOT-01. | P0 |
| US-SER-10 | Como **vendedor** quiero entregar el equipo y cerrar la orden con firma de recepción. | Requiere cobro registrado (venta) o cuenta por cobrar; firma capturada; estado `entregado`; genera garantía de servicio 30 días. | P0 |
| US-SER-11 | Como **vendedor** quiero registrar la garantía de servicio para cubrir el post-reparación. | Período default 30 días desde entrega; registrable en `Garantia`; NOT-04 la recuerda. | P1 |
| US-SER-12 | Como **técnico** quiero ensamblar una PC seleccionando componentes del inventario. | Se define BOM del kit; la venta desglosa componentes y descuenta stock de cada uno; incluye mano de obra de ensamble. | P1 |
| US-SER-13 | Como **vendedor** quiero consultar el estado de una orden por folio para atender al cliente. | Búsqueda por folio/teléfono; muestra estado actual, fecha prometida y retraso. | P0 |

## Módulo: Ventas (Punto de Venta)

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-VEN-01 | Como **vendedor** quiero vender productos del inventario para completar la venta. | Bloquea si stock insuficiente; escaneo por código de barras; cantidades editables. | P0 |
| US-VEN-02 | Como **vendedor** quiero cobrar un servicio concluido para facturar la reparación. | Venta ligada a orden `listo`; incluye mano de obra y piezas consumidas. | P0 |
| US-VEN-03 | Como **vendedor** quiero vender una PC ensamblada para completar la venta. | BOM desglosado; descuenta componentes; precio = suma componentes + mano de obra. | P1 |
| US-VEN-04 | Como **vendedor** quiero generar una cotización de venta sin compromiso. | Folio propio, vigencia, líneas con subtotal/IVA; convertible a venta. | P1 |
| US-VEN-05 | Como **vendedor** quiero convertir una cotización aprobada en venta. | Valida vigencia; descuenta stock; genera `Venta` y ticket. | P1 |
| US-VEN-06 | Como **vendedor** quiero aplicar un descuento autorizado. | Vendedor ≤10%; >10% requiere admin; motivo obligatorio; registrado en la venta. | P1 |
| US-VEN-07 | Como **vendedor** quiero registrar el método de pago para cobrar. | Métodos: efectivo, tarjeta, transferencia, depósito; efectivo puede registrar cambio. | P0 |
| US-VEN-08 | Como **vendedor** quiero registrar una venta a crédito respetando límite y plazo del cliente. | Verifica límite de crédito y saldo vigente; genera CxC con vencimiento; bloquea si excede. | P1 |
| US-VEN-09 | Como **vendedor** quiero generar un ticket de compra con folio y desglose para entregar al cliente. | Impresión ESC/POS 80mm; folio, fecha, productos/servicios, cantidades, precios, subtotal, IVA 16%, total, garantía. | P0 |
| US-VEN-10 | Como **vendedor** quiero reimprimir un ticket para emitir copia. | Consulta por folio; mismo formato; marca "copia". | P1 |
| US-VEN-11 | Como **admin** quiero cancelar una venta registrando el motivo. | Solo ventas del día o con autorización; reversión de inventario; motivo obligatorio; afecta finanzas. | P2 |
| US-VEN-12 | Como **vendedor** quiero registrar una devolución dentro de 15 días con ticket. | Ticket válido, dentro de 15 días; restituye stock si completo/sellado; reembolso por método original o nota de crédito. | P2 |

## Módulo: Compras

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-COM-01 | Como **admin** quiero registrar proveedores con productos y condiciones de pago. | Alta con contacto; productos que surte; condiciones de pago. | P1 |
| US-COM-02 | Como **admin** quiero editar proveedores para mantener datos vigentes. | Edición de contacto y condiciones; historial. | P1 |
| US-COM-03 | Como **admin** quiero crear una orden de compra con cantidades y precios. | Estados: borrador → enviada → recibida; precios netos; genera CxP al recibir. | P1 |
| US-COM-04 | Como **admin** quiero registrar la entrada de mercancía para actualizar inventario. | Al recibir: stock += cantidad; genera `Movimiento ENTRADA` con costo; vincula a compra. | P1 |
| US-COM-05 | Como **admin** quiero comparar precios entre proveedores para negociar. | Historial de compras por producto/proveedor; tablas comparativas. | P2 |
| US-COM-06 | Como **admin** quiero registrar cuentas por pagar para controlar pagos a proveedores. | CxC/CxP por compra; pagos parciales; saldo vigente. | P2 |

## Módulo: Finanzas

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-FIN-01 | Como **vendedor** quiero registrar ingresos (ventas, servicios, otros) para llevar control. | Vinculado a venta/pago o ingreso manual con concepto; fecha y caja asignada. | P0 |
| US-FIN-02 | Como **admin** quiero registrar egresos (compras, gastos, renta) para controlar gastos. | Concepto, categoría, proveedor opcional, método de pago. | P0 |
| US-FIN-03 | Como **vendedor** quiero hacer el corte de caja diario para conciliar entradas/salidas. | Resumen por usuario del día; totales por método de pago; solo caja abierta del usuario. | P0 |
| US-FIN-04 | Como **admin** quiero cerrar la caja con arqueo (efectivo contado vs sistema) para cuadrar. | Captura de efectivo físico; diferencia calculada; bloquea nuevas ventas del turno al cerrar. | P2 |
| US-FIN-05 | Como **admin** quiero consultar movimientos por fecha, tipo, usuario y categoría. | Filtros combinables; exportable. | P2 |
| US-FIN-06 | Como **vendedor** quiero ver cuentas por cobrar con vencimientos para cobrar. | Saldos por cliente; estados vigente/vencido/pagado; abonos registran `Pago`. | P2 |
| US-FIN-07 | Como **admin** quiero ver cuentas por pagar para programar pagos a proveedores. | Saldos por proveedor; pagos parciales; vencimientos. | P2 |

## Módulo: Reportes

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-REP-01 | Como **admin** quiero el reporte de inventario con valoración y stock bajo. | Existencias, costo total, stock mínimo; alertas. | P1 |
| US-REP-02 | Como **admin** quiero el reporte de ventas por período/producto/vendedor/pago. | Filtros por rango, agrupaciones; totales. | P1 |
| US-REP-03 | Como **admin** quiero el reporte de servicios por estado/técnico/falla/tiempos. | Órdenes por estado, técnico, tipo de falla, tiempo promedio de reparación. | P1 |
| US-REP-08 | Como **admin** quiero exportar reportes y el catálogo a CSV/Excel. | Botón de exportación fiel a los filtros aplicados en inventario, ventas y servicios; formatos CSV y XLSX. | P1 |
| US-REP-04 | Como **admin** quiero el reporte de rentabilidad por producto/servicio/período. | Margen = venta − costo; por línea y agregado. | P2 |
| US-REP-05 | Como **admin** quiero el reporte de clientes (frecuentes, ticket promedio, deudores). | Top clientes, ticket promedio, saldos. | P2 |
| US-REP-06 | Como **admin** quiero el reporte financiero (ingresos vs egresos, utilidad, flujo). | Acumulados por mes; utilidad neta. | P2 |
| US-REP-07 | Como **admin** quiero exportar reportes a Excel/PDF. | Exportación fiel al filtro aplicado. | P2 |

## Módulo: Notificaciones

| ID | Historia | Criterios de Aceptación | Prio |
|----|----------|-------------------------|------|
| US-NOT-01 | Como **sistema** quiero notificar automáticamente el retraso de una orden por WhatsApp/correo. | Disparado por SER-09; usa canal preferido; fallback a llamada si sin contacto; registra en historial. | P1 |
| US-NOT-02 | Como **vendedor** quiero notificar que el equipo está listo. | Envío manual desde la orden en estado `listo`; plantilla NOT-02. | P0 |
| US-NOT-03 | Como **vendedor** quiero notificar que la cotización está lista para aprobación. | Al pasar a `cotizado`; enlace/folio en mensaje. | P1 |
| US-NOT-04 | Como **sistema** quiero recordar la garantía antes de que venza. | Job diario; 3 y 1 días antes de vencimiento; según preferencia. | P2 |
| US-NOT-05 | Como **admin** quiero configurar plantillas de mensaje. | CRUD de plantillas por tipo con variables (`{folio}`, `{fecha}`...). | P2 |
| US-NOT-06 | Como **admin** quiero ver el historial de notificaciones enviadas. | Estado del envío (enviado/fallido/reintento), canal, fecha, error. | P2 |

---

## Notas de Definición de Hecho
- Toda historia cumple: API validada con Zod, tests, migración de BD, registro en changelog.
- `[ASSUMED]`: límite de crédito default = **$3,000 MXN** (ampliable por cliente); plazo default **15 días**; tolerancia de retraso = **1 día calendario (incluye domingo)**, se notifica el día siguiente a exceder la fecha prometida.
- `[NOTA]` US-SER-09: el worker horario que marca retrasadas está implementado (no dispara NOT-01, que es P1 y queda pendiente del ADR-0007/Twilio).
- `[NOTA]` US-VEN-09: el ticket se muestra en pantalla con formato térmico 80mm e imprime vía `window.print()` (`@media print` aísla el recibo); la reimpresión desde Ventas sale marcada "COPIA" (US-VEN-10).
- `[NOTA]` US-COM-03/04: se implementó la **recepción parcial por línea de OC** — `POST /compras/:id/recibir` con body `{ lineas: [{ detalleCompraId, cantidadRecibida }] }` (sin body = recibir todo); CxP acumulada por lo recibido y pagos desde la primera recepción; la OC se mantiene `enviada` (badge "Recepción parcial") hasta completar todas las líneas.
- `[NOTA]` US-COM-05: **comparación de precios** implementada — `GET /compras/comparacion-precios?productoId=` (admin) con último precio por proveedor (OCs enviadas/recibidas), referencia al precio actual y flags favorito/más barato/inactivo/por debajo del actual; botón "Comparar" en Productos.
- `[ASSUMED]` US-VEN-09: folio de venta `VEN-XXXX` global (no por año).
- `[NOTA]` US-SER-12 / US-VEN-03: ensamblado por BOM implementado (ADR-0003) — `PUT /productos/:id/bom`, venta con desglose de componentes + mano de obra de ensamble (migración `0003_ensamble`).
- `[NOTA]` US-VEN-04..06: cotizaciones de venta implementadas — folio `CV-`, vigencia, sin reserva de stock al cotizar, conversión a venta con validación de stock, descuentos con BR-VEN-05 (migración `0004_cotizaciones_venta`).
