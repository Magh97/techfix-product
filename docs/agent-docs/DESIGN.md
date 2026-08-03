# DESIGN

Fuente completa: `docs/07-ux-ui-guidelines.md`. Tokens de diseño (shadcn/ui + Tailwind 4).

## Colors (dark = base)

```
bg: #020617    surface: #0F172A    surface-2: #1E293B    border: #334155
text: #F8FAFC  text-muted: #94A3B8  primary: #22C55E    accent: #3B82F6
```

## Status → Color Map

```
estado_orden:
  pendiente → neutral (border) · en_diagnostico → info/accent · cotizado → warning
  en_reparacion → info/accent · listo → success/primary · entregado → success/primary
  cancelado → danger · retrasada (flag) → danger
stock: low_stock → warning · pagos/cobros → success · error/vencido → danger · pending → info
```

## Light Mode (recomendado POS)

```
bg: #F8FAFC  surface: #FFFFFF  border: #E2E8F0  text: #0F172A  text-muted: #475569
```

## Typography

```
xs:12px  sm:14px  base:16px  lg:18px  xl:20px  2xl:24px  3xl:30px  4xl:36px
Fonts: Poppins (display/headings 600) · Open Sans (body 400/600) · JetBrains Mono (folios/códigos 13px)
```

## Spacing

```
Touch: min 48x48px, p-3/p-4 (POS/tablet)
Click: min 32x32px, p-2/p-3
Escala base 4px; contenedor max-w-7xl
```

## Radius / Shadows

```
radius-sm: 6px  radius: 8px  radius-lg: 12px  radius-full: 9999px
shadow-sm: 0 1px 2px rgb(0 0 0 / 0.1)  shadow-md: 0 4px 6px rgb(0 0 0 / 0.1)
```

## Icons

```
Library: lucide-react · Import: import { Wrench } from 'lucide-react' (sin import *)
Sizes: header/nav w-5 h-5 · acciones w-4 h-4 · empty/status w-6 h-6
```

## Layouts (clases)

```
POS (2 columnas): grid grid-cols-[1fr_400px] gap-4 → ProductSearch | Cart(sticky top-4)
MainLayout: fixed sidebar w-64 + content lg:pl-64 max-w-7xl mx-auto p-6
Header: sticky top-0 z-10 bg-surface/80 backdrop-blur · mostrar usuario, rol, caja del día
```

## States

```
LOADING: skeleton → <div className="animate-pulse bg-surface-2 h-4 rounded" /> (nunca pantalla congelada)
EMPTY:   ícono + "Sin órdenes hoy." + CTA button
ERROR:   <div role="alert" className="border border-danger text-danger rounded-md p-3"> + "Reintentar" / ayuda
FOCUS:   focus-visible:ring-2 focus-visible:ring-accent
```

## Accessibility Checklist
- Contraste texto ≥ 4.5:1 en ambos modos (required)
- Labels con htmlFor en todo input (required)
- Errores con role="alert" / aria-live (required)
- Estados no solo por color (texto/ícono en StatusBadge) (required)
- Keyboard: BarcodeInput autofocus, Enter agrega item, F2 guardar venta, Esc cierra modal (required)
- prefers-reduced-motion: desactivar animaciones (required)
- Responsive 375/768/1024/1440 sin scroll horizontal (required)
