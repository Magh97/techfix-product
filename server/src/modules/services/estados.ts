import { AppError } from "../../shared/errors";
import type { EstadoOrden, Rol } from "./ordenes.types";

interface Transicion {
  to: EstadoOrden;
  roles: Rol[];
  condicion?: "cotizacion_aprobada";
}

// docs/03-business-rules.md §4
const TRANSICIONES: Record<EstadoOrden, Transicion[]> = {
  pendiente: [
    { to: "en_diagnostico", roles: ["tecnico"] },
    { to: "cancelado", roles: ["vendedor", "admin"] },
  ],
  en_diagnostico: [
    { to: "cotizado", roles: ["tecnico"] },
    { to: "cancelado", roles: ["vendedor", "admin"] },
  ],
  cotizado: [
    { to: "en_reparacion", roles: ["tecnico"], condicion: "cotizacion_aprobada" },
    { to: "sustitucion_pendiente", roles: ["tecnico"] },
    { to: "cancelado", roles: ["vendedor", "admin"] },
  ],
  en_reparacion: [
    { to: "listo", roles: ["tecnico"] },
    { to: "cancelado", roles: ["admin"] },
    { to: "en_diagnostico", roles: ["tecnico"] },
    { to: "sustitucion_pendiente", roles: ["tecnico"] },
  ],
  sustitucion_pendiente: [
    { to: "en_reparacion", roles: ["tecnico"] },
    { to: "cotizado", roles: ["tecnico"] },
    { to: "cancelado", roles: ["vendedor", "admin"] },
  ],
  listo: [
    { to: "entregado", roles: ["vendedor", "admin"] },
    { to: "cancelado", roles: ["admin"] },
  ],
  entregado: [],
  cancelado: [],
};

export function validarTransicion(actual: EstadoOrden, nuevo: EstadoOrden, rol: Rol, cotizacionAprobada = false) {
  const candidatas = TRANSICIONES[actual].filter((t) => t.to === nuevo);
  if (!candidatas.length) {
    throw AppError.conflict("ORDER_STATE_INVALID", `No se puede pasar de ${actual} a ${nuevo}`);
  }
  const t = candidatas.find((x) => x.roles.includes(rol));
  if (!t) throw AppError.forbidden("Transición no autorizada para el rol");
  if (t.condicion === "cotizacion_aprobada" && !cotizacionAprobada) {
    throw AppError.business("QUOTE_NOT_APPROVED", "Debe aprobar la cotización antes de iniciar la reparación");
  }
  return true;
}

export const ESTADO_LABEL: Record<EstadoOrden, string> = {
  pendiente: "Pendiente",
  en_diagnostico: "Diagnóstico",
  cotizado: "Cotizado",
  en_reparacion: "En reparación",
  sustitucion_pendiente: "Esperando sustitución",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
