# ARCHITECTURE

## Dependency Graph

```
React SPA ──REST/JSON──► Express API ──pg──► PostgreSQL 16
Express API ──► Workers (setInterval: retrasos/hora, garantías/día, refresh-cleanup/día)
Worker ──SMTP──► Correo (sin SMTP → simulado en consola)
Producción (docker-compose.prod.yml): caddy (TLS) → web(nginx) → api → db · backup (pg_dump diario, BR-DAT-01)
```

## Server Modules

| Module | Path | Responsibility | Depends On |
|--------|------|---------------|------------|
| auth | `src/modules/auth/` | login, refresh rotado (refresh_tokens), logout, housekeeping | shared, usuarios |
| auditoria | `src/modules/auditoria/` | bitácora de eventos críticos (GET paginado admin) | shared |
| catalogos | `src/modules/catalogos/` | árbol de catálogos (4 niveles, tags) CRUD admin | shared |
| compras | `src/modules/compras/` | proveedores, OC, recibir, CxP, reabastecimiento, solicitudes | inventory, services, notifications |
| configuracion | `src/modules/configuracion/` | clave/valor (iva, tiempos, tolerancia, garantías) | shared |
| crm | `src/modules/crm/` | clientes, historial, etiquetas, CxC saldo | shared |
| dashboard | `src/modules/dashboard/` | KPIs de inicio | inventory, services, sales |
| finance | `src/modules/finance/` | caja, corte/cierre, ingresos/egresos, CxC/CxP | sales, compras |
| garantias | `src/modules/garantias/` | garantías, worker diario de vencimiento | crm, services, sales |
| inventory | `src/modules/inventory/` | productos, stock, movimientos, ajustes, BOM, import/export, sugerencias, **usados** | catalogos |
| notifications | `src/modules/notifications/` | plantillas (NOT-02/03/05/06), envío, historial | crm, services |
| quote | `src/modules/quote/` | cotizaciones de venta (CV-) y conversión a venta | inventory, crm, sales |
| reports | `src/modules/reports/` | reportes agregados + export CSV/XLSX | inventory, sales, finance, services |
| sales | `src/modules/sales/` | POS, tickets, descuentos, crédito, devolución, cancelación | inventory, crm, finance |
| services | `src/modules/services/` | órdenes, máquina de estados, cotización, consumo, entrega, **sustituciones** | inventory, crm, notifications, compras |
| usuarios | `src/modules/usuarios/` | CRUD usuarios, cambio de rol/password | shared |
| shared | `src/shared/` | db pool, AppError, zod utils, money, auditoria, jwt, export | — |

## Client Routes

| Route | Page | Admin-only |
|-------|------|-----------|
| /login | LoginPage | — |
| / | DashboardPage | — |
| /venta | VentaPage (POS) | — |
| /ventas | VentasPage | — |
| /cotizaciones | CotizacionesPage | — |
| /ordenes · /ordenes/:id | OrdenesPage · OrdenDetallePage | — |
| /clientes · /clientes/:id | ClientesPage · ClienteDetallePage | — |
| /productos | ProductosPage | — |
| /caja · /finanzas | CajaPage · FinanzasPage | — |
| /proveedores · /compras · /compras/nueva · /compras/:id | Proveedores · Compras · NuevaCompra · CompraDetalle | — |
| /garantias | GarantiasPage | — |
| /reabastecimiento | ReabastecimientoPage | sí |
| /catalogos | CatalogosPage | sí |
| /usuarios | UsuariosPage | sí |
| /notificaciones | NotificacionesPage | sí |
| /configuracion | ConfiguracionPage | sí |
| /auditoria | AuditoriaPage | sí |
| /reportes | ReportesPage | sí |

## Data Flow (reparación con sustitución)

```
1. Vendedor → POST /ordenes → services → db → 201 (folio)
2. Técnico → POST /ordenes/:id/diagnostico → PATCH estado (en_diagnostico)
3. Técnico → POST /ordenes/:id/cotizaciones (líneas refacción + mano de obra)
4. Vendedor → POST /cotizaciones/:cid/aprobar → inventory (RESERVA) → notifications (NOT-03)
5. Técnico (sin stock en una línea) → POST /ordenes/:id/sustituciones → orden=sustitucion_pendiente → NOT-06
6. Cliente acepta → POST /sustituciones/:sid/aceptar (línea = precio sustituto, recalcula total; reservas: libera original, reserva sustituto)
   Cliente rechaza → POST /sustituciones/:sid/rechazar → crea solicitud reabastecimiento (NOT-05) → orden vuelve
7. Técnico → PATCH estado (en_reparacion) → POST /consumo (SALIDA_CONSUMO, libera reserva)
8. Técnico → PATCH estado (listo) → vendedor notifica (NOT-02)
9. Admin recibe OC (completa o por parciales) → stock += , CxP por lo recibido; al completarse la línea las solicitudes aprobadas de esa OC → entregada + historial "Refacción X llegó · OC …"
10. Vendedor → POST /ordenes/:id/entregar (firma PNG base64) → garantía
```

## State Machine (orden)

```
pendiente → en_diagnostico → cotizado → en_reparacion → listo → entregado
   │            │              │  ↘↗      │             │
   └────cancelado◄┴──────────────┴──┤      └──cancelado──┘
                                     └ sustitucion_pendiente (pausa no final)
```
Transiciones y roles: `services/estados.ts` y docs/03 §4.

## Component Tree (OrdenDetalle)

```
OrdenDetallePage
├── StatusBadge (estado + retrasada)
├── Banner sustitucion_pendiente (pausa)
├── Líneas de cotización → botón "Sustituir" (sin stock) → SustitucionDialog
├── Tarjeta Sustituciones (aceptar / rechazar / cancelar)
├── "Solicitar refacción"
└── Historial (timeline con estados)
```
