# Guía UI/UX — Sistema de Administración (Tienda de Cómputo)

> Design system generado con la skill **ui-ux-pro-max** (búsqueda: POS / servicio / dashboard profesional).
> Stack UI: React (Vite) · Componentes base sugeridos: shadcn/ui (Tailwind) · Iconos: Lucide (SVG, nunca emojis).

---

## 1. Design System Resumido

| Elemento | Decisión | Racional |
|----------|----------|----------|
| Estilo | **Trust & Authority** (expertise, badges, métricas) | Refuerza confianza en una tienda técnica; WCAG AAA |
| Patrón | Dashboard / Data-dense con navegación lateral persistente | Operación rápida en tienda, menos scroll |
| Anti-patrones | Playful design, gradientes morados/púrpura "AI", credenciales ocultas | Restan profesionalismo |

## 2. Tokens de Color

### Modo oscuro (base del sistema — búsqueda ui-ux-pro-max)

| Token | Hex | Uso |
|-------|-----|-----|
| `bg` | `#020617` | Fondo de aplicación |
| `surface` | `#0F172A` | Tarjetas, paneles, tabla headers |
| `surface-2` | `#1E293B` | Inputs, hover, bordes suaves |
| `border` | `#334155` | Divisores, bordes de inputs |
| `text` | `#F8FAFC` | Texto principal |
| `text-muted` | `#94A3B8` | Texto secundario (nunca para texto principal) |
| `primary` | `#22C55E` | CTA, acciones principales, "listo"/éxito |
| `accent` | `#3B82F6` | Enlaces, foco, selección activa |

### Colores de estado (compartidos entre modos)

| Estado | Hex | Uso |
|--------|-----|-----|
| Success | `#22C55E` | Pagos, entregas, cierre de caja OK |
| Warning | `#F59E0B` | Stock bajo, garantía próxima a vencer |
| Danger | `#EF4444` | Retraso, stock negativo, error, cancelación |
| Info | `#3B82F6` | Notificaciones, pendientes |

### Modo claro (recomendado para la estación POS)

| Token | Hex | Nota |
|-------|-----|------|
| `bg` | `#F8FAFC` | Fondo claro en caja (tienda con luz) |
| `surface` | `#FFFFFF` | Tarjetas |
| `border` | `#E2E8F0` | Bordes visibles en claro |
| `text` | `#0F172A` | Contraste ≥ 4.5:1 (slate-900) |
| `text-muted` | `#475569` | Mínimo slate-600 para texto secundario |

> Regla: modo claro por defecto en pantallas de POS/caja; modo oscuro opcional en admin/dashboards. Respetar `prefers-color-scheme`.

## 3. Tipografía

| Rol | Fuente | Peso | Tamaño |
|-----|--------|------|--------|
| Display (títulos de pantalla) | Poppins | 600 | 28–32px |
| Headings (secciones) | Poppins | 600 | 20–24px |
| Body / Tablas / Forms | Open Sans | 400/600 | 14–16px |
| Monospace (folios, códigos) | JetBrains Mono | 500 | 13px |
| Ticket impreso | Monospace 80mm | — | 12–14 (contenido legible) |

```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
```

## 4. Layout y Espaciado

- Escala base 4px: `space-1=4` … `space-8=32`. Contenedor máximo `max-w-7xl`.
- **POS:** layout de 2 columnas — izquierda búsqueda/resultados, derecha carrito fijo (sticky) con total visible siempre.
- **Navegación lateral** fija con accesos por rol: `Venta · Clientes · Productos · Órdenes · Compras · Caja · Reportes · Configuración`.
- Área de contenido con scroll propio; el header muestra usuario, rol, caja del día y folio en curso.
- Targets táctiles ≥ 44×44px (botones de caja ≥ 48px) para uso en tablet.

## 5. Componentes (con estados obligatorios)

| Componente | Pantallas | Estados |
|------------|-----------|---------|
| `SearchBar` (cliente/folio) | Header global, CRM, Órdenes | default / focused / loading / empty / no-results |
| `BarcodeInput` | POS, Inventario | focused (autofocus al abrir) / invalid / not-found |
| `ProductTable` | POS resultados, Inventario, Compras | loading (skeleton) / empty / error / populated |
| `Cart` | POS | vacío (CTA "escanea un producto") / con ítems / con descuento / con error de stock |
| `OrderWizard` | Nueva orden | paso a paso con progreso; valida por paso |
| `StatusBadge` | Órdenes | pendiente(neutral) / diagnóstico(info) / cotizado(warning) / reparación(info) / listo(success) / entregado(success) / cancelado(danger) / retrasada(danger) |
| `PaymentModal` | POS, Entrega | método de pago / crédito (muestra límite y saldo) / cambio (efectivo) / error de límite |
| `SignatureCanvas` | Entrega (SER-10) | vacío (placeholder "Firma aquí") / dibujando / firmado / error (intento de borrar con botón "Borrar") · área táctil ≥ 300×120px, `cursor-crosshair` · genera PNG base64 obligatorio antes de cerrar |
| `TicketPreview` | POS, Reimpresión | previo / enviado a impresora / error de impresión |
| `DateRangePicker` | Reportes, Finanzas | default / inválido (desde > hasta) |
| `Toast` | Global | success / error / warning (auto-dismiss 4s) |

