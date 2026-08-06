# Changelog

Todos los cambios notables de este proyecto se documentan aquí.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el proyecto usa [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

## [1.0.0] — 2026-08-06

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
- **Recepción parcial por línea de OC (US-COM-03/04):** `POST /compras/:id/recibir` con body opcional (`{ lineas: [{ detalleCompraId, cantidadRecibida }] }`); sin body recibe todo lo pendiente. La OC se mantiene en `enviada` con badge "Recepción parcial" hasta completar todas las líneas. **CxP acumulada por lo recibido** (`compras.total_recibido`) y pagos habilitados desde la primera recepción; solicitudes aprobadas → `entregada` **al completarse la línea** y **solo las ligadas a esa OC**; cancelar una OC con recepción parcial conserva stock y CxP; sobrerecepción bloqueada (422 `SOBRE_RECEPCION`). Migración `0012_recepcion_parcial`.
- **Comparación de precios entre proveedores (US-COM-05):** `GET /compras/comparacion-precios?productoId=` (admin) con el último precio por proveedor (OCs enviadas/recibidas), precio de compra actual como referencia y flags favorito/más barato/inactivo/por debajo del actual; botón "Comparar" en Productos.
- **Equipos usados (US-INV-07):** tabla `equipos_usados` (origen, cliente origen, valor de parte de pago); `POST/GET/PUT /usados` (admin) que crean el producto bajo la raíz "Usado" con movimiento `ENTRADA`; estado derivado del stock (disponible/vendido); página `/usados` con filtros. Migración `0013_equipos_usados`.
- **Garantía automática por venta de producto (BR-GAR-06):** al vender con cliente se genera **una garantía por producto distinto** (`producto_nuevo` 30d / `usado` 15d, configurable vía `ventas.dias_garantia_producto`/`ventas.dias_garantia_usado`); la respuesta de la venta incluye `garantias` y el ticket las muestra en el pie. Ventas a mostrador sin garantía.
- **Parte de pago en POS (BR-VEN-13):** aceptar un equipo usado como parte de pago en ventas de **contado** — crea el usado (raíz "Usado", stock 1, precio de reventa obligatorio, `equipos_usados.venta_id`) y reduce el efectivo/terminal a recibir (`ventas.parte_de_pago`); el **corte de caja** excluye el trade-in del efectivo y lo desglosa como ingreso no monetario. Migración `0014_trade_in`.
- **Usados desde órdenes + historial CRM (BR-US-07):** botón "Registrar usado" en el detalle de órdenes no entregadas (admin) que vincula el equipo abandonado a la orden (`origen='reparacion'`, nota en `historial_orden`); el listado de usados expone `ordenFolio`/`ventaFolio` y el detalle del cliente muestra la tarjeta "Equipos usados entregados".
- **Fase producción:** seed **condicional** (`SEED_DEMO=false` no crea usuarios/datos demo; bootstrap esencial siempre), `docker-compose.prod.yml` con **Caddy** (TLS) y servicio **backup** (pg_dump diario con retención, BR-DAT-01), `scripts/backup-loop.sh`/`restore.sh`, `.env.production.example`, job **deploy** en CI para `main` (SSH + compose up --build) y runbook `docs/09-despliegue.md` (incl. notas YunoHost).
- **Pagos mixtos en el POS (BR-VEN-02/14):** desglose de pago en ventas de contado (varios métodos, Σ = total − parte de pago) con `pagos` registrando todo el dinero recibido (venta y abonos); el **corte de caja** cuenta solo dinero realmente recibido (Σ `pagos`) y el ticket muestra el desglose.
- **Quejas y reclamaciones (US-CRM-07/BR-CRM-08):** módulo `quejas` (abierta → en_proceso → resuelta) con vínculo opcional a garantía/orden/venta; reclamación de garantía exige garantía del cliente; resolución obligatoria al resolver; botón "Reclamar" en Garantías y tarjeta en el historial del cliente. Migración `0015_quejas`.
- **Cancelación y devolución de ventas (US-VEN-11/12):** botones "Cancelar venta" (admin, motivo) y "Devolver" (cantidades por línea, motivo opcional) en el ticket de Ventas; bloqueo de ventas a crédito con abonos cobrados (`SALE_WITH_PAYMENTS`); reintegro del equipo usado de parte de pago al cancelar/devolver; corrección del mapeo de `lineas` en el historial (`productoId`/`descripcion`/`precio`). Reembolso/nota de crédito diferido.

### Limitaciones conocidas
- Notificaciones solo por **correo** (nodemailer/SMTP); `preferencia_contacto=whatsapp` aún no envía por WhatsApp (ADR-0007: Twilio diferido).
- **Export PDF** no disponible: los reportes exportan CSV y XLSX únicamente.
- **Backup offsite** documentado (rclone) pero no automatizado; el respaldo diario queda en el volumen local del VPS.
- **Nota de crédito / reembolso en devoluciones**: la devolución restituye inventario; el dinero se gestiona fuera del sistema.
- **Abonos mixtos en crédito** (dividir un abono en varios métodos) no implementado.
- **Proveedor más barato** en reabastecimiento no priorizado (la comparación de precios existe en Compras).
- NOT-01 (aviso de retraso) notifica por el canal configurado; sin WhatsApp sigue siendo correo.
- Empaquetado YunoHost sin realizar (ruta recomendada: VPS + Docker Compose + Caddy).

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
