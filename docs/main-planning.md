# Planeación del Sistema de Administración
## Negocio de Mantenimiento, Reparación y Venta de Equipo de Cómputo

---

## 1. Visión General

Sistema integral para la gestión de un negocio dedicado al **mantenimiento, reparación, ensamblado y venta de equipo de cómputo** (PCs, laptops, componentes y periféricos). Los clientes no tienen acceso al sistema; interactúan de forma presencial en tienda y reciben tickets de compra o notificaciones por correo/WhatsApp cuando sus equipos no pueden estar listos en la fecha prometida.

---

## 2. Objetivos del Sistema

| # | Objetivo |
|---|----------|
| 1 | Centralizar el control de inventario de productos y componentes |
| 2 | Gestionar órdenes de servicio de reparación y mantenimiento de principio a fin |
| 3 | Registrar y dar seguimiento a las relaciones con clientes (CRM interno) |
| 4 | Automatizar ventas, cotizaciones y facturación |
| 5 | Controlar compras a proveedores y entradas de mercancía |
| 6 | Generar reportes financieros de ingresos, egresos e inventario |
| 7 | Notificar a clientes automáticamente en caso de retrasos en servicios |
| 8 | Emitir tickets de compra y garantía en cada transacción |

---

## 3. Alcance

### 3.1 Dentro del Alcance (In-Scope)

- Registro y gestión de clientes (datos de contacto, historial de servicios y compras)
- Control de inventario de productos, componentes y equipos
- Órdenes de servicio para reparación, mantenimiento y ensamblado
- Cotizaciones y aprobaciones de servicios
- Punto de venta para productos y servicios
- Control de compras a proveedores
- Registro de ingresos y egresos (corte de caja)
- Generación de tickets de compra y garantía
- Notificaciones por correo electrónico y WhatsApp
- Reportes de inventario, ventas, servicios y finanzas

### 3.2 Fuera del Alcance (Out-of-Scope)

- Portal web o aplicación móvil para clientes
- Facturación electrónica (CFDI) — *puede considerarse en fase posterior*
- Integración con sistemas contables externos
- Gestión de nómina y recursos humanos
- E-commerce o tienda en línea

---

## 4. Actores del Sistema

| Actor | Rol | Acceso Principal |
|-------|-----|------------------|
| **Administrador** | Dueño o gerente del negocio | Acceso total: usuarios, configuración, reportes avanzados, catálogos |
| **Vendedor / Recepcionista** | Atención al cliente en tienda | Registro de clientes, órdenes de servicio, ventas, cobros, entregas, notificaciones |
| **Técnico** | Reparación, mantenimiento y ensamblado | Diagnóstico, actualización de estado de órdenes, consumo de refacciones, registro de mano de obra |

> **Nota:** Los clientes **no son usuarios del sistema**. Interactúan presencialmente y reciben tickets impresos o notificaciones por correo/WhatsApp.

---

## 5. Módulos del Sistema

### 5.1 Módulo: Inventario

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| INV-01 | Registrar producto | Alta de productos con nombre, categoría, marca, modelo, código de barras, precio de compra, precio de venta, stock mínimo |
| INV-02 | Editar producto | Modificación de datos y precios de productos existentes |
| INV-03 | Eliminar / Desactivar producto | Baja lógica de productos descontinuados |
| INV-04 | Consultar stock | Visualización de existencias en tiempo real con alertas de stock mínimo |
| INV-05 | Ajustar inventario | Correcciones manuales por daño, merma, pérdida o inventario físico |
| INV-06 | Historial de movimientos | Registro de todas las entradas y salidas de productos |
| INV-07 | Registrar equipo usado | Alta de PCs o laptops recibidos en parte de pago o para reparación |
| INV-08 | Categorización | Clasificación por tipo: componentes, periféricos, equipos completos, refacciones |

