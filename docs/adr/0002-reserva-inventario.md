# ADR-0002: Reserva de inventario al aprobar cotización; descuento al consumir

**Fecha:** 2026-08-03
**Estado:** Aceptado
**Decisores:** Equipo de desarrollo + dueño del negocio

---

## Contexto

En reparaciones, el técnico cotiza refacciones necesarias. Si el cliente aprueba y otro cliente compra esas piezas antes de la reparación, el equipo no puede repararse en tiempo. El negocio además no puede vender sin stock (no se permite stock negativo). Se necesita garantizar la disponibilidad de piezas durante el trabajo sin afectar la contabilidad de inventario prematuramente.

---

## Decisión

Al **aprobar la cotización** de una orden de servicio, el sistema **reserva** el stock de las piezas cotizadas (movimiento `RESERVA`). El inventario disponible **se descuenta solo cuando el técnico registra las piezas consumidas** (`SALIDA_CONSUMO`), momento en que la reserva se convierte en consumo. Si la orden se cancela o la cotización expira, las reservas se liberan (`LIBERACION`).

---

## Consecuencias

### ✅ Positivo
- Garantiza piezas disponibles para reparaciones aprobadas (BR-INV-03).
- No descuenta inventario por cotizaciones que nunca se ejecutan.
- Bloquea sobreventa: una pieza reservada no es vendible en POS.

### ❌ Negativo
- Complejidad extra: dos estados de línea (`reservada` / `consumida` / `liberada`).
- Stock reservado aparece como "disponible en reserva" → el UI debe mostrar stock disponible vs reservado.
- Necesita `SELECT ... FOR UPDATE` y transacciones para evitar carreras entre POS y reservas.

---

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|-------------------|
| Descontar stock al aprobar | Simple; nunca sobra stock | El stock baja aunque no se repare; distorsiona reportes si la reparación falla | Contabilidad imprecisa |
| No reservar (solo descuento al consumir) | Simple | El POS puede vender la pieza ya cotizada y aprobada → incumplimiento de fecha | No garantiza la reparación |
| Reservar y descontar al aprobar (cuenta de "en tránsito") | Stock correcto en físico | Requiere doble cuenta y conciliación constante | Más complejo que reserva+consumo |
