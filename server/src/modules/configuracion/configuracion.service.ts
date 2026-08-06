import { AppError } from "../../shared/errors";
import { getConfig } from "../../shared/config";
import * as repo from "./configuracion.repository";

interface Rango {
  min: number;
  max?: number;
  int?: boolean;
}

const RANGOS: Record<string, Rango> = {
  "iva.rate": { min: 0, max: 1 },
  "credito.limite_default": { min: 0 },
  "credito.plazo_default": { min: 1, int: true },
  "ventas.descuento_vendedor_max": { min: 0, max: 1 },
  "ventas.dias_devolucion": { min: 0, int: true },
  "servicios.dias_garantia": { min: 0, int: true },
  "ventas.dias_garantia_producto": { min: 0, int: true },
  "ventas.dias_garantia_usado": { min: 0, int: true },
  "ordenes.tolerancia_retraso_dias": { min: 0, int: true },
};

export async function get() {
  return getConfig();
}

export async function update(clave: string, valor: number) {
  const rango = RANGOS[clave];
  if (!rango) throw AppError.badRequest("CONFIG_INVALID", "Clave de configuración inválida");
  if (valor < rango.min || (rango.max !== undefined && valor > rango.max)) {
    const limite = rango.max !== undefined ? `${rango.min}-${rango.max}` : `${rango.min}+`;
    throw AppError.badRequest("CONFIG_INVALID", `Valor fuera de rango (${limite})`);
  }
  if (rango.int && !Number.isInteger(valor)) {
    throw AppError.badRequest("CONFIG_INVALID", "Debe ser un valor entero");
  }
  const almacenado = clave === "iva.rate" ? { rate: valor } : { value: valor };
  await repo.upsertConfig(clave, almacenado);
  return { clave, valor };
}
