export type EstadoOrden =
  | "pendiente"
  | "en_diagnostico"
  | "cotizado"
  | "en_reparacion"
  | "sustitucion_pendiente"
  | "listo"
  | "entregado"
  | "cancelado";

export type TipoEquipo = "laptop" | "desktop" | "all_in_one" | "periferico" | "componente" | "otro";

export type Rol = "admin" | "vendedor" | "tecnico";
