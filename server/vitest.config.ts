import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test_secret_min_16_chars_ok",
      JWT_REFRESH_SECRET: "test_refresh_secret_min_16",
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
