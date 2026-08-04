import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../shared/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function main() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const existing = await pool.query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
    if (existing.rowCount) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Migración aplicada: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log("Migraciones al día.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
