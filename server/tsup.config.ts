import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    migrate: "src/db/migrate.ts",
    seed: "src/db/seed.ts",
  },
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
});
