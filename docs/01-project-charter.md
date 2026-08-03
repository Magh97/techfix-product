# Project Charter: Sistema de Administración — Tienda de Cómputo

## Objective
Sistema integral web para un negocio de mantenimiento, reparación, ensamblado y venta de equipo de cómputo; centraliza inventario, órdenes de servicio, CRM, punto de venta, compras y finanzas. Los clientes no usan el sistema (interacción presencial + tickets + notificaciones por correo/WhatsApp).

## MVP Scope (Must)
- INV-01..04: registro, edición, consulta de stock con alertas de stock mínimo
- CRM-01..04: registro, búsqueda, edición, historial del cliente
- SER-01..10: órdenes de servicio de principio a fin (crear → diagnosticar → cotizar → reparar → entregar)
- VEN-01, VEN-02, VEN-07, VEN-09: venta de producto/servicio, método de pago, ticket
- FIN-01..03: ingresos, egresos, corte de caja diario
- NOT-02: notificación manual de "equipo listo"
- Autenticación por usuario/contraseña con roles (admin, vendedor, técnico)

## Out of Scope (Won't — explicit)
- Portal web o app móvil para clientes
- Facturación electrónica (CFDI) — fase futura
- Integración con sistemas contables externos
- Nómina y RRHH
- E-commerce o tienda en línea

## Actors
| Actor | Device | Access |
|-------|--------|--------|
| Administrador | PC Desktop, navegador | Acceso total: usuarios, configuración, reportes avanzados, catálogos |
| Vendedor / Recepcionista | PC o tablet con navegador + lector de código de barras + impresora térmica | Clientes, órdenes de servicio, ventas, cobros, entregas, notificaciones |
| Técnico | PC o tablet con navegador | Diagnóstico, estados de orden, consumo de refacciones, mano de obra |

## Modules
| Module | Responsibility | Priority | Phase |
|--------|----------------|----------|-------|
| Inventario | Productos, componentes, equipos, ajustes, movimientos | P0 | 1 |
| CRM | Clientes, historial, segmentación, garantías | P0 | 1 |
| Servicios Técnicos | Órdenes de servicio, diagnóstico, cotización, reparación, ensamblado | P0 | 1 |
| Ventas | Punto de venta, cotizaciones, tickets, descuentos, crédito, devoluciones | P0 | 1 |
| Compras | Proveedores, órdenes de compra, entradas de mercancía | P1 | 2 |
| Finanzas | Ingresos/egresos, corte y cierre de caja, CxC/CxP | P0 | 1 |
| Reportes | Inventario, ventas, servicios, rentabilidad, clientes, finanzas | P1 | 2 |
| Notificaciones | Retrasos, equipo listo, cotizaciones, garantías, plantillas | P1 | 2 |

## Roadmap
| Phase | Duration | Features | Depends On |
|-------|----------|----------|------------|
| Fase 1 — MVP | 4-6 weeks | INV-01..04, CRM-01..04, SER-01..10, VEN-01/02/07/09, FIN-01..03, NOT-02 | — |
| Fase 2 — Consolidación | 3-4 weeks | INV-05..08, CRM-05..07, SER-11/12, VEN-04..06/08/10, COM-01..04, NOT-01/03, REP-01..03 | Fase 1 |
| Fase 3 — Optimización | 3-4 weeks | VEN-11/12, COM-05/06, FIN-04..07, REP-04..07, NOT-04..06, Configuración | Fase 2 |
| Fase 4 — Escalabilidad | Futuro | CFDI, WhatsApp Business API oficial, dashboard tiempo real, app móvil interna | Fase 3 |

## Top Risks
| Risk | Type | Probability | Impact | Mitigation |
|------|------|-------------|--------|------------|
| WhatsApp API (Twilio/Meta) requiere plantillas aprobadas | Integración | Medium | Alto — NOT-01/03 bloqueados | Fallback a correo + registro manual; definir plantillas temprano |
| Pérdida de inventario por ventas sin stock o descuentos sin control | Negocio | Medium | Alto | Bloquear stock negativo; reserva al aprobar cotización; límites de descuento por rol |
| Vendedores/técnicos sin experiencia técnica | Usabilidad | Medium | Alto | UI guiada por flujo (wizard), búsqueda por folio/teléfono, validaciones claras |
| Impresora térmica (ESC/POS 58/80mm) inconsistente entre equipos | Técnico | Medium | Medio | Capa de impresión aislada, formato ticket estándar, pruebas por modelo |
| Datos financieros incorrectos (corte de caja) | Negocio | Medium | Alto | Corte por usuario, arqueo cierre de caja, auditoría de movimientos |
| Escalamiento a 100k productos / 50k órdenes | Técnico | Low | Medio | Índices desde diseño, paginación, particionamiento de movimientos |

## Stack (inferred/suggested)
| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + Vite | POS web en PC/tablet; ecosistema maduro, tree-shaking |
| Backend | Node.js + Express | API REST ligera; mismo lenguaje que frontend |
| Base de datos | PostgreSQL | Relacional, integridad referencial, transacciones para reservas/inventario |
| Impresión tickets | Biblioteca ESC/POS (node-thermal-printer) | Compatible impresoras térmicas 58/80mm |
| Notificaciones WhatsApp | Twilio WhatsApp API | Envío automático con plantillas aprobadas |
| Correo | SMTP (luego SendGrid/Mailgun) | Notificaciones de retraso y cotizaciones |
| Despliegue | VPS (Docker) + respaldo diario | Costo bajo, control total |

## Key Decisions (ADR candidates)
| Decision | Options Considered | Choice | Rationale |
|----------|--------------------|--------|-----------|
| Stack | React/Node vs React/FastAPI vs ASP.NET | React + Node/Express + PostgreSQL | Un solo lenguaje, despliegue simple en VPS |
| Inventario | Stock libre vs bloqueo | Bloquear venta sin stock | Evita sobreventa y pérdidas |
| Reservas | Descontar al consumir vs reservar al aprobar | Reservar al aprobar cotización + descontar al consumir | Garantiza piezas disponibles para reparación |
| Precios | Incluir IVA vs netos | Netos + 16% al vender | Desglose correcto en ticket sin CFDI |
| Crédito | Sin límite vs límite/plazo | Límite $3,000 default (ampliable) + plazo 15 días | Control de cuentas por cobrar |
| Descuentos | Libre vs por rol | Vendedor ≤10%, admin ilimitado | Control de margen |
| Ensamblado | Producto compuesto vs BOM | BOM/kit que desglosa componentes | Descuenta inventario real y muestra detalle en ticket |
| Garantías | Default global vs por tipo | Nuevo 30d, servicio 30d, usado 15d | Alineado a práctica del negocio |

## Decisiones Resueltas (2026-08-03)
- Límite de crédito default: **$3,000 MXN** por cliente, ampliable individualmente
- Plazo de crédito default: **15 días**
- Tolerancia de retraso: **1 día calendario (incluye domingo)**; se notifica el día siguiente a exceder `fecha_prometida`
- CFDI: **fuera de alcance** (decisión explícita; fase futura)
- WhatsApp: **Twilio** (ADR-0006 vigente)
- Firma de recepción (SER-10): **canvas táctil → PNG/base64**
- Permisos: **solo 3 roles** (sin tabla granular)
- Corte de caja: **1 corte por día por usuario**

## Undefined
- [ ] Emisión de CFDI y requisitos fiscales (Fase 4 futura)
- [ ] Migración de Twilio a WhatsApp Business API oficial (Fase 4)
