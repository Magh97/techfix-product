# Manual de Usuario — TechStore

> Sistema de administración para una tienda de cómputo: inventario, órdenes de servicio, punto de venta, compras, finanzas, reportes y notificaciones.
> Este manual está dirigido al personal del negocio (admin, vendedor y técnico). Documento técnico en `04-architecture.md`, `05-data-model.md`, `06-api-design.md`.

---

## 1. Roles y permisos

| Rol | Qué puede hacer |
|-----|-----------------|
| **Admin** | Todo: usuarios, catálogos, configuración, auditoría, reportes, compras, **reabastecimiento**, notificaciones, cancelaciones y descuentos >10%. |
| **Vendedor** | Clientes, crear órdenes, aprobar cotizaciones, entregar equipos, punto de venta, cobros, caja, garantías, sustituciones (solo registrar la respuesta del cliente). |
| **Técnico** | Atender órdenes (diagnóstico, cotización, reparación, entrega a listo), registrar consumo de piezas y mano de obra, **proponer sustituciones** y **solicitar refacciones**. |

El menú de la izquierda se adapta al rol: las secciones de administración (Usuarios, Catálogos, Reabastecimiento, Notificaciones, Configuración, Auditoría, Reportes) solo las ve el **admin**.

## 2. Acceso

| Entorno | URL |
|---------|-----|
| Desarrollo local | http://localhost:5173 |
| Producción (contenedores) | http://localhost:8080 |

### Credenciales de demostración

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin1234` | Administrador |
| `vendedor` | `vendedor1234` | Vendedor |
| `tecnico` | `tecnico1234` | Técnico |

La sesión expira automáticamente (15 min de inactividad); si tu sesión caduca se te regresa a la pantalla de acceso sin perder trabajo.

## 3. Dashboard

Muestra el resumen del día: ventas, órdenes en curso (incl. retrasadas), productos con stock bajo, saldo de caja y accesos rápidos. Es la pantalla inicial tras iniciar sesión.

## 4. Punto de Venta y Ventas

### Punto de Venta (`/venta`)
1. Escanea el código de barras o busca el producto.
2. Ajusta cantidades; los **kits** se desglosan automáticamente en sus componentes.
3. Si un producto está sin stock, el botón **Sustitutos** sugiere alternativas compatibles por tags; al usarlo, la línea se reemplaza por el sustituto.
4. Aplica **descuento**: hasta 10% lo aplica cualquier vendedor; mayor a 10% requiere rol **admin** y motivo.
5. Selecciona **contado** o **crédito** (para crédito necesitas cliente y respetar su límite/plazo).
6. Registra el pago; se emite el **ticket** con formato térmico 80mm (Imprimir → elige la impresora). Si la venta es con **cliente**, el ticket indica la **garantía** de los productos vendidos.

### Ventas (`/ventas`)
- Listado con filtros por fecha, vendedor, método de pago y estado.
- Detalle de cada venta: líneas, pagos y saldo pendiente.
- **Abono** a venta a crédito (botón en el detalle).
- **Devolución**: solo dentro de **15 días** desde la venta y con ticket; reembolsa y revierte el inventario.
- **Cancelación**: solo admin, con motivo; revierte stock.

## 5. Cotizaciones

- **Cotización de venta** (vendedor): convierte un carrito en una cotización con folio `CV-` y vigencia configurable.
- **Cotización de servicio** (técnico): se genera desde la orden (ver §6).
- En **Cotizaciones** puedes ver el estado, aprobar/convertir a venta. Al **convertir**, se valida stock y método de pago; si expiró, no se puede convertir.

## 6. Órdenes de servicio

Flujo completo de recepción a entrega. Estados del ciclo:

```
Pendiente → Diagnóstico → Cotizado → En reparación → Listo → Entregado
                        ↘──────────────↗     │
                                     (retorno a Diagnóstico si se requiere)
