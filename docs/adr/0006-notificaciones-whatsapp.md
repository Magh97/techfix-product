# ADR-0006: Notificaciones WhatsApp vía API (Twilio) con fallback a correo

**Fecha:** 2026-08-03
**Estado:** Aceptado
**Decisores:** Equipo de desarrollo + dueño del negocio

---

## Contexto

El sistema debe notificar automáticamente retrasos (NOT-01), cotizaciones listas (NOT-03), equipo listo (NOT-02) y garantías (NOT-04). El canal principal del negocio es WhatsApp. La integración puede hacerse con una API real (Twilio/Meta) o mediante envío manual desde un dispositivo (WhatsApp Web). La automatización de retrasos requiere envío automático sin intervención del vendedor.

---

## Decisión

Las notificaciones de WhatsApp se integran vía **API real (Twilio WhatsApp API)** con plantillas aprobadas por Meta. El envío es asíncrono desde el worker; si la API falla, se registra el estado `fallido`/`reintento` y el sistema **hace fallback a correo** o, si no hay contacto, genera una tarea de llamada para el vendedor (BR-RET-03/04). Todo envío queda en `notificaciones` con canal, estado y payload.

---

## Consecuencias

### ✅ Positivo
- NOT-01 (retraso) y NOT-04 (garantía) son 100% automáticas.
- Historial de envíos auditable con estados y reintentos.
- Costo bajo y aprovisionamiento rápido (sandbox → plantillas aprobadas).

### ❌ Negativo
- Depende de aprobación de plantillas por Meta (tiempo de espera inicial).
- Costo por mensaje (no aplica con WhatsApp Web gratis).
- Requiere manejo de webhooks de estado (entregado/fallido) y reintentos.
- Riesgo de bloqueo de número si se abusa del mensajero no oficial (excluido por diseño).

---

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|-------------------|
| WhatsApp Web/escritorio manual | Gratis, sin aprobaciones | No automatiza retrasos; depende del vendedor; frágil | Fallaría NOT-01/NOT-04 |
| Solo correo | Simple, sin dependencias | El canal principal del negocio es WhatsApp | Pierde el canal preferido de los clientes |
| Twilio API con fallback (elegida) | Automático + auditable + fallback | Costo + aprobación de plantillas | La única que cumple automatización y canal preferido |
