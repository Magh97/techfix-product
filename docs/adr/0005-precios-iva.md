# ADR-0005: Precios netos sin IVA; IVA 16% calculado al vender

**Fecha:** 2026-08-03
**Estado:** Aceptado
**Decisores:** Equipo de desarrollo + dueño del negocio

---

## Contexto

El negocio no emite facturación electrónica (CFDI) por ahora, pero México exige IVA en transacciones de venta. El ticket de compra debe mostrar el desglose correcto (subtotal, IVA, total). Se debe decidir si los precios de catálogo y compras se registran con o sin impuesto, y cómo se calculan los totales en cotizaciones, ventas y reportes.

---

## Decisión

Los **precios se registran sin IVA (netos)** en catálogo, compras y costos. Al emitir cotización o venta se calcula **IVA 16%** sobre el subtotal neto y el ticket muestra `subtotal neto · IVA · total`. Montos almacenados como `NUMERIC(19,4)`; redondeo a 2 decimales solo en impresión (BR-MON-02/03/04/05).

---

## Consecuencias

### ✅ Positivo
- Desglose correcto y transparente en tickets y reportes.
- Un solo valor fuente (neto); el IVA es siempre derivado → sin discrepancias.
- Compatible con una futura facturación CFDI (los netos ya están limpios).

### ❌ Negativo
- El personal debe entender que el precio de etiqueta mostrado al cliente incluye IVA aunque en catálogo sea neto.
- Reportes de venta deben separar neto/IVA para análisis.
- Configuración de tasa IVA en `configuracion` (16% hoy) — cambio de tasa afecta solo cálculos, no datos.

---

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|-------------------|
| Precios con IVA incluido | "Precio que ve el cliente" | Desglose requiere división; compras/costos mezclan impuesto; reportes confusos | Doble interpretación del valor almacenado |
| Sin manejo de IVA | Muy simple | Ticket ilegal en México; difícil migrar a CFDI | Riesgo fiscal |
| Netos + IVA calculado (elegida) | Fuente limpia, desglose correcto | Concepto a entrenar en tienda | El correcto fiscal y técnicamente |
