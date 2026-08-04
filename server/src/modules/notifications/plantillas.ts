interface Plantilla {
  asunto: string;
  cuerpo: string;
}

const PLANTILLAS: Record<string, Plantilla> = {
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
};

const PLANTILLA_DEFAULT: Plantilla = {
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

export function tipoNotificacion(input: "listo" | "cotizacion"): string {
  return input === "listo" ? "NOT-02" : "NOT-03";
}
