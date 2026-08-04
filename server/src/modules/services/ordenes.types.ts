export type EstadoOrden =
  | "pendiente"
  | "en_diagnostico"
  | "cotizado"
  | "en_reparacion"
  | "listo"
  | "entregado"
  | "cancelado";

export type TipoEquipo = "laptop" | "desktop" | "all_in_one" | "periferico" | "componente" | "otro";

export type Rol = "admin" | "vendedor" | "tecnico";
