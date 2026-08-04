import bcrypt from "bcryptjs";
import { pool } from "../shared/db";

async function main() {
  const hash = await bcrypt.hash("admin1234", 10);
  await pool.query(
    `INSERT INTO usuarios (nombre, usuario, password_hash, rol)
     VALUES ('Administrador', 'admin', $1, 'admin')
     ON CONFLICT (usuario) DO NOTHING`,
    [hash]
  );

  const hashV = await bcrypt.hash("vendedor1234", 10);
  await pool.query(
    `INSERT INTO usuarios (nombre, usuario, password_hash, rol)
     VALUES ('Vendedor', 'vendedor', $1, 'vendedor')
     ON CONFLICT (usuario) DO NOTHING`,
    [hashV]
  );

  const categorias = ["componente", "periferico", "equipo_completo", "refaccion", "usado"];
  for (const tipo of categorias) {
    await pool.query(
      `INSERT INTO categorias (nombre, tipo)
       SELECT $1::text, $1::tipo_producto
       WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = $1::text)`,
      [tipo]
    );
  }

  await pool.query(`INSERT INTO configuracion (clave, valor) VALUES ('iva', '{"rate":0.16}') ON CONFLICT (clave) DO NOTHING`);

  // --- Catálogos (taxonomía) ---
  const rootIds = new Map<string, number>();
  for (const nombre of categorias) {
    await pool.query(
      `INSERT INTO catalogos (nombre) SELECT $1::text WHERE NOT EXISTS (SELECT 1 FROM catalogos WHERE nombre = $1::text AND parent_id IS NULL)`,
      [nombre]
    );
    const r = await pool.query<{ id: number }>("SELECT id FROM catalogos WHERE nombre = $1 AND parent_id IS NULL", [nombre]);
    rootIds.set(nombre, r.rows[0]!.id);
  }

  const subcategorias: { parent: string; nombre: string; campos: { clave: string; etiqueta: string }[]; claves: string[] }[] = [
    { parent: "componente", nombre: "RAM", campos: [{ clave: "tipo_memoria", etiqueta: "Tipo de memoria" }, { clave: "capacidad", etiqueta: "Capacidad" }, { clave: "factor", etiqueta: "Factor" }], claves: ["tipo_memoria", "factor"] },
    { parent: "componente", nombre: "Procesador", campos: [{ clave: "socket", etiqueta: "Socket" }, { clave: "nucleos", etiqueta: "Núcleos" }], claves: ["socket"] },
    { parent: "componente", nombre: "Almacenamiento", campos: [{ clave: "interfaz", etiqueta: "Interfaz" }, { clave: "capacidad", etiqueta: "Capacidad" }, { clave: "formato", etiqueta: "Formato" }], claves: ["interfaz", "formato"] },
    { parent: "componente", nombre: "Tarjeta de video", campos: [{ clave: "vram", etiqueta: "VRAM" }, { clave: "tipo_memoria", etiqueta: "Tipo de memoria" }], claves: ["tipo_memoria"] },
    { parent: "componente", nombre: "Placa madre", campos: [{ clave: "socket", etiqueta: "Socket" }, { clave: "chipset", etiqueta: "Chipset" }, { clave: "formato", etiqueta: "Formato" }], claves: ["socket", "chipset"] },
    { parent: "componente", nombre: "Fuente de poder", campos: [{ clave: "potencia", etiqueta: "Potencia (W)" }, { clave: "certificacion", etiqueta: "Certificación" }], claves: [] },
    { parent: "periferico", nombre: "Monitor", campos: [{ clave: "tamano", etiqueta: "Tamaño (pulg)" }, { clave: "resolucion", etiqueta: "Resolución" }, { clave: "tasa_refresco", etiqueta: "Tasa de refresco" }], claves: ["resolucion"] },
    { parent: "periferico", nombre: "Teclado", campos: [{ clave: "layout", etiqueta: "Layout" }, { clave: "tipo_switch", etiqueta: "Tipo de switch" }], claves: [] },
    { parent: "periferico", nombre: "Ratón", campos: [{ clave: "sensor", etiqueta: "Sensor" }], claves: [] },
    { parent: "equipo_completo", nombre: "Laptop", campos: [], claves: [] },
    { parent: "equipo_completo", nombre: "Desktop", campos: [], claves: [] },
  ];
  const catIds = new Map<string, number>();
  for (const s of subcategorias) {
    const parentId = rootIds.get(s.parent)!;
    await pool.query(
      `INSERT INTO catalogos (parent_id, nombre, campos_especificacion, claves_compatibilidad)
       SELECT $1::integer, $2::varchar, $3::jsonb, $4::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM catalogos WHERE parent_id = $1::integer AND nombre = $2::varchar)`,
      [parentId, s.nombre, JSON.stringify(s.campos), JSON.stringify(s.claves)]
    );
    const r = await pool.query<{ id: number }>("SELECT id FROM catalogos WHERE parent_id = $1 AND nombre = $2", [parentId, s.nombre]);
    catIds.set(`${s.parent}/${s.nombre}`, r.rows[0]!.id);
  }

  const plantillas = [
    {
      tipo: "NOT-02",
      asunto: "Tu equipo ya está listo — TechStore",
      cuerpo:
        "Hola {cliente}, buenas noticias: tu equipo con folio {folio} ya está listo.\n" +
        "Puedes pasar a recogerlo a la tienda. ¡Te esperamos!\n\nTechStore · {fecha}",
    },
    {
      tipo: "NOT-03",
      asunto: "Tu cotización está lista — TechStore",
      cuerpo:
        "Hola {cliente}, la cotización de tu orden con folio {folio} ya está lista para su revisión.\n" +
        "Acércate a la tienda o contáctanos para aprobarla y dar inicio a la reparación.\n\nTechStore · {fecha}",
    },
  ];
  for (const p of plantillas) {
    await pool.query(
      `INSERT INTO plantillas_notificacion (tipo, asunto, cuerpo) VALUES ($1,$2,$3) ON CONFLICT (tipo) DO NOTHING`,
      [p.tipo, p.asunto, p.cuerpo]
    );
  }

  const clientes = [
    { nombre: "Ana Torres", telefono: "5512345678", correo: "ana.torres@mail.com" },
    { nombre: "Beto Sánchez", telefono: "5522334455", correo: "beto.sanchez@mail.com" },
    { nombre: "Carla Núñez", telefono: "5533445566", correo: null },
  ];
  for (const c of clientes) {
    const exists = await pool.query("SELECT 1 FROM clientes WHERE telefono = $1", [c.telefono]);
    if (!exists.rowCount) {
      await pool.query("INSERT INTO clientes (nombre, telefono, correo) VALUES ($1,$2,$3)", [c.nombre, c.telefono, c.correo]);
    }
  }

  const productos = [
    { sku: "PROC-001", codigo: "7501221234101", nombre: "Procesador Intel i5-12400", categoriaId: 1, precioCompra: 2800, precioVenta: 3180, stock: 8, stockMin: 3, catalogo: "componente/Procesador", specs: { socket: "LGA1700" } },
    { sku: "RAM-001", codigo: "7501221234103", nombre: "Memoria RAM 16GB DDR4 3200", categoriaId: 1, precioCompra: 900, precioVenta: 1180, stock: 12, stockMin: 5, catalogo: "componente/RAM", specs: { tipo_memoria: "DDR4", capacidad: "16GB", factor: "DIMM" } },
    { sku: "SSD-001", codigo: "7501221234104", nombre: "SSD NVMe 1TB Gen4", categoriaId: 1, precioCompra: 1100, precioVenta: 1390, stock: 6, stockMin: 3, catalogo: "componente/Almacenamiento", specs: { interfaz: "NVMe", capacidad: "1TB", formato: "M.2" } },
    { sku: "TEC-001", codigo: "7501221234109", nombre: "Teclado mecánico RGB", categoriaId: 2, precioCompra: 600, precioVenta: 850, stock: 10, stockMin: 4, catalogo: "periferico/Teclado", specs: { layout: "ES", tipo_switch: "mecanico" } },
    { sku: "MON-001", codigo: "7501221234108", nombre: "Monitor 24\" FHD 144Hz", categoriaId: 2, precioCompra: 1800, precioVenta: 2350, stock: 5, stockMin: 2, catalogo: "periferico/Monitor", specs: { tamano: "24", resolucion: "1920x1080", tasa_refresco: "144Hz" } },
  ];
  for (const p of productos) {
    const catalogoId = catIds.get(p.catalogo);
    await pool.query(
      `INSERT INTO productos (categoria_id, sku, codigo_barras, nombre, precio_compra, precio_venta, stock, stock_minimo, catalogo_id, especificaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) ON CONFLICT (sku) DO NOTHING`,
      [p.categoriaId, p.sku, p.codigo, p.nombre, p.precioCompra, p.precioVenta, p.stock, p.stockMin, catalogoId ?? null, JSON.stringify(p.specs)]
    );
  }

  // Kit de ejemplo: PC Gamer i5 (ADR-0003) — precio = Σ componentes + mano de obra
  const kit = {
    sku: "KIT-001",
    nombre: "PC Gamer Intel i5",
    categoriaId: 3,
    manoObra: 350,
    componentes: [
      { sku: "PROC-001", cantidad: 1 },
      { sku: "RAM-001", cantidad: 2 },
      { sku: "SSD-001", cantidad: 1 },
      { sku: "MON-001", cantidad: 1 },
    ],
  };
  const kitPrecios = await pool.query<{ sku: string; precio_compra: string; precio_venta: string }>(
    "SELECT sku, precio_compra, precio_venta FROM productos WHERE sku = ANY($1)",
    [kit.componentes.map((c) => c.sku)]
  );
  const precios = new Map(kitPrecios.rows.map((r) => [r.sku, { c: Number(r.precio_compra), v: Number(r.precio_venta) }]));
  const precioCompra = kit.componentes.reduce((a, c) => a + (precios.get(c.sku)?.c ?? 0) * c.cantidad, 0);
  const precioVenta = kit.componentes.reduce((a, c) => a + (precios.get(c.sku)?.v ?? 0) * c.cantidad, 0) + kit.manoObra;

  await pool.query(
    `INSERT INTO productos (categoria_id, sku, nombre, precio_compra, precio_venta, stock, stock_minimo, is_kit, mano_obra)
     VALUES ($1,$2,$3,$4,$5,0,0,true,$6) ON CONFLICT (sku) DO UPDATE
       SET precio_compra = EXCLUDED.precio_compra, precio_venta = EXCLUDED.precio_venta, mano_obra = EXCLUDED.mano_obra`,
    [kit.categoriaId, kit.sku, kit.nombre, precioCompra, precioVenta, kit.manoObra]
  );
  const kitId = await pool.query<{ id: number }>("SELECT id FROM productos WHERE sku = $1", [kit.sku]);
  if (kitId.rows[0]) {
    await pool.query("DELETE FROM producto_bom WHERE kit_producto_id = $1", [kitId.rows[0].id]);
    for (const c of kit.componentes) {
      await pool.query(
        `INSERT INTO producto_bom (kit_producto_id, componente_id, cantidad)
         SELECT $1, id, $2 FROM productos WHERE sku = $3`,
        [kitId.rows[0].id, c.cantidad, c.sku]
      );
    }
  }

  const proveedores = [
    { nombre: "Distribuidora Tecno Mayorista", contacto: "ventas@tecnomayorista.mx", condicionesPago: "Crédito 30 días" },
    { nombre: "Importadora de Componentes MX", contacto: "Carlos (55) 4444-5555", condicionesPago: "Contado / transferencia" },
  ];
  for (const pr of proveedores) {
    const exists = await pool.query("SELECT 1 FROM proveedores WHERE nombre = $1", [pr.nombre]);
    if (!exists.rowCount) {
      await pool.query(
        "INSERT INTO proveedores (nombre, contacto, condiciones_pago) VALUES ($1,$2,$3)",
        [pr.nombre, pr.contacto, pr.condicionesPago]
      );
    }
  }

  console.log("Seed completado. Usuarios: admin/admin1234 · vendedor/vendedor1234");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
