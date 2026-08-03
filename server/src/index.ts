import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./shared/logger";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`API lista en http://localhost:${env.PORT}/api/v1`);
});