```

### Pasos del ciclo

1. **Crear orden** (vendedor): datos del cliente, equipo, falla reportada y fecha prometida.
2. **Diagnóstico** (técnico): describe el diagnóstico y si hay pendiente de compra.
3. **Cotizar** (técnico): agrega refacciones (productos) y mano de obra (horas × tarifa). Si una pieza no tiene stock suficiente, puedes **Sustituir** o **Solicitar refacción** (ver §6.1 y §9).
4. **Aprobar** (vendedor): reserva el stock de las refacciones y notifica al cliente (NOT-03).
5. **Reparar** (técnico): registra **consumo de piezas** (libera la reserva y sale del inventario) y **mano de obra**.
6. **Listo** (técnico): el equipo terminó. Se notifica al cliente (NOT-02).
7. **Entregar** (vendedor): captura la **firma del cliente** (obligatoria) en el recuadro táctil; genera la **garantía** de servicio.

### Reglas importantes
- Toda transición de estado se registra en el **historial** con usuario, fecha y nota.
- Una orden **retrasada** (pasó la fecha prometida + 1 día) se marca automáticamente con insignia de retraso.
- Las órdenes en `entregado`/`cancelado` son estados finales.

### 6.1 Sustitución con validación del cliente (A1b)

Cuando una pieza no tiene stock suficiente, el **técnico** puede proponer un **sustituto** (solo los sugeridos por el sistema, con stock disponible):

1. En la cotización, la línea sin stock muestra el botón **Sustituir**.
2. El técnico elige el **sustituto** de la lista de sugerencias y la propone.
3. La orden pasa a **"Esperando sustitución"** (queda en pausa) y se notifica al **admin** (NOT-06). Si la cotización ya estaba aprobada, se libera la reserva del original y se reserva el sustituto.
4. El vendedor/técnico consulta al cliente y registra la respuesta:
   - **Cliente aceptó** → la línea se reemplaza con el **precio del sustituto**, se recalculan subtotal/IVA/total y la orden vuelve a su estado (En reparación o Cotizado).
   - **Cliente rechazó** → se genera automáticamente una **solicitud de reabastecimiento** del original (ver §9) y la orden vuelve a su estado.
   - **Cancelar** → el técnico/admin retira la propuesta.
5. Cuando la refacción **llega** (se recibe la OC), la solicitud pasa a **Entregada** y aparece en el historial: *"Refacción X llegó · OC …"* — y el técnico puede continuar con la reparación.

## 7. Clientes

- **Registrar**: nombre, teléfono, correo, dirección, preferencia de contacto (WhatsApp/correo/llamada), **límite de crédito** (default $3,000) y **plazo** (default 15 días).
- **Detalle**: historial (órdenes, ventas, cotizaciones) y **cuentas por cobrar** (saldo, vencidas, límite).
- **Etiquetas** (admin) para segmentar; filtro de deudores en el listado.

## 8. Productos y Catálogos

### Catálogos (`/catalogos`, solo admin)
La clasificación es un **árbol de hasta 4 niveles**; la **raíz es la categoría** del producto (obligatoria).

```
PC → Componentes → RAM → DDR5
  └─ Equipos → Laptop
