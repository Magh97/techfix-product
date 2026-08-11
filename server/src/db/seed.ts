import bcrypt from "bcryptjs";
import { pool } from "../shared/db";
import { bootstrapAdmin } from "./bootstrapAdmin";

// En producción (SEED_DEMO=false) se omiten usuarios demo, clientes, productos,
// proveedores y kits. El bootstrap esencial (catálogo "Usado", IVA, plantillas) siempre corre.
const seedDemo = process.env.SEED_DEMO !== "false";

async function main() {
  if (seedDemo) {
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

    const hashT = await bcrypt.hash("tecnico1234", 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, usuario, password_hash, rol)
       VALUES ('Técnico', 'tecnico', $1, 'tecnico')
       ON CONFLICT (usuario) DO NOTHING`,
      [hashT]
    );
  }

  // --- Taxonomía: categorías = raíces del árbol de catálogos ---
  // Demo de 4 niveles: PC → Componentes → RAM → DDR5 (tags como especificaciones)
  interface NodoCatalogo {
    nombre: string;
    tagsSugeridas?: string[];
    tagsCompatibilidad?: string[];
    hijos?: NodoCatalogo[];
  }

  const ARBOL: NodoCatalogo[] = [
    {
      nombre: "PC",
      hijos: [
        {
          nombre: "Componentes",
          hijos: [
            {
              nombre: "RAM",
              tagsSugeridas: ["SO-DIMM", "DIMM", "Capacidad", "Velocidad"],
              tagsCompatibilidad: ["DDR4", "DDR5"],
              hijos: [
                { nombre: "DDR4", tagsSugeridas: ["DIMM", "16 GB", "3200 MHz"], tagsCompatibilidad: ["DDR4"] },
                { nombre: "DDR5", tagsSugeridas: ["SO-DIMM", "16 GB", "4800 MHz"], tagsCompatibilidad: ["DDR5"] },
              ],
            },
            {
              nombre: "Procesador",
              tagsSugeridas: ["Socket", "Núcleos", "GHz"],
              tagsCompatibilidad: ["LGA1700", "AM5"],
              hijos: [
                { nombre: "Intel", tagsSugeridas: ["LGA1700", "6 núcleos"], tagsCompatibilidad: ["LGA1700"] },
                { nombre: "AMD", tagsSugeridas: ["AM5", "6 núcleos"], tagsCompatibilidad: ["AM5"] },
              ],
            },
            {
              nombre: "Almacenamiento",
              tagsSugeridas: ["Interfaz", "Capacidad", "Formato"],
              tagsCompatibilidad: ["NVMe", "SATA"],
              hijos: [
                { nombre: "SSD", tagsSugeridas: ["NVMe", "M.2", "1 TB"], tagsCompatibilidad: ["NVMe"] },
                { nombre: "HDD", tagsSugeridas: ["SATA", "3.5 pulg", "2 TB"], tagsCompatibilidad: ["SATA"] },
              ],
            },
            { nombre: "Tarjeta de video", tagsSugeridas: ["VRAM", "GDDR6"], tagsCompatibilidad: [] },
            { nombre: "Placa madre", tagsSugeridas: ["Socket", "Chipset", "Formato"], tagsCompatibilidad: ["Socket"] },
            { nombre: "Fuente de poder", tagsSugeridas: ["Potencia (W)", "Certificación"], tagsCompatibilidad: [] },
          ],
        },
        {
          nombre: "Equipos",
          hijos: [
            { nombre: "Laptop", tagsSugeridas: ["Pulgadas", "RAM", "SSD"], tagsCompatibilidad: [] },
            { nombre: "Desktop", tagsSugeridas: ["Gabinete", "Fuente"], tagsCompatibilidad: [] },
          ],
        },
      ],
    },
    {
      nombre: "Perifericos",
      hijos: [
        { nombre: "Monitor", tagsSugeridas: ["Pulgadas", "Resolución", "Hz"], tagsCompatibilidad: [] },
        { nombre: "Teclado", tagsSugeridas: ["Layout", "Tipo de switch"], tagsCompatibilidad: [] },
        { nombre: "Ratón", tagsSugeridas: ["Sensor"], tagsCompatibilidad: [] },
      ],
    },
    { nombre: "Refaccion" },
    { nombre: "Usado" },
    { nombre: "General" },
  ];

  const catIds = new Map<string, number>();
  const raizIds = new Map<string, number>();

  async function insertarNodo(nodo: NodoCatalogo, parentId: number | null, ruta: string) {
    const insert = await pool.query<{ id: number }>(
      `INSERT INTO catalogos (nombre, parent_id, tags_sugeridas, tags_compatibilidad)
       SELECT $1::varchar, $2::integer, $3::jsonb, $4::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM catalogos c WHERE c.parent_id IS NOT DISTINCT FROM $2::integer AND c.nombre = $1::varchar
       )
       RETURNING id`,
      [nodo.nombre, parentId, JSON.stringify(nodo.tagsSugeridas ?? []), JSON.stringify(nodo.tagsCompatibilidad ?? [])]
    );
    let id = insert.rows[0]?.id;
    if (!id) {
      const r = await pool.query<{ id: number }>(
        "SELECT id FROM catalogos WHERE parent_id IS NOT DISTINCT FROM $1 AND nombre = $2",
        [parentId, nodo.nombre]
      );
      id = r.rows[0]!.id;
    }
    const rutaNueva = ruta ? `${ruta}/${nodo.nombre}` : nodo.nombre;
    catIds.set(rutaNueva, id);
    for (const hijo of nodo.hijos ?? []) await insertarNodo(hijo, id, rutaNueva);
  }
  for (const raiz of ARBOL) await insertarNodo(raiz, null, "");
  for (const [ruta, id] of catIds) {
    if (!ruta.includes("/")) raizIds.set(ruta, id);
  }

  await pool.query(`INSERT INTO configuracion (clave, valor) VALUES ('iva', '{"rate":0.16}') ON CONFLICT (clave) DO NOTHING`);

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

  // --- Datos demo (solo con SEED_DEMO != false) ---
  if (seedDemo) {
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
    { sku: "PROC-001", codigo: "7501221234101", nombre: "Procesador Intel i5-12400", precioCompra: 2800, precioVenta: 3180, stock: 8, stockMin: 3, stockMax: 8, catalogo: "PC/Componentes/Procesador/Intel", tags: ["LGA1700", "6 núcleos", "4.4 GHz"] },
    { sku: "RAM-001", codigo: "7501221234103", nombre: "Memoria RAM 16GB DDR4 3200", precioCompra: 900, precioVenta: 1180, stock: 12, stockMin: 5, stockMax: 14, catalogo: "PC/Componentes/RAM/DDR4", tags: ["DIMM", "16 GB", "3200 MHz", "DDR4"] },
    { sku: "RAM-002", codigo: "7501221234110", nombre: "Memoria RAM 16GB DDR5 4800", precioCompra: 1100, precioVenta: 1450, stock: 9, stockMin: 4, stockMax: 10, catalogo: "PC/Componentes/RAM/DDR5", tags: ["SO-DIMM", "16 GB", "4800 MHz", "DDR5"] },
    { sku: "SSD-001", codigo: "7501221234104", nombre: "SSD NVMe 1TB Gen4", precioCompra: 1100, precioVenta: 1390, stock: 6, stockMin: 3, stockMax: 6, catalogo: "PC/Componentes/Almacenamiento/SSD", tags: ["NVMe", "M.2", "1 TB"] },
    { sku: "TEC-001", codigo: "7501221234109", nombre: "Teclado mecánico RGB", precioCompra: 600, precioVenta: 850, stock: 10, stockMin: 4, stockMax: 10, catalogo: "Perifericos/Teclado", tags: ["layout-ES", "mecánico"] },
    { sku: "MON-001", codigo: "7501221234108", nombre: "Monitor 24\" FHD 144Hz", precioCompra: 1800, precioVenta: 2350, stock: 5, stockMin: 2, stockMax: 6, catalogo: "Perifericos/Monitor", tags: ["24 pulg", "1920x1080", "144 Hz"] },
  ];
  for (const p of productos) {
    const catalogoId = catIds.get(p.catalogo);
    const rootNombre = p.catalogo.split("/")[0]!;
    const categoriaId = raizIds.get(rootNombre)!;
    await pool.query(
      `INSERT INTO productos (categoria_id, sku, codigo_barras, nombre, precio_compra, precio_venta, stock, stock_minimo, stock_maximo, catalogo_id, especificaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) ON CONFLICT (sku) DO NOTHING`,
      [categoriaId, p.sku, p.codigo, p.nombre, p.precioCompra, p.precioVenta, p.stock, p.stockMin, p.stockMax, catalogoId ?? null, JSON.stringify(p.tags)]
    );
  }

  // Kit de ejemplo: PC Gamer i5 (ADR-0003) — precio = Σ componentes + mano de obra
  const pcId = raizIds.get("PC")!;
  const kit = {
    sku: "KIT-001",
    nombre: "PC Gamer Intel i5",
    categoriaId: pcId,
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

  // Proveedor favorito de los productos demo (para el reabastecimiento)
  const favProv = await pool.query<{ id: number }>("SELECT id FROM proveedores ORDER BY id LIMIT 1");
  if (favProv.rows[0]) {
    await pool.query(
      "UPDATE productos SET proveedor_favorito_id = $1 WHERE sku = ANY($2)",
      [favProv.rows[0].id, ["PROC-001", "RAM-001", "RAM-002", "SSD-001"]]
    );
  }
  }

  // --- Primer admin en producción (SEED_DEMO=false) ---
  // Idempotente: solo crea el admin de arranque si no existe ninguno con ese usuario;
  // la contraseña generada sale en los logs del primer arranque y debe cambiarse al entrar.
  let bootstrapMsg = "";
  if (!seedDemo) {
    const admin = await bootstrapAdmin();
    if (admin.created && admin.password) {
      bootstrapMsg = ` PRIMER ADMIN — usuario: ${admin.usuario} · contraseña: ${admin.password}. Cámbiala al iniciar sesión.`;
      console.log(bootstrapMsg);
    }
  }

  console.log("Seed completado." + (seedDemo ? " Usuarios: admin/admin1234 · vendedor/vendedor1234 · tecnico/tecnico1234" : " (SEED_DEMO=false, sin datos demo)"));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
