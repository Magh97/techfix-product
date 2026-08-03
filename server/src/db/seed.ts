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
    { sku: "PROC-001", codigo: "7501221234101", nombre: "Procesador Intel i5-12400", categoriaId: 1, precioCompra: 2800, precioVenta: 3180, stock: 8, stockMin: 3 },
    { sku: "RAM-001", codigo: "7501221234103", nombre: "Memoria RAM 16GB DDR4 3200", categoriaId: 1, precioCompra: 900, precioVenta: 1180, stock: 12, stockMin: 5 },
    { sku: "SSD-001", codigo: "7501221234104", nombre: "SSD NVMe 1TB Gen4", categoriaId: 1, precioCompra: 1100, precioVenta: 1390, stock: 6, stockMin: 3 },
    { sku: "TEC-001", codigo: "7501221234109", nombre: "Teclado mecánico RGB", categoriaId: 2, precioCompra: 600, precioVenta: 850, stock: 10, stockMin: 4 },
    { sku: "MON-001", codigo: "7501221234108", nombre: "Monitor 24\" FHD 144Hz", categoriaId: 2, precioCompra: 1800, precioVenta: 2350, stock: 5, stockMin: 2 },
  ];
  for (const p of productos) {
    await pool.query(
      `INSERT INTO productos (categoria_id, sku, codigo_barras, nombre, precio_compra, precio_venta, stock, stock_minimo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (sku) DO NOTHING`,
      [p.categoriaId, p.sku, p.codigo, p.nombre, p.precioCompra, p.precioVenta, p.stock, p.stockMin]
    );
  }

  console.log("Seed completado. Usuarios: admin/admin1234 · vendedor/vendedor1234");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
