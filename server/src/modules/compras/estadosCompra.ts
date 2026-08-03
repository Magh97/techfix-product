import { AppError } from "../../shared/errors";

export type EstadoCompra = "borrador" | "enviada" | "recibida" | "cancelada";
export type Rol = "admin" | "vendedor" | "tecnico";

interface Transicion {
  to: EstadoCompra;
  roles: Rol[];
}

const TRANSICIONES: Record<EstadoCompra, Transicion[]> = {
  borrador: [
    { to: "enviada", roles: ["admin"] },
    { to: "cancelada", roles: ["admin"] },
  ],
  enviada: [
    { to: "recibida", roles: ["admin"] },
    { to: "cancelada", roles: ["admin"] },
  ],
  recibida: [],
  cancelada: [],
};

export function validarTransicionCompra(actual: EstadoCompra, nuevo: EstadoCompra, rol: Rol) {
  const candidatas = TRANSICIONES[actual].filter((t) => t.to === nuevo);
  if (!candidatas.length) {
    throw AppError.conflict("PURCHASE_STATE_INVALID", `No se puede pasar de ${actual} a ${nuevo}`);
  }
  const t = candidatas.find((x) => x.roles.includes(rol));
  if (!t) throw AppError.forbidden("Transición no autorizada para el rol");
  return true;
}

export const ESTADO_COMPRA_LABEL: Record<EstadoCompra, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  recibida: "Recibida",
  cancelada: "Cancelada",
};