Perifericos → Monitor
Refaccion · Usado · General  (raíces sin hijos)
```

- Crea/edita nodos; cada nodo puede tener **tags sugeridas** (ej. "16 GB", "4800 MHz") y **tags de compatibilidad** (ej. "DDR5").
- Hay una raíz **"General"** por defecto para productos sin clasificar.

### Productos (`/productos`)
- **Crear/editar**: SKU, código de barras, precios, stock mínimo/máximo, categoría (raíz), catálogo y **tags (especificaciones)**.
- **Ajustar stock** (admin): corrección con motivo (se registra en el historial del producto).
- **Importar/exportar** el catálogo (CSV/Excel).
- **Sustitutos**: botón en cada producto que sugiere alternativas compatibles (por tags) y con stock — útil en POS y órdenes.
- **Comparar precios** (admin): botón **Comparar** en cada producto abre la comparativa de **último precio por proveedor** (desde las OCs enviadas/recibidas), con el **precio de compra actual** como referencia y badges de **favorito**, **más barato**, **inactivo** y **↓ actual** (cotiza por debajo del precio actual) — útil para negociar el siguiente pedido.
- Alerta visual de **stock bajo** (stock ≤ mínimo).

### Equipos usados (`/usados`)
- Lista los equipos usados con su **origen** (parte de pago / reparación / otro), **cliente que lo entregó**, **valor de parte de pago** (costo), precio de venta, stock y **estado** (Disponible si hay stock, Vendido si no). Filtra por estado, origen o búsqueda.
- **Registrar usado** (admin): captura SKU/nombre, valor de parte de pago y precio de venta, stock (default 1), origen y cliente opcional. El sistema crea el producto bajo la categoría **"Usado"** y registra la entrada al inventario.
- Los usados se venden igual que cualquier producto (POS); la garantía automática al venderlos está pendiente como feature general.

## 9. Compras y Reabastecimiento

### Compras (admin)
1. **Nueva compra**: proveedor + líneas (producto, cantidad, precio unitario).
2. La OC nace en **borrador** → **Enviada** → al **Recibir** mercancía entra al inventario y se genera la **cuenta por pagar**.
3. **Recepción por parciales**: en el detalle, el botón **Recibir mercancía** abre un diálogo para indicar cuánto llega de cada línea. Usa **"Recibir todo"** para la mercancía completa, o captura cantidades y **"Recibir selección"** si llega en varios envíos. Mientras falten líneas, la OC queda **"Enviada"** con el sello **"Recepción parcial"**; solo pasa a **Recibida** cuando todo está completo. La columna **Recibido** muestra el avance (ej. `5/10`).
4. La **cuenta por pagar** se acumula por lo recibido: puedes **pagar** desde la primera recepción parcial. Las tarjetas muestran **Total pedido / Recibido / Pagado / Saldo**.
5. Si el proveedor no enviará el resto (faltante), puedes **Cancelar** la OC con recepción parcial: se conservan el stock ya recibido y la CxP acumulada.
6. **Sobrerecepción**: no se puede registrar más de lo pedido en una línea.

### Reabastecimiento (`/reabastecimiento`, solo admin)

Dos pestañas:

**Sugerencias**: productos bajo el stock deseado, **agrupados por proveedor** (favorito → último proveedor → sin proveedor). Por cada línea:
- **Cantidad sugerida** = `stock máximo − stock` (si hay máximo) o `stock mínimo × 2 − stock`; la puedes **editar**.
- Insignia **"Ya en OC"** y folio si el producto ya tiene una orden de compra activa.
- Botón **Crear OC** agrupa las sugerencias del mismo proveedor (precio de compra actual); los kits no aparecen.

**Solicitudes de técnicos**: refacciones que los técnicos pidieron (ver §6.1 y "Solicitar refacción").
- Estado: `Pendiente → Aprobada → Entregada` o `Rechazada`/`Cancelada`.
- El **admin** **Aprueba** (crea la OC por proveedor; las que no tienen proveedor quedan pendientes) o **Rechaza** con motivo.
- El técnico que creó la solicitud puede **Cancelarla** mientras esté pendiente.
- Al **recibir la OC**, las solicitudes aprobadas pasan a **Entregada** y el producto queda disponible para la reparación.

### Cómo pide una refacción el técnico
Desde una **orden** (botón "Solicitar refacción") o desde **Productos** (cuando el stock es 0 o insuficiente): se crea la solicitud, se notifica al admin (NOT-05) y aparece en Reabastecimiento.

## 10. Proveedores

Alta/edición de proveedores (nombre, contacto, condiciones de pago). El proveedor **favorito** de un producto se usa como primera opción en el reabastecimiento. No se puede eliminar un proveedor con compras asociadas.

## 11. Caja y Finanzas

### Caja (`/caja`)
- **Abrir caja** al inicio del día (vendedor/admin).
- **Corte**: ingresos, egresos y desglose por método de pago.
- **Cerrar caja** (admin): captura el efectivo físico y el sistema calcula la **diferencia** (arqueo).

### Finanzas (`/finanzas`)
- **Cuentas por cobrar** (CxC): saldo y vencidas por cliente.
- **Cuentas por pagar** (CxP): saldo con proveedores.
- **Egresos** (admin): gastos con categoría y método.

## 12. Garantías

Consulta de garantías con su cobertura y vigencia. Se generan automáticamente:
- Al **entregar una reparación**: garantía de servicio.
- Al **vender productos a un cliente** (con cliente registrado): **una garantía por producto** — **producto nuevo 30 días** o **usado 15 días**. En el ticket de venta aparece "Garantía: {tipo} hasta {fin}". Las ventas a **mostrador (sin cliente)** no generan garantía.

## 13. Notificaciones

- **Historial**: envíos por cliente, tipo, canal y estado (enviado/fallido/reintento).
- **Plantillas** (admin): edita los textos de las notificaciones.

| Tipo | Cuándo se envía |
|------|-----------------|
| NOT-02 | El equipo está listo para recogerse |
| NOT-03 | La cotización de la orden está lista |
| NOT-05 | Se creó una solicitud de refacción (aviso al admin) |
| NOT-06 | Se propuso una sustitución (aviso al admin) |

> Si no hay SMTP configurado (desarrollo), el correo se **simula** en consola; en producción usa el servidor de correo configurado.

## 14. Usuarios (solo admin)

- **Crear/editar** usuarios (nombre, usuario, contraseña, rol: admin/vendedor/técnico).
- **Activar/desactivar** cuentas.
- Usuarios demo: `admin`, `vendedor`, `tecnico` (ver §2).

## 15. Auditoría (solo admin)

Bitácora de **eventos críticos** (ventas, ajustes de inventario, cancelaciones, cierre de caja, descuentos >5%, etc.) con usuario, fecha, entidad y valores antes/después. Filtrar por acción, usuario, entidad o rango de fechas.

## 16. Reportes (solo admin)

Pestañas: **Inventario, Ventas, Servicios, Rentabilidad, Clientes, Financiero**. Exporta cada reporte a **CSV o Excel**. Parámetros por rango de fechas, vendedor, técnico, etc.

## 17. Configuración (solo admin)

- **IVA** (tasa, default 16%).
- **Tiempos de servicio** y **tolerancia de retraso**.
- **Garantías** (días de cobertura).
- **Plantillas** de notificaciones.

## 18. Preguntas frecuentes

**¿Por qué no puedo avanzar la orden a "En reparación"?**
Debe existir una **cotización aprobada**. Aprobar cotización es función de vendedor/admin.

**¿Cómo sustituyo una pieza sin stock en una reparación?**
Técnico: en la cotización pulsa **Sustituir** en la línea, elige el sustituto y registra la respuesta del cliente (ver §6.1).

**¿Cómo pido una refacción que no tenemos?**
Técnico: botón **Solicitar refacción** en la orden o en Productos. El admin la aprueba en **Reabastecimiento** → **Solicitudes** y se crea la OC.

**¿Por qué una refacción sale "Entregada" en mis solicitudes?**
Porque la OC de compra fue recibida; el producto ya está en inventario y disponible para continuar la reparación.

**¿Puedo vender con descuento mayor a 10%?**
Solo con rol **admin** y motivo. El sistema lo registra en auditoría.

**¿Puedo devolver una venta de hace más de 15 días?**
No por el sistema; la ventana de devolución es de 15 días.

**¿Un proveedor con compras se puede eliminar?**
No. Solo se puede eliminar si no tiene compras asociadas.

**¿El ticket de venta se imprime?**
Sí. Al completar la venta aparece el ticket en pantalla con formato térmico 80mm; pulsa **Imprimir** y elige tu impresora térmica (o cualquiera con driver) en el diálogo del navegador. Desde **Ventas** puedes reimprimir un ticket (sale marcado **COPIA**).
