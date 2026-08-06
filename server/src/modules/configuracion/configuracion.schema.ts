import { z } from "zod";
import { CONFIG_KEYS } from "../../shared/config";

export const putConfigSchema = z.object({
  clave: z.enum(Object.keys(CONFIG_KEYS) as [string, ...string[]]),
  valor: z.number(),
});
