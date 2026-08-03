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

  console.log("Seed completado. Usuario admin / admin1234");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