### 5.2 Módulo: CRM (Relaciones con Clientes)

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| CRM-01 | Registrar cliente | Alta con nombre, teléfono, correo, dirección y preferencia de contacto |
| CRM-02 | Buscar cliente | Consulta por nombre, teléfono o correo |
| CRM-03 | Editar cliente | Actualización de datos de contacto |
| CRM-04 | Ver historial del cliente | Listado de todas las órdenes de servicio, compras y cotizaciones previas |
| CRM-05 | Registrar preferencia de contacto | Canal preferido: WhatsApp, correo o solo llamada |
| CRM-06 | Segmentar clientes | Etiquetas: frecuente, ocasional, corporativo, deudor, etc. |
| CRM-07 | Registrar quejas o garantías | Seguimiento de problemas post-servicio |

### 5.3 Módulo: Servicios Técnicos (Reparación / Mantenimiento / Ensamblado)

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| SER-01 | Crear orden de servicio | Registro de equipo recibido: tipo, marca, modelo, serie, accesorios, falla reportada, fecha prometida de entrega |
| SER-02 | Asignar folio único | Generación automática de número de orden |
| SER-03 | Realizar diagnóstico | Técnico evalúa y describe el problema encontrado |
| SER-04 | Generar cotización | Cálculo de mano de obra + refacciones necesarias del inventario |
| SER-05 | Enviar cotización al cliente | Cliente aprueba o rechaza en tienda (presencial) |
| SER-06 | Ejecutar reparación | Técnico realiza el trabajo, consume piezas del inventario automáticamente |
| SER-07 | Registrar mano de obra | Tiempo invertido y costo asociado |
| SER-08 | Actualizar estado de orden | Pendiente → Diagnóstico → Cotizado → En reparación → Listo → Entregado → Cancelado |
| SER-09 | Detectar retraso | Si la fecha prometida se excede, el sistema marca la orden como retrasada |
| SER-10 | Entregar equipo | Vendedor registra entrega, cliente firma digital o en papel, se cierra la orden |
| SER-11 | Registrar garantía de servicio | Período de garantía post-reparación (ej. 30 días) |
| SER-12 | Ensamblar PC | Selección de componentes del inventario, ensamblado y venta como equipo completo |
| SER-13 | Consultar estado de orden | Búsqueda por folio para atención presencial del cliente |

### 5.4 Módulo: Ventas (Punto de Venta)

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| VEN-01 | Vender producto | Venta directa de componentes o equipos del inventario |
| VEN-02 | Vender servicio | Cobro de reparación o mantenimiento ya concluido |
| VEN-03 | Vender ensamblado | Venta de PC ensamblado a la medida |
| VEN-04 | Generar cotización | Presupuesto sin compromiso, con vigencia y folio |
| VEN-05 | Convertir cotización a venta | Aprobación del cliente y generación de venta |
| VEN-06 | Aplicar descuento | Descuentos por promoción o cliente frecuente |
| VEN-07 | Registrar método de pago | Efectivo, tarjeta de crédito/débito, transferencia, depósito |
| VEN-08 | Registrar venta a crédito | Cliente paga parcial o total posteriormente |
| VEN-09 | Generar ticket de compra | Impresión de ticket con: folio, fecha, productos/servicios, cantidades, precios, totales, garantía |
| VEN-10 | Reimprimir ticket | Emisión de copia del ticket original |
| VEN-11 | Cancelar venta | Reversión con registro de motivo |
| VEN-12 | Devolución | Registro de devoluciones con afectación a inventario y finanzas |

### 5.5 Módulo: Compras

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| COM-01 | Registrar proveedor | Alta con nombre, contacto, productos que surte, condiciones de pago |
| COM-02 | Editar proveedor | Actualización de datos de proveedores |
| COM-03 | Crear orden de compra | Solicitud de productos a proveedor con cantidades y precios |
| COM-04 | Registrar entrada de mercancía | Recepción de productos, actualización automática de inventario |
| COM-05 | Comparar precios de proveedores | Historial de compras por producto para negociación |
| COM-06 | Registrar cuenta por pagar | Control de pagos pendientes a proveedores |

