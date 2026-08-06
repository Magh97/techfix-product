# DESIGN

Fuente completa: `docs/07-ux-ui-guidelines.md` y `client/src/index.css` (@theme).

## Theme Tokens (Tailwind 4 @theme, light)
```
background: #f8fafc   surface: #ffffff   surface-2: #f1f5f9   surface-3: #e2e8f0
border-line: #e2e8f0  foreground: #0f172a  muted: #475569  faint: #94a3b8
primary: #16a34a      primary-strong: #15803d  primary-soft: #dcfce7
accent: #2563eb       accent-soft: #dbeafe
danger: #dc2626       danger-soft: #fee2e2
warning: #d97706      warning-soft: #fef3c7
radius: lg:14px  md:10px  sm:8px
font-sans: "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif
```

## Status → Color Map
```
estado_orden (StatusBadge):
  pendiente → default (neutral) · en_diagnostico → accent · cotizado → warning
  en_reparacion → accent · sustitucion_pendiente → warning · listo → success
  entregado → success · cancelado → danger
  retrasada (flag) → danger (sustituye al badge de estado salvo entregado/cancelado)
solicitud_reabastecimiento: pendiente → default · aprobada → accent · entregada → success · rechazada/cancelada → danger
compra: borrador → default · enviada → accent · recibida → success · cancelada → danger
stock: low_stock → warning · pago/vencido → danger · pagado → success
```

## Typography
```
xs:12px  sm:14px  base:16px  lg:18px  xl:20px  2xl:24px  3xl:30px  4xl:36px
Font: Plus Jakarta Sans (base). Mono para folios/códigos: font-mono text-xs.
```

## Spacing
```
Touch: min 48x48px, p-3/p-4 (POS/tablet)
Click: min 32x32px, p-2/p-3
Escala base 4px; contenedor main max-w-6xl p-6
```

## Layouts
```
Sidebar: fixed inset-y-0 left-0 w-60 bg-foreground text-white + nav p-3
Content: ml-60, header sticky top-0 h-14 border-b bg-surface/90 backdrop-blur, main max-w-6xl p-6
POS: carrito + búsqueda en columnas (grid)
```

## States
```
LOADING: skeleton → <div className="animate-pulse bg-surface-2 h-4 rounded" /> (nunca pantalla congelada)
EMPTY:   ícono + mensaje + CTA button
ERROR:   <div role="alert" className="border border-danger text-danger rounded-md p-3"> + "Reintentar"
FOCUS:   focus-visible ring (accent)
```

## Accessibility Checklist
- Contraste ≥ 4.5:1 (required)
- Labels con htmlFor en todo input (required)
- Errores con role="alert" / aria-live (required)
- Estados no solo por color (texto/ícono en badges) (required)
- Keyboard: escáner autofocus + Enter, Esc cierra diálogos (required)
- prefers-reduced-motion: desactivar animaciones (required)
