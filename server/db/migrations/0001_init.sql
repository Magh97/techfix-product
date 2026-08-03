-- ============================================================
-- 0001_init.sql — Esquema inicial (docs/05-data-model.md)
-- ============================================================

CREATE TYPE rol AS ENUM ('admin', 'vendedor', 'tecnico');
CREATE TYPE tipo_producto AS ENUM ('componente', 'periferico', 'equipo_completo', 'refaccion', 'usado');
CREATE TYPE movimiento_tipo AS ENUM (
  'ENTRADA', 'SALIDA_VENTA', 'SALIDA_CONSUMO', 'AJUSTE', 'DEVOLUCION', 'RESERVA', 'LIBERACION'
);
CREATE TYPE estado_orden AS ENUM (
  'pendiente', 'en_diagnostico', 'cotizado', 'en_reparacion', 'listo', 'entregado', 'cancelado'
);
CREATE TYPE estado_linea_orden AS ENUM ('cotizada', 'reservada', 'consumida', 'liberada');
CREATE TYPE estado_cotizacion AS ENUM ('emitida', 'aprobada', 'rechazada', 'expirada', 'convertida');
CREATE TYPE tipo_linea_cotizacion AS ENUM ('refaccion', 'mano_obra');
CREATE TYPE estado_venta AS ENUM ('completada', 'cancelada', 'devuelta', 'credito_pendiente');
CREATE TYPE tipo_pago AS ENUM ('contado', 'credito');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'deposito');
CREATE TYPE estado_compra AS ENUM ('borrador', 'enviada', 'recibida', 'cancelada');
CREATE TYPE estado_caja AS ENUM ('abierta', 'cerrada', 'reabierta');
CREATE TYPE estado_notificacion AS ENUM ('enviado', 'fallido', 'reintento');
CREATE TYPE tipo_garantia AS ENUM ('producto_nuevo', 'servicio', 'usado');
CREATE TYPE preferencia_contacto AS ENUM ('whatsapp', 'correo', 'llamada');
CREATE TYPE tipo_equipo AS ENUM ('laptop', 'desktop', 'all_in_one', 'periferico', 'componente', 'otro');

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  usuario       VARCHAR(60) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol           rol NOT NULL DEFAULT 'vendedor',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE TABLE clientes (
  id                   SERIAL PRIMARY KEY,
  nombre               VARCHAR(120) NOT NULL,
  telefono             VARCHAR(20) NOT NULL,
  correo               VARCHAR(120),
  direccion            TEXT,
  preferencia_contacto preferencia_contacto NOT NULL DEFAULT 'whatsapp',
  limite_credito       NUMERIC(19,4) NOT NULL DEFAULT 3000 CHECK (limite_credito >= 0),
  plazo_credito_dias   INT NOT NULL DEFAULT 15 CHECK (plazo_credito_dias > 0),
  etiquetas            JSONB NOT NULL DEFAULT '[]',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ
);