### 5.6 Módulo: Finanzas

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| FIN-01 | Registrar ingreso | Ventas, cobros de servicios, otros ingresos |
| FIN-02 | Registrar egreso | Compras, gastos operativos, nómina, renta, servicios |
| FIN-03 | Corte de caja diario | Resumen de entradas y salidas del día por usuario |
| FIN-04 | Cierre de caja | Arqueo: efectivo contado vs. sistema |
| FIN-05 | Consultar movimientos | Filtrado por fecha, tipo, usuario, categoría |
| FIN-06 | Cuentas por cobrar | Clientes con pagos pendientes |
| FIN-07 | Cuentas por pagar | Proveedores con pagos pendientes |

### 5.7 Módulo: Reportes

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| REP-01 | Reporte de inventario | Existencias actuales, valoración, productos con stock bajo |
| REP-02 | Reporte de ventas | Ventas por período, producto, vendedor, método de pago |
| REP-03 | Reporte de servicios | Órdenes por estado, técnico, tipo de falla, tiempos promedio |
| REP-04 | Reporte de rentabilidad | Ganancia por producto, servicio, período |
| REP-05 | Reporte de clientes | Clientes frecuentes, ticket promedio, deudores |
| REP-06 | Reporte de finanzas | Ingresos vs. egresos, utilidad neta, flujo de caja |
| REP-07 | Exportar a Excel/PDF | Descarga de reportes en formatos estándar |

### 5.8 Módulo: Notificaciones

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| NOT-01 | Notificar retraso automático | Si una orden excede la fecha prometida, enviar WhatsApp/correo al cliente |
| NOT-02 | Notificar equipo listo | Vendedor envía mensaje al cliente cuando la orden está en estado "Listo" |
| NOT-03 | Notificar cotización lista | Aviso al cliente para que apruebe o rechace presupuesto |
| NOT-04 | Recordatorio de garantía | Notificación antes de que venza el período de garantía |
| NOT-05 | Plantillas de mensaje | Configuración de textos predeterminados para cada tipo de notificación |
| NOT-06 | Historial de notificaciones | Registro de todos los mensajes enviados |

---

## 6. Casos de Uso Principales

### 6.1 Diagrama de Flujo del Proceso Típico

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE LLEGA A TIENDA                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VENDEDOR / RECEPCIONISTA                                           │
│  ├── Busca o registra cliente (CRM)                                 │
│  ├── Si compra producto:                                            │
│  │   └── Procesa venta en Punto de Venta → Genera ticket (VEN-09) │
│  └── Si deja equipo para servicio:                                  │
│      └── Crea Orden de Servicio (SER-01)                            │
│          └── Cliente recibe ticket con folio y fecha prometida     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TÉCNICO                                                            │
│  ├── Realiza diagnóstico (SER-03)                                   │
│  ├── Genera cotización (SER-04)                                     │
│  └── Cliente aprueba en tienda (presencial)                         │
│      └── Ejecuta reparación (SER-06)                                │
│          └── Consume piezas del inventario (INV-04)                 │
│              └── Si excede fecha prometida:                         │
│                  └── Sistema detecta retraso (SER-09)               │
│                      └── Envía notificación automática (NOT-01)     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VENDEDOR / RECEPCIONISTA                                           │
│  ├── Notifica al cliente que equipo está listo (NOT-02)             │
│  ├── Cliente llega a pagar                                          │
│  ├── Procesa cobro en Punto de Venta (VEN-01 a VEN-08)            │
│  ├── Genera ticket de compra final (VEN-09)                         │
│  └── Entrega equipo y cierra orden (SER-10)                         │
│      └── Cliente firma recepción                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Casos de Uso Detallados

#### CU-01: Crear Orden de Servicio

