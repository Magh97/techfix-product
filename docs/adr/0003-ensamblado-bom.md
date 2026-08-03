# ADR-0003: Ensamblado de PCs como BOM/kit que desglosa componentes

**Fecha:** 2026-08-03
**Estado:** Aceptado
**Decisores:** Equipo de desarrollo + dueño del negocio

---

## Contexto

El negocio vende PCs ensambladas a la medida (SER-12, VEN-03). El ensamble se compone de componentes individuales del inventario (procesador, RAM, disco, gabinete, fuente...). Sin un modelo de componentes, el inventario no reflejaría la salida real de piezas y el ticket no mostraría qué incluye cada equipo. Existe además mano de obra de ensamble asociada.

---

## Decisión

Un producto ensamblado se modela como **producto `is_kit = true`** con una definición **BOM** (`producto_bom`: kit → componentes con cantidades). Al vender un kit, la venta genera líneas de `detalle_venta` por cada componente y **descuenta el stock de cada componente individualmente**; el ticket muestra el desglose de componentes + mano de obra de ensamble.

---

## Consecuencias

### ✅ Positivo
- Inventario siempre consistente: cada pieza sale de su propia existencia (BR-INV-09).
- Ticket transparente con el contenido real del equipo (útil para garantía).
- Costo del kit = suma de componentes → rentabilidad calculable por línea.
- Permite re-ensamblar variantes sin crear N productos "prearmados".

### ❌ Negativo
- La venta de un kit es multi-línea: más validaciones de stock (una pieza puede no alcanzar).
- El precio del kit puede divergir del precio del producto si se define uno manual; se calcula por defecto como suma.
- Requiere que el técnico defina el BOM antes de la venta.

---

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|-------------------|
| Producto compuesto predefinido (sin BOM) | Simple; un solo item en venta | El inventario no descuenta componentes reales; ticket sin detalle | Inventario y garantía inexactos |
| Venta de servicio con componentes sueltos | Flexibilidad total | Sin plantilla reutilizable; propenso a error y tickets inconsistentes | No captura la naturaleza "configurable" del ensamble |
| BOM/kit desglosado (elegida) | Inventario correcto + ticket claro | Multi-línea y validaciones extra | El costo es menor al beneficio |
