# Changelog

Todos los cambios notables de este proyecto se documentan aquí.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el proyecto usa [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### Added
- Ensamblado de PCs por BOM (ADR-0003): definición de kits con componentes y mano de obra de ensamble (`PUT /productos/:id/bom`), precio recalculado como suma de componentes + ensamble, y venta de kits que desglosa líneas por componente y descuenta el stock real de cada pieza (US-SER-12, US-VEN-03).
- Migración `0003_ensamble` (columna `productos.mano_obra`).
- Cotizaciones de venta (US-VEN-04..06): folio `CV-`, vigencia configurable, descuentos con BR-VEN-05 y conversión a venta con validación de stock y método de pago (`/cotizaciones-venta`). Migración `0004_cotizaciones_venta`.
- **Sustitución de piezas con validación del cliente (A1b):** propuesta de sustituto desde `cotizado`/`en_reparacion` (solo sin stock y con sustituto sugerido con stock); estado `sustitucion_pendiente` en la máquina de estados; al aceptar se reemplaza la línea con el precio del sustituto y se recalculan totales; al rechazar se genera solicitud de reabastecimiento del original; NOT-06 al admin; al recibir la OC, las solicitudes pasan a `entregada` y se registra en el historial de la orden.
- Migración `0011_sustituciones` (tabla `sustituciones` + `estado_orden 'sustitucion_pendiente'`).
- **Reabastecimiento (A1a):** sugerencias por proveedor (`stock_maximo`/`stock_minimo ×2`, favorito → último proveedor → sin proveedor, "Ya en OC"), creación de OC agrupada por proveedor; **solicitudes de reabastecimiento** de técnicos (pendiente/aprobada/entregada/rechazada/cancelada) con NOT-05 y aprobación que crea OC.
- Migración `0010_reabastecimiento` (`stock_maximo`, `proveedor_favorito_id`, `solicitudes_reabastecimiento`).
- **Taxonomía unificada (B1):** categorías = raíces del árbol de catálogos (máx 4 niveles), especificaciones como tags con índice GIN, `tags_sugeridas`/`tags_compatibilidad`, raíz "General", sustitución por tags y seed de 4 niveles.
- Migraciones `0008_unify_taxonomia` y `0009_especificaciones_tags`.
- **Auditoría (B3):** módulo `auditoria` con listado paginado y filtros para admin (BR-ROL-05).
- **Paginación (B4):** componente `Pagination` con selector 10/25/50 en todas las tablas de listado.
- **Housekeeping de sesiones (B2):** tabla `refresh_tokens` con rotación/revocación y worker diario que elimina tokens vencidos/revocados; migración `0007_refresh_tokens`.
- Usuario demo `tecnico/tecnico1234` en el seed.
- Manual de usuario en `docs/08-manual-usuario.md`.
- **Impresión térmica del ticket (US-VEN-09/US-VEN-10):** formato de recibo 80mm (fuente mono, folio, líneas, subtotal/IVA/total, cambio, vencimiento) vía `window.print()` con `@media print` que aísla el recibo del resto de la app; reimpresión desde Ventas marcada como "COPIA".

## [0.1.0] — 2026-08-03

### Added

**Infraestructura**
- Monorepo pnpm (workspaces `server` + `client`), TypeScript base y lockfile (`71d4529`)
- API Express 5 con migraciones SQL propias, seed y tests (Vitest) (`19a8a95`, `741d719`)
- SPA React 19 (Vite + Tailwind 4 + TanStack Query) con design system propio (`e8da587`, `8246674`, `08bf97a`)
- Docker Compose + Dockerfiles multi-stage (`d308482`)
- CI con GitHub Actions: lint, typecheck, migrate, seed, test y build (`7ae911f`)

**Autenticación y catálogo**
- Auth con JWT (access + refresh) y roles admin/vendedor/técnico (`563ed1c`, `8953376`)
- CRUD de productos con SKU, código de barras, precios y stock (`563ed1c`)
- CRUD de clientes con historial, saldo y preferencias de contacto (`cc77e0c`)

**Servicios técnicos**
- Órdenes de servicio con máquina de estados (pendiente → diagnóstico → cotizado → reparación → listo → entregado) (`d48b7a6`)
- Folios correlativos por año, diagnóstico, cotizaciones, reserva/consumo de stock y garantía de servicio (`d48b7a6`)
- Worker horario que marca automáticamente las órdenes retrasadas (US-SER-09) (`b1786f1`)

**Ventas y finanzas**
- Punto de venta (contado/crédito), abonos, cancelación y devolución con reversión de inventario (`cc77e0c`)
- Ticket de venta en pantalla (US-VEN-09: impresión ESC/POS pendiente) (`30699b9`)
- Caja: apertura, corte, cierre con arqueo, ingresos/egresos y cuentas por cobrar (`cc77e0c`)

**Compras**
- Proveedores, órdenes de compra (borrador → enviada → recibida), entrada de mercancía y CxP (`387fd5c`)

**Notificaciones**
- Envío de notificaciones por correo para NOT-02 (equipo listo) y NOT-03 (cotización) con auditoría en BD y plantillas configurables (`516329b`)
- Simulación de envío en desarrollo sin SMTP configurado

**Frontend**
- Páginas: login, dashboard, productos, órdenes, POS, clientes, caja/finanzas, compras y proveedores (`08bf97a`, `ecb0549`, `30699b9`, `db7ea34`)
- Alerta visual de stock bajo en el catálogo (US-INV-04) (`bb23447`)

**Documentación y diseño**
- Planeación, backlog, reglas de negocio, arquitectura C4, modelo de datos, diseño de API y ADRs (`b0c2e3a`, `9c0cb14`, `dd3082c`, `bd2fea6`, `62c343b`)
- Guías UI/UX, documentación agent-optimized y wireframes navegables (`41d6bd9`, `62a886c`, `2c95d41`, `82cd8ba`)

### Fixed
- Configuración de pnpm 11 para permitir build scripts de esbuild (`235f46a`)
- `retrasada` se recalcula al cambiar estado de una orden, evitando resetearla en órdenes aún vencidas (`b1786f1`)

### Test
- Tests de integración: ciclo de orden de servicio, liberación de reservas, POS, caja, compras y CxP (`741d719`, `2f555de`, `fd23c7d`, `3e78d6b`)
- Tests de notificaciones: plantillas, mailer simulado y flujo NOT-02/NOT-03 (`244dede`)
- Test del worker de retrasos (`f9eea58`)