| Campo | Descripción |
|-------|-------------|
| **Actor** | Vendedor / Recepcionista |
| **Precondición** | Cliente registrado en el sistema |
| **Flujo principal** | 1. Vendedor busca cliente por teléfono o nombre<br>2. Selecciona "Nueva Orden de Servicio"<br>3. Captura datos del equipo: tipo, marca, modelo, número de serie<br>4. Describe accesorios entregados (cargador, mouse, etc.)<br>5. Registra falla reportada por el cliente<br>6. Sistema genera folio único automáticamente<br>7. Establece fecha prometida de entrega (por defecto: estándar del tipo de servicio)<br>8. Imprime ticket para el cliente con folio y fecha<br>9. Orden queda en estado: **Pendiente** |
| **Postcondición** | Orden de servicio creada, cliente tiene ticket con folio |
| **Excepciones** | Si el cliente no existe, se registra primero (CRM-01) |

#### CU-02: Realizar Diagnóstico y Cotización

| Campo | Descripción |
|-------|-------------|
| **Actor** | Técnico |
| **Precondición** | Orden en estado "Pendiente" |
| **Flujo principal** | 1. Técnico consulta órdenes asignadas<br>2. Selecciona orden y cambia estado a "En diagnóstico"<br>3. Registra problema encontrado<br>4. Selecciona refacciones necesarias del inventario<br>5. Sistema calcula costo de piezas + mano de obra<br>6. Genera cotización con vigencia (ej. 7 días)<br>7. Cambia estado a "Cotizado"<br>8. Vendedor notifica al cliente para aprobación |
| **Postcondición** | Cotización lista para aprobación del cliente |
| **Excepciones** | Si no hay piezas en inventario, marca como "Pendiente de compra" |

#### CU-03: Ejecutar Reparación

| Campo | Descripción |
|-------|-------------|
| **Actor** | Técnico |
| **Precondición** | Cliente aprobó cotización, orden en estado "Cotizado" |
| **Flujo principal** | 1. Técnico cambia estado a "En reparación"<br>2. Sistema reserva piezas del inventario<br>3. Técnico realiza el trabajo<br>4. Registra piezas consumidas (descuento automático de inventario)<br>5. Registra tiempo de mano de obra<br>6. Cambia estado a "Listo"<br>7. Sistema notifica a vendedor |
| **Postcondición** | Orden lista para entrega, inventario actualizado |
| **Excepciones** | Si se requieren más piezas, se genera nueva cotización adicional |

#### CU-04: Procesar Venta y Entregar Equipo

| Campo | Descripción |
|-------|-------------|
| **Actor** | Vendedor / Recepcionista |
| **Precondición** | Orden en estado "Listo" o cliente compra producto directamente |
| **Flujo principal** | 1. Vendedor busca orden por folio o escanea productos<br>2. Sistema calcula total (productos + servicios + mano de obra)<br>3. Aplica descuento si aplica<br>4. Registra método de pago<br>5. Si es servicio, cambia orden a "Entregado"<br>6. Genera ticket de compra con garantía<br>7. Cliente firma recepción (digital o en papel)<br>8. Registra garantía de servicio o producto |
| **Postcondición** | Venta registrada, ticket impreso, orden cerrada |
| **Excepciones** | Si el cliente no paga completo, se registra como cuenta por cobrar |

#### CU-05: Notificar Retraso Automático

| Campo | Descripción |
|-------|-------------|
| **Actor** | Sistema (automático) |
| **Precondición** | Orden con fecha prometida vencida, estado diferente de "Entregado" o "Cancelado" |
| **Flujo principal** | 1. Proceso programado revisa órdenes cada hora<br>2. Detecta órdenes con fecha prometida < fecha actual<br>3. Marca orden como "Retrasada"<br>4. Consulta preferencia de contacto del cliente (CRM-05)<br>5. Envía notificación por canal preferido:<br>   - WhatsApp: mensaje con folio, nueva fecha estimada, disculpas<br>   - Correo: mismo contenido con formato HTML<br>6. Registra envío en historial de notificaciones<br>7. Notifica al vendedor para seguimiento |
| **Postcondición** | Cliente notificado, orden marcada como retrasada |
| **Excepciones** | Si no hay correo ni WhatsApp registrado, notifica al vendedor para llamada |

