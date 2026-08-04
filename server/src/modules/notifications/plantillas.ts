interface Plantilla {
  asunto: string;
  cuerpo: string;
}

export const PLANTILLAS: Record<string, Plantilla> = {
  "NOT-01": {
    asunto: "Retraso en tu orden — TechStore",
    cuerpo:
      "Hola {cliente}, lamentamos informarte que tu equipo con folio {folio} presenta un retraso.\n" +
      "Estamos trabajando en ello y te avisaremos en cuanto esté listo.\n\nTechStore · {fecha}",
  },
  "NOT-02": {
    asunto: "Tu equipo ya está listo — TechStore",
    cuerpo:
      "Hola {cliente}, buenas noticias: tu equipo con folio {folio} ya está listo.\n" +
      "Puedes pasar a recogerlo a la tienda. ¡Te esperamos!\n\nTechStore · {fecha}",
  },
  "NOT-03": {
    asunto: "Tu cotización está lista — TechStore",
    cuerpo:
      "Hola {cliente}, la cotización de tu orden con folio {folio} ya está lista para su revisión.\n" +
      "Acércate a la tienda o contáctanos para aprobarla y dar inicio a la reparación.\n\nTechStore · {fecha}",
  },
  "NOT-04": {
    asunto: "Tu garantía está por vencer — TechStore",
    cuerpo:
      "Hola {cliente}, la garantía de tu orden {folio} está por vencer.\n" +
      "Si presentas algún problema, acércate antes de la fecha límite.\n\nTechStore · {fecha}",
  },
};

export const PLANTILLA_DEFAULT: Plantilla = {
  asunto: "Notificación TechStore",
  cuerpo: "Hola {cliente}, tu orden {folio} está en proceso. TechStore · {fecha}",
};

export function renderPlantilla(
  tipo: string,
  vars: Record<string, string>,
  db?: { asunto: string | null; cuerpo: string | null } | null
): Plantilla {
  const base: Plantilla = db && db.cuerpo ? { asunto: db.asunto ?? "", cuerpo: db.cuerpo } : (PLANTILLAS[tipo] ?? PLANTILLA_DEFAULT);
  return {
    asunto: base.asunto.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? ""),
    cuerpo: base.cuerpo.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? ""),
  };
}

export function tipoNotificacion(input: "listo" | "cotizacion" | "retraso" | "garantia"): string {
  switch (input) {
    case "listo":
      return "NOT-02";
    case "cotizacion":
      return "NOT-03";
    case "garantia":
      return "NOT-04";
    default:
      return "NOT-01";
  }
}
