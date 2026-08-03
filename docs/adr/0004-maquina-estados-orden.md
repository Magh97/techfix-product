# ADR-0004: Máquina de estados explícita para órdenes de servicio

**Fecha:** 2026-08-03
**Estado:** Aceptado
**Decisores:** Equipo de desarrollo

---

## Contexto

Las órdenes de servicio recorren etapas: recepción, diagnóstico, cotización, reparación, entrega, cancelación, además del estado derivado "retrasada". Sin una máquina de estados explícita, los cambios de estado serían libres (cualquier usuario podría saltarse pasos) y la trazabilidad se perdería. El sistema debe validar transiciones y registrar quién/cuándo.

---

## Decisión

El estado de la orden se modela como **enum** con **transiciones permitidas validadas en el backend** (nunca libres) y un historial inmutable (`historial_orden`) con usuario, fecha y nota. Transiciones definidas en `03-business-rules.md` §4. El estado `retrasada` es **derivado** (flag calculado por `fecha_prometida` vs ahora, no una transición manual).

---

## Consecuencias

### ✅ Positivo
- Garantiza el orden del proceso (no se entrega sin cobrar, no se repara sin cotizar).
- Auditoría completa por orden (quién movió a qué estado).
- Los workers (retraso) y notificaciones se disparan desde transiciones concretas.

### ❌ Negativo
- Nueva transición futura requiere código (no es ad-hoc).
- El estado derivado `retrasada` debe recalcularse por job (cada hora) — existe ventana de imprecisión mínima.
- Más lógica de validación que un simple campo editable.

---

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|-------------------|
| Campo `estado` libre (cualquier PATCH) | Cero validación, flexible | Rompe el proceso y la trazabilidad | Inaceptable para el negocio |
| Estado calculado 100% derivado | Sin flag manual | Complejo para flujos que dependen de decisiones humanas | Mezcla: transiciones manuales + retraso derivado |
| Máquina de estados explícita (elegida) | Proceso garantizado + auditoría | Requiere código por transición | La única que cumple los requisitos |
