# ARCHITECTURE

## Dependency Graph

```
React SPA ──REST/JSON──► Express API ──pg──► PostgreSQL 16
Express API ──► Worker (node-cron: retrasos/hora, garantías/día)
Worker ──SMTP──► Correo · Worker ──Twilio──► WhatsApp
SPA ──ESC/POS 9100──► Print service (local)
```

## Server Modules

| Module | Path | Responsibility | Depends On |
|--------|------|---------------|------------|
| auth | `server/src/modules/auth/` | login, JWT, refresh, roles | shared |
| inventory | `server/src/modules/inventory/` | productos, stock, reservas, movimientos, ajustes, BOM | shared |
| crm | `server/src/modules/crm/` | clientes, historial, etiquetas, CxC saldo | shared |
| services | `server/src/modules/services/` | órdenes, estados, diagnóstico, cotización, consumo, entrega | inventory, crm, notifications |
| sales | `server/src/modules/sales/` | POS, tickets, descuentos, crédito, devolución, cancelación | inventory, crm, finance, services |
| purchases | `server/src/modules/purchases/` | proveedores, compras, entrada, CxP | inventory, finance |
| finance | `server/src/modules/finance/` | caja, corte/cierre, ingresos/egresos, CxC/CxP | sales, purchases |
| notifications | `server/src/modules/notifications/` | plantillas, envío, historial, reintentos | crm |
| reports | `server/src/modules/reports/` | reportes agregados, exportación | inventory, sales, finance |
| shared | `server/src/shared/` | db pool, AppError, zod, money utils, auditoria | — |

## Client Routes

| Route | Layout | User | Nav Items |
|-------|--------|------|-----------|
| /venta | MainLayout | vendedor | POS (carrito + pago + ticket) |
| /clientes | MainLayout | vendedor/admin | listado, detalle, historial |
| /productos | MainLayout | vendedor/admin | listado, alta/edición, BOM |
| /inventario | MainLayout | admin | ajustes, movimientos |
| /ordenes | MainLayout | vendedor/admin | listado, wizard nueva, detalle |
| /ordenes/:id/reparacion | MainLayout | tecnico | diagnóstico, consumo, MO |
| /compras | MainLayout | admin | proveedores, compras, entrada |
| /caja | MainLayout | vendedor | corte de caja |
| /finanzas | MainLayout | admin | CxC/CxP, egresos |
| /reportes | MainLayout | admin | reportes + export |
| /configuracion | MainLayout | admin | plantillas, parámetros |
| /usuarios | MainLayout | admin | CRUD usuarios |

## Data Flow (Main Use Case: reparación)

```
1. Vendedor → POST /ordenes → services → db → 201 (folio)
2. Técnico → PATCH /ordenes/:id/estado (en_diagnostico)
3. Técnico → POST /ordenes/:id/cotizaciones → services (neto+IVA)
4. Vendedor → POST /cotizaciones/:id/aprobar → inventory (RESERVA) → notifications (NOT-03)
5. Técnico → PATCH estado (en_reparacion) → POST /ordenes/:id/consumo (SALIDA_CONSUMO, libera reserva)
6. Técnico → PATCH estado (listo) → vendedor notifica (NOT-02)
7. Worker/hora → detecta retraso → marca retrasada → notifications (NOT-01)
8. Vendedor → POST /ventas (cobro) → POST /ordenes/:id/entregar → garantia 30d
```

## State Machine (orden)

```
pendiente → en_diagnostico → cotizado → en_reparacion → listo → entregado
   │            │              │           │             │
   └──cancelado◄┴──────────────┘           └──cancelado──┘
```
Transiciones: docs/03-business-rules.md §4. `retrasada` = derivado (flag, no transición).

## Component Tree (POS)

```
SaleScreen
├── Sidebar (búsqueda cliente, nav)
├── ProductSearch
│   ├── BarcodeInput (autofocus, Enter)
│   └── ProductResults[]
├── Cart
│   ├── CartItem[] (cantidad, descuento por línea)
│   └── Totals (subtotal, IVA 16%, total)
├── PaymentPanel
│   ├── PaymentMethodSelector
│   ├── CreditCheck (límite cliente)
│   └── ChangeCalculator
└── TicketPreview → PrintService
```