CREATE TABLE proveedores (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(120) NOT NULL,
  contacto         VARCHAR(120),
  condiciones_pago TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE categorias (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(60) NOT NULL,
  tipo       tipo_producto NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE productos (
  id             SERIAL PRIMARY KEY,
  categoria_id   INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  sku            VARCHAR(60) UNIQUE NOT NULL,
  codigo_barras  VARCHAR(60) UNIQUE,
  nombre         VARCHAR(150) NOT NULL,
  marca          VARCHAR(80),
  modelo         VARCHAR(80),
  precio_compra  NUMERIC(19,4) NOT NULL CHECK (precio_compra >= 0),
  precio_venta   NUMERIC(19,4) NOT NULL CHECK (precio_venta >= 0),
  stock          INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo   INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  is_kit         BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);
CREATE INDEX idx_productos_codigo_barras ON productos (codigo_barras);
CREATE INDEX idx_productos_low_stock ON productos (stock_minimo, stock) WHERE is_active = true;

CREATE TABLE producto_bom (
  id              SERIAL PRIMARY KEY,
  kit_producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  componente_id   INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad        INT NOT NULL CHECK (cantidad > 0),
  UNIQUE (kit_producto_id, componente_id)
);

CREATE TABLE precio_historial (
  id            SERIAL PRIMARY KEY,
  producto_id   INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  precio_compra NUMERIC(19,4) NOT NULL,
  precio_venta  NUMERIC(19,4) NOT NULL,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ordenes_servicio (
  id              SERIAL PRIMARY KEY,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  folio           VARCHAR(20) UNIQUE NOT NULL,
  tipo_equipo     tipo_equipo NOT NULL,
  marca           VARCHAR(80),
  modelo          VARCHAR(80),
  serie           VARCHAR(80),
  accesorios      TEXT,
  falla_reportada TEXT NOT NULL,
  diagnostico     TEXT,
  estado          estado_orden NOT NULL DEFAULT 'pendiente',
  retrasada       BOOLEAN NOT NULL DEFAULT false,
  fecha_prometida DATE NOT NULL,
  fecha_entrega   DATE,
  tecnico_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  vendedor_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  firma_recepcion TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX idx_ordenes_folio ON ordenes_servicio (folio);
CREATE INDEX idx_ordenes_cliente_estado ON ordenes_servicio (cliente_id, estado);
CREATE INDEX idx_ordenes_retraso ON ordenes_servicio (fecha_prometida) WHERE retrasada = false;

CREATE TABLE historial_orden (
  id         SERIAL PRIMARY KEY,
  orden_id   INTEGER NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  estado     estado_orden NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  nota       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_historial_orden ON historial_orden (orden_id, created_at DESC);

CREATE TABLE cotizaciones (
  id             SERIAL PRIMARY KEY,
  orden_id       INTEGER REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  folio          VARCHAR(20) UNIQUE NOT NULL,
  estado         estado_cotizacion NOT NULL DEFAULT 'emitida',
  subtotal       NUMERIC(19,4) NOT NULL DEFAULT 0,
  iva            NUMERIC(19,4) NOT NULL DEFAULT 0,
  total          NUMERIC(19,4) NOT NULL DEFAULT 0,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE NOT NULL,
  creada_por     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_cotizacion (
  id                     SERIAL PRIMARY KEY,
  cotizacion_id          INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  tipo_linea             tipo_linea_cotizacion NOT NULL,
  producto_id            INTEGER REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad               INT CHECK (cantidad > 0),
  precio_neto            NUMERIC(19,4) NOT NULL CHECK (precio_neto >= 0),
  descripcion_mano_obra  TEXT,
  horas                  NUMERIC(6,2) CHECK (horas > 0),
  tarifa_hora            NUMERIC(19,4) CHECK (tarifa_hora >= 0)
);

CREATE TABLE detalle_orden (
  id             SERIAL PRIMARY KEY,
  orden_id       INTEGER NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  producto_id    INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad       INT NOT NULL CHECK (cantidad > 0),
  estado_linea   estado_linea_orden NOT NULL DEFAULT 'cotizada',
  costo_unitario NUMERIC(19,4) NOT NULL CHECK (costo_unitario >= 0)
);
CREATE INDEX idx_detalle_orden_reserva ON detalle_orden (producto_id) WHERE estado_linea = 'reservada';

CREATE TABLE cajas (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha           DATE NOT NULL,
  estado          estado_caja NOT NULL DEFAULT 'abierta',
  efectivo_fisico NUMERIC(19,4),
  diferencia      NUMERIC(19,4),
  apertura        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cierre          TIMESTAMPTZ,
  UNIQUE (usuario_id, fecha)
);

CREATE TABLE ventas (
  id                SERIAL PRIMARY KEY,
  folio             VARCHAR(20) UNIQUE NOT NULL,
  cliente_id        INTEGER REFERENCES clientes(id) ON DELETE RESTRICT,
  vendedor_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  orden_id          INTEGER REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
  subtotal          NUMERIC(19,4) NOT NULL DEFAULT 0,
  iva               NUMERIC(19,4) NOT NULL DEFAULT 0,
  total             NUMERIC(19,4) NOT NULL DEFAULT 0,
  descuento         NUMERIC(19,4) NOT NULL DEFAULT 0,
  motivo_descuento  TEXT,
  tipo_pago         tipo_pago NOT NULL DEFAULT 'contado',
  metodo_pago       metodo_pago,
  plazo_dias        INT CHECK (plazo_dias > 0),
  fecha_vencimiento DATE,
  monto_recibido    NUMERIC(19,4),
  estado            estado_venta NOT NULL DEFAULT 'completada',
  caja_id           INTEGER REFERENCES cajas(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);
CREATE INDEX idx_ventas_folio ON ventas (folio);
CREATE INDEX idx_ventas_fecha_vendedor ON ventas (created_at, vendedor_id);
CREATE INDEX idx_ventas_credito_vencimiento ON ventas (fecha_vencimiento) WHERE tipo_pago = 'credito';

CREATE TABLE detalle_venta (
  id                  SERIAL PRIMARY KEY,
  venta_id            INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id         INTEGER REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad            INT NOT NULL CHECK (cantidad > 0),
  precio_neto         NUMERIC(19,4) NOT NULL CHECK (precio_neto >= 0),
  descuento_linea     NUMERIC(19,4) NOT NULL DEFAULT 0,
  descripcion_servicio TEXT
);
CREATE INDEX idx_detalle_venta_venta ON detalle_venta (venta_id);

CREATE TABLE compras (
  id                SERIAL PRIMARY KEY,
  proveedor_id      INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
  folio             VARCHAR(20) UNIQUE NOT NULL,
  estado            estado_compra NOT NULL DEFAULT 'borrador',
  total_neto        NUMERIC(19,4) NOT NULL DEFAULT 0,
  fecha_vencimiento DATE,
  creada_por        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

CREATE TABLE detalle_compra (
  id              SERIAL PRIMARY KEY,
  compra_id       INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad        INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(19,4) NOT NULL CHECK (precio_unitario >= 0)
);

CREATE TABLE movimientos_inventario (
  id               SERIAL PRIMARY KEY,
  producto_id      INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  tipo             movimiento_tipo NOT NULL,
  cantidad         INT NOT NULL CHECK (cantidad <> 0),
  referencia_id    INTEGER,
  referencia_tipo  VARCHAR(40),
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  caja_id          INTEGER REFERENCES cajas(id) ON DELETE SET NULL,
  motivo           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mov_producto_fecha ON movimientos_inventario (producto_id, created_at DESC);

CREATE TABLE pagos (
  id         SERIAL PRIMARY KEY,
  venta_id   INTEGER NOT NULL REFERENCES ventas(id) ON DELETE RESTRICT,
  monto      NUMERIC(19,4) NOT NULL CHECK (monto > 0),
  metodo     metodo_pago NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  caja_id    INTEGER REFERENCES cajas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pagos_proveedor (
  id         SERIAL PRIMARY KEY,
  compra_id  INTEGER NOT NULL REFERENCES compras(id) ON DELETE RESTRICT,
  monto      NUMERIC(19,4) NOT NULL CHECK (monto > 0),
  metodo     metodo_pago NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notificaciones (
  id             SERIAL PRIMARY KEY,
  cliente_id     INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  orden_id       INTEGER REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
  cotizacion_id  INTEGER REFERENCES cotizaciones(id) ON DELETE SET NULL,
  tipo           VARCHAR(40) NOT NULL,
  canal          VARCHAR(20) NOT NULL,
  estado         estado_notificacion NOT NULL DEFAULT 'enviado',
  contenido      TEXT,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notificaciones_cliente ON notificaciones (cliente_id, created_at DESC);

CREATE TABLE plantillas_notificacion (
  id     SERIAL PRIMARY KEY,
  tipo   VARCHAR(40) UNIQUE NOT NULL,
  asunto VARCHAR(160),
  cuerpo TEXT NOT NULL
);

CREATE TABLE garantias (
  id         SERIAL PRIMARY KEY,
  venta_id   INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
  orden_id   INTEGER REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  tipo       tipo_garantia NOT NULL,
  inicio     DATE NOT NULL,
  fin        DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_garantias_fin ON garantias (fin);

CREATE TABLE configuracion (
  clave      VARCHAR(60) PRIMARY KEY,
  valor      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auditoria (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  accion     VARCHAR(60) NOT NULL,
  entidad    VARCHAR(60) NOT NULL,
  entidad_id INTEGER,
  antes      JSONB,
  despues    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
