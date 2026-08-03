# ADR-0001: Stack — React + Node/Express + PostgreSQL (monolito modular)

**Fecha:** 2026-08-03
**Estado:** Aceptado
**Decisores:** Equipo de desarrollo

---

## Contexto

Se necesita una solución para un negocio de mantenimiento, reparación, ensamblado y venta de equipo de cómputo. El sistema es de uso interno (3 roles: admin, vendedor, técnico) con 1-3 terminales en tienda y clientes que no acceden al sistema. Los requisitos no funcionales piden respuesta < 2s, 99% uptime en horario de operación, impresión de tickets térmicos y notificaciones por WhatsApp/correo. No hay equipo de decenas de desarrolladores ni requisito de despliegue independiente por módulo.

---

## Decisión

Usaremos **React (Vite)** para el frontend, **Node.js + Express** para la API REST y **PostgreSQL 16** como base de datos, organizados como **monolito modular** (módulos por dominio dentro de un solo deploy).

---

## Consecuencias

### ✅ Positivo
- Un solo lenguaje (TypeScript) en frontend y backend → menor curva y código compartible.
- Despliegue simple en VPS (estático + contenedor Node + PostgreSQL).
- PostgreSQL da integridad transaccional crítica para reservas y stock.
- Monolito modular: deploys simples, menor latencia interna, sin costos de red entre servicios.

### ❌ Negativo
- Acoplamiento de base de código único; un bug crítico afecta todo.
- Escalado vertical antes que horizontal (aceptable para 1-3 terminales).
- Requiere disciplina de módulos para no degenerar en "spaghetti".

---

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|-------------------|
| React + Python FastAPI + PostgreSQL | Tipado fuerte, validación Pydantic | Dos lenguajes y ecosistemas; más costo de contexto | Un solo lenguaje reduce fricción en equipo pequeño |
| React + ASP.NET Core + SQL Server | Tooling maduro, gran ecosistema | Stack más pesado en VPS; licencias; dos ecosistemas | Más que lo necesario para el alcance |
| Microservicios por módulo | Independencia de despliegue | Operación compleja, red, versionado de contratos | Equipo pequeño; el MVP no lo justifica |
| MongoDB (documental) | Flexibilidad de esquema | Sin JOINs ni transacciones fuertes para stock/ventas | El dominio exige integridad relacional (reservas, CxC) |