---

## 7. Entidades Principales (Base de Datos)

| Entidad | Descripción |
|---------|-------------|
| **Usuario** | Empleados del sistema: administrador, vendedor, técnico |
| **Cliente** | Personas que compran o dejan equipo para servicio |
| **Proveedor** | Empresas que surten productos y componentes |
| **Producto** | Artículos en inventario: componentes, periféricos, equipos |
| **Categoria** | Clasificación de productos (RAM, SSD, laptops, etc.) |
| **OrdenServicio** | Registro de reparación, mantenimiento o ensamblado |
| **DetalleOrden** | Piezas y mano de obra asociadas a una orden |
| **Cotizacion** | Presupuesto generado para aprobación del cliente |
| **Venta** | Transacción de venta de productos o servicios |
| **DetalleVenta** | Productos y servicios incluidos en una venta |
| **Compra** | Orden de compra a proveedor |
| **DetalleCompra** | Productos incluidos en una compra |
| **Movimiento** | Registro de entradas y salidas de inventario |
| **Pago** | Registro de pagos recibidos o realizados |
| **Notificacion** | Mensajes enviados a clientes |
| **Garantia** | Registro de garantías post-venta o post-servicio |
| **Configuracion** | Parámetros del sistema: tiempos de servicio, plantillas, etc. |

---

## 8. Priorización de Desarrollo (Roadmap)

### Fase 1: MVP (Mínimo Producto Viable) — 4-6 semanas

| Módulo | Funcionalidades |
|--------|-----------------|
| Inventario | INV-01 a INV-04 (registro, edición, consulta de stock) |
| CRM | CRM-01 a CRM-04 (registro, búsqueda, historial básico) |
| Servicios Técnicos | SER-01 a SER-10 (órdenes, diagnóstico, reparación, entrega) |
| Ventas | VEN-01, VEN-02, VEN-07, VEN-09 (venta simple, ticket, pago) |
| Finanzas | FIN-01, FIN-02, FIN-03 (ingresos, egresos, corte de caja) |
| Notificaciones | NOT-02 (notificación manual de equipo listo) |

> **Objetivo:** Tener operativa la tienda con control de inventario, órdenes de servicio y punto de venta.

### Fase 2: Consolidación — 3-4 semanas

| Módulo | Funcionalidades |
|--------|-----------------|
| Inventario | INV-05 a INV-08 (ajustes, historial, equipos usados) |
| CRM | CRM-05 a CRM-07 (preferencias, segmentación, garantías) |
| Servicios Técnicos | SER-11, SER-12 (garantía de servicio, ensamblado) |
| Ventas | VEN-04 a VEN-06, VEN-08, VEN-10 (cotizaciones, descuentos, crédito, reimpresión) |
| Compras | COM-01 a COM-04 (proveedores, órdenes de compra, entradas) |
| Notificaciones | NOT-01, NOT-03 (retraso automático, cotización lista) |
| Reportes | REP-01 a REP-03 (inventario, ventas, servicios) |

> **Objetivo:** Completar el flujo de negocio con cotizaciones, compras y reportes básicos.

### Fase 3: Optimización — 3-4 semanas

| Módulo | Funcionalidades |
|--------|-----------------|
| Ventas | VEN-11, VEN-12 (cancelaciones, devoluciones) |
| Compras | COM-05, COM-06 (comparación de precios, cuentas por pagar) |
| Finanzas | FIN-04 a FIN-07 (cierre de caja, movimientos, cuentas por cobrar/pagar) |
| Reportes | REP-04 a REP-07 (rentabilidad, clientes, finanzas, exportación) |
| Notificaciones | NOT-04 a NOT-06 (garantía, plantillas, historial) |
| Configuración | Parámetros generales, permisos de usuarios, respaldos |

