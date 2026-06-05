# Aprobador "Gerencia General" = presidente, generalización PROVISIONAL del MVP (no regla durable)

**Decidido / refinado 2026-06-04 (Jaime).** Marca la estabilidad del mapping "Gerencia General" → `president`: es una generalización del MVP, corregible en uso, NO una regla de negocio durable. Refina el framing "RESUELTO" de `CONTEXT.md` + ADR-0027.

## Contexto

Los SOPs papel imprimen una línea de firma "Gerencia General". En ICONSA hay varios cargos gerenciales (presidente, VP, gerentes de área) y no está claro quién debe recibir/aprobar qué. `CONTEXT.md` y ADR-0027 ya mapean "Gerencia General" → `president` con resolver `president_user`, dejando ABIERTA solo la membresía. Jaime aclara hoy que **toda la generalización es provisional**, no solo la membresía.

## Decisión

1. **Término canónico: "presidente"** (CEO = presidente; usar "presidente" como lenguaje, no "CEO").
2. El step que el SOP marca "Gerencia General" → aprobador **presidente** para el MVP.
3. **Esta generalización es PROVISIONAL** — corregible en práctica/uso cuando RRHH/operación indique quién recibe qué. NO es regla de negocio long-standing.
4. Mecanismo: el aprobador se resuelve por **rol configurable** (`resolver=president_user`, ADR-0020), **no hardcodeado a una persona** — corregible en producción sin tocar código.

## Alternativas descartadas

- **Hardcodear la persona (Rodrigo)** — rechazado: la identidad/membresía cambia; resolver por rol.
- **Modelar ya todas las variantes de gerencia (VP, gerentes de área) por tipo de form** — rechazado: no hay claridad de negocio; generalizar a presidente para MVP y corregir en uso.
- **Tratar el mapping como durable / resuelto-para-siempre** — rechazado por Jaime: es provisional.

## Consecuencias / cross-refs

- **Implica un marcador de estabilidad (durable vs provisional) en el registro de hechos canónicos** (SP-0a `canonical-facts.md`): esta entrada va marcada `provisional`. Si se sembrara como verdad inmutable y se enforzara, enforzaríamos una simplificación temporal. (Input directo para el grill de SP-0a — su seed lista "GG=presidente" como hecho, y ahora sabemos que es provisional.)
- Update a `CONTEXT.md`: las entradas "Gerencia General" y "Membresia de president (GG)" pasan de "RESUELTO" a "resuelto-para-MVP, provisional, corregible en uso".
- Relacionado: ADR-0020 (resolvers; membresía president), ADR-0027 (firma = aprobación; GG → president).
