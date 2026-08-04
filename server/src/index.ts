import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./shared/logger";
import { marcarRetrasadas } from "./modules/services/ordenes.service";
import { marcarGarantiasPorVencer } from "./modules/garantias/garantias.service";

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

// NOT-04: worker diario de recordatorio de garantías (+1 al arrancar)
async function recordarGarantias() {
  try {
    const n = await marcarGarantiasPorVencer();
    if (n > 0) logger.info({ n }, "worker:garantias");
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, "worker:garantias:error");
  }
}

detectarRetrasos();
setInterval(detectarRetrasos, 60 * 60 * 1000);

recordarGarantias();
setInterval(recordarGarantias, 24 * 60 * 60 * 1000);

app.listen(env.PORT, () => {
  logger.info(`API lista en http://localhost:${env.PORT}/api/v1`);
});
