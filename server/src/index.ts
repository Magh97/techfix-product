import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./shared/logger";
import { marcarRetrasadas } from "./modules/services/ordenes.service";

const app = createApp();

// US-SER-09: worker que detecta retrasos (cada hora, +1 al arrancar)
async function detectarRetrasos() {
  try {
    const n = await marcarRetrasadas();
    if (n > 0) logger.info({ n }, "worker:retrasos");
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, "worker:error");
  }
}

detectarRetrasos();
setInterval(detectarRetrasos, 60 * 60 * 1000);

app.listen(env.PORT, () => {
  logger.info(`API lista en http://localhost:${env.PORT}/api/v1`);
});