> **Objetivo:** Sistema completo con control financiero avanzado y automatizaciones.

### Fase 4: Escalabilidad (Futuro)

- Facturación electrónica (CFDI)
- Integración con WhatsApp Business API oficial
- Dashboard con métricas en tiempo real
- App móvil para consulta interna de órdenes
- Integración con contabilidad externa

---

## 9. Requisitos No Funcionales

| Categoría | Requisito |
|-----------|-----------|
| **Rendimiento** | Respuesta de consultas en menos de 2 segundos |
| **Disponibilidad** | 99% uptime en horario de operación (lun-sab) |
| **Seguridad** | Autenticación por usuario/contraseña, roles y permisos |
| **Usabilidad** | Interfaz intuitiva para vendedores y técnicos sin experiencia técnica |
| **Escalabilidad** | Soporte para 100,000 productos y 50,000 órdenes sin degradación |
| **Respaldo** | Copias de seguridad automáticas diarias |
| **Impresión** | Compatibilidad con impresoras térmicas de tickets (58mm/80mm) |
| **Notificaciones** | Envío de WhatsApp mediante API (Twilio, Meta) o integración con dispositivo |

---

## 10. Consideraciones de Implementación

### 10.1 Stack Tecnológico Sugerido (Opciones)

| Capa | Opción A (Económica) | Opción B (Robusta) |
|------|----------------------|---------------------|
| **Frontend** | React / Vue.js | React / Angular |
| **Backend** | Node.js / Express | Python / Django o FastAPI |
| **Base de datos** | PostgreSQL | PostgreSQL o MySQL |
| **Impresión de tickets** | Biblioteca de impresión térmica (ESC/POS) | Servicio de impresión local |
| **Notificaciones WhatsApp** | WhatsApp Business API (Meta) o Twilio | WhatsApp Business API oficial |
| **Correo** | SMTP estándar | SendGrid / Mailgun |
| **Despliegue** | VPS (DigitalOcean, Linode) | AWS / Azure / Google Cloud |
| **Respaldo** | Cron job + almacenamiento en cloud | Servicios automatizados de BD |

### 10.2 Hardware Recomendado

| Equipo | Especificación |
|--------|----------------|
| Servidor / PC principal | 8GB RAM, SSD 256GB, procesador i5/Ryzen 5 |
| Punto de venta | PC o tablet con navegador web, lector de código de barras |
| Impresora de tickets | Térmica 80mm, compatible ESC/POS (Ej: Epson TM-T20) |
| Impresora de etiquetas | Para códigos de barras de productos (opcional) |
| Escáner de código de barras | USB para agilizar ventas y búsquedas |

---

## 11. Glosario

| Término | Definición |
|---------|------------|
| **Orden de Servicio** | Documento que registra la recepción de un equipo para reparación o mantenimiento |
| **Folio** | Número único identificador de una orden de servicio |
| **Cotización** | Presupuesto de costo de reparación con piezas y mano de obra |
| **Ticket de compra** | Comprobante impreso de una venta o servicio |
| **Corte de caja** | Resumen de todas las transacciones de un turno o día |
| **Stock mínimo** | Cantidad mínima de un producto antes de generar alerta de reabastecimiento |
| **Ensamblado** | Construcción de una PC a partir de componentes seleccionados |
| **Mano de obra** | Costo del trabajo técnico, independiente de las piezas |
| **Garantía** | Compromiso de reparación gratuita por un período definido post-servicio |

---

## 12. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-06-24 | — | Documento inicial de planeación |

---

> **Documento generado para planeación a gran escala.**
> Para detalles técnicos adicionales (diagrama ER, historias de usuario, mockups), solicitar las secciones correspondientes.
