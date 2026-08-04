# ADR-0007: Notificaciones por correo primero; WhatsApp/Twilio diferido

**Fecha:** 2026-08-03
**Estado:** Aceptado
**Decisores:** Equipo de desarrollo + dueño del negocio

---

## Contexto

El ADR-0006 definió WhatsApp vía Twilio con fallback a correo como canal de notificaciones (NOT-02, NOT-03). Al momento de implementar la Fase 1, Twilio requiere credenciales de producción y plantillas aprobadas por Meta, lo que bloquea la puesta en marcha del MVP en la tienda. Para entregar un release usable, se necesita un canal de envío real desde hoy.

---

## Decisión

Implementar primero el **envío real por correo (nodemailer/SMTP)** para NOT-02 y NOT-03, con auditoría en la tabla `notificaciones` (estado `enviado`/`fallido`/`reintento` + `error`). La integración de **WhatsApp vía Twilio queda diferida** y se activará con su propio ADR cuando se cuenten con las credenciales y plantillas aprobadas. Si no hay SMTP configurado (desarrollo), el envío se simula y se registra como `enviado` (logueado en consola) para no romper el flujo.

---

## Consecuencias

### ✅ Positivo
- NOT-02/NOT-03 funcionales en el MVP sin depender de aprobaciones externas.
- El canal correo ya es el fallback definido en ADR-0006, por lo que la migración a Twilio no descarta este trabajo.
- El registro de `notificaciones` es compatible con el historial de NOT-06 y con la futura plantilla Twilio.

### ❌ Negativo
- El canal principal del negocio (WhatsApp) no queda automatizado todavía.
- Los clientes sin correo registrado no reciben notificación; se registra `fallido` con motivo `cliente sin correo` (queda como tarea de llamada manual).

---

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Correo primero (elegida) | Sin aprobaciones, funcional hoy | No es el canal principal | Cumple el MVP y es el fallback de ADR-0006 |
| Twilio WhatsApp ya | Canal principal automatizado | Credenciales + plantillas Meta pendientes | Bloquea el release de Fase 1 |
| WhatsApp Web manual | Gratis, sin aprobaciones | No automatiza NOT-01/NOT-04 | Ya descartado en ADR-0006 |