### Estados obligatorios (skill ui-ux-pro-max)
- **Loading:** skeletons (líneas `animate-pulse`) o spinner; nunca pantalla congelada.
- **Empty:** mensaje + acción, p. ej. "Sin órdenes hoy. Crear una →".
- **Error:** `role="alert"` + mensaje claro + camino de recuperación ("Reintentar" / link de ayuda). Nunca solo borde rojo.
- **Focus:** anillo visible `focus-visible:ring-2 ring-accent`; nunca `outline:none` sin reemplazo.

## 6. Reglas de Interacción

| Regla | Detalle |
|-------|---------|
| Cursor pointer | `cursor-pointer` en todo elemento clicable |
| Hover | Feedback visual en 150–300ms (`transition-colors duration-200`); sin scale que desplace layout |
| Keyboard-first POS | `BarcodeInput` con autofocus; Enter agrega al carrito; `F2` guardar venta; `Esc` cancelar modal |
| Formularios | Componentes controlados (`value` + `onChange`); submit en `<form onSubmit>`; labels con `htmlFor` (placeholder ≠ label) |
| Números | Inputs de moneda con máscara y separador de miles; nunca permitir `e`, `+`, `-` en cantidades |
| Descuentos | Input de descuento con badge del límite por rol (vendedor ≤10%); bloqueo visual + tooltip si excede |
| Impresión | El ticket se envía al servicio de impresión; si falla, toast con "Reimprimir" (no bloquea la venta) |
| Reducción de movimiento | Respetar `prefers-reduced-motion` (desactivar animaciones de badges/toasts) |

## 7. Accesibilidad

- Contraste de texto ≥ 4.5:1 (modo claro y oscuro).
- Todos los campos con `<label>` asociado; errores con `aria-live`/`role="alert"`.
- Estados no representados solo por color: `StatusBadge` incluye texto/ícono.
- Navegación por teclado completa: tab order lógico, skip-link al contenido.
- Responsive: 375, 768, 1024, 1440px; sin scroll horizontal en móvil; tablas con scroll horizontal en pantallas pequeñas.

## 8. Flujos de Pantalla (clave)

### 8.1 Flujo POS (Venta)
```
Login → Dashboard (CTA Venta) → SaleScreen
  1. BarcodeInput (autofocus) o búsqueda por nombre → ProductTable
  2. Enter agrega a Cart → ajuste de cantidad/descuento (validado por rol)
  3. PaymentModal: método → si crédito: muestra límite y saldo del cliente, bloquea si excede
  4. TicketPreview → imprimir → toast success → SaleScreen se limpia (stock ya descontado)
```

### 8.2 Flujo Orden de Servicio (recepción → entrega)
```
Nueva orden (wizard) → cliente (buscar/crear) → datos del equipo → folio + ticket
  → Técnico: estado en_diagnostico → diagnostico → cotización (líneas piezas+MO)
  → Vendedor: notificar cotización (NOT-03) → cliente aprueba en tienda → reserva stock
  → Técnico: en_reparacion → consumo de piezas → listo
  → Vendedor: notificar listo (NOT-02) → cobro en POS → entregar + SignatureCanvas (PNG obligatorio) → garantía 30d
```
- `SignatureCanvas` aparece en el paso de entrega; la firma es obligatoria para cerrar la orden (`entregado`).
- `StatusBadge` siempre visible en listas y detalle; `retrasada` destaca en rojo con fecha prometida.
- Timeline de la orden (historial) como stepper vertical con usuario y fecha.

## 9. Guía de Búsquedas/Iconos

- Iconos **Lucide** (SVG, viewBox 24, `w-5 h-5` uniforme). Sin emojis como iconos.
- Marcas (WhatsApp, Meta) desde Simple Icons con rutas oficiales.
- Íconos de acción por contexto: cobrar `wallet`, ticket `receipt`, reparación `wrench`, cliente `user`, retraso `alert-triangle`.

## 10. Checklist de Entrega (por pantalla)

- [ ] Sin emojis como iconos; set de iconos consistente
- [ ] `cursor-pointer` en clicables; hover con transición 150–300ms sin layout shift
- [ ] Foco visible para teclado; contraste ≥ 4.5:1 en ambos modos
- [ ] Estados loading (skeleton), empty (con acción) y error (con recuperación) implementados
- [ ] Formularios con labels, errores con `role="alert"`, submit en `<form>`
- [ ] Responsive 375/768/1024/1440 sin scroll horizontal
- [ ] Impresión de ticket probada en impresora térmica 80mm
- [ ] `prefers-reduced-motion` respetado

---

> Referencias: flujos de negocio en `03-business-rules.md`; rutas y módulos en `04-architecture.md`.
