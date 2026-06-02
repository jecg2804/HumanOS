# Dependency audit exceptions (npm audit)

**Role:** registro durable de vulnerabilidades de `npm audit` aceptadas conscientemente (sin fix no-breaking disponible). · **Read-when:** al revisar `npm audit` o evaluar SEC-DEPS. · **Maintain-when:** cambia una dependencia que las introduce/resuelve; re-correr `npm audit` en cada bump.

> Regla (R-deps): **NUNCA** `npm audit fix --force` — rompe el stack (los "fixes" son downgrades breaking). Una excepción se retira cuando llega un fix no-breaking upstream.

## Excepciones activas (2026-06-02, W3 SEC-DEPS)

| Paquete | Sev | Vía | Por qué se difiere | Exposición real | Trigger de retiro |
|---|---|---|---|---|---|
| `path-to-regexp` 4.0.0–6.2.2 | high | `@vercel/config` → `@vercel/routing-utils` | El único fix es `@vercel/config@0.0.32` (downgrade breaking) | **Build-time** (resolución de rutas de `vercel.ts`), NO en el request path de runtime → ReDoS no explotable por usuarios | Bump de `@vercel/config` que traiga `path-to-regexp` >= 8 |
| `postcss` < 8.5.10 | moderate | `next` (toolchain CSS) | El único fix es `next@9.3.3` (downgrade catastrófico) | **Build-time** (CSS stringify); no se procesa input de usuario por postcss en runtime → XSS no explotable | Bump de `next` que traiga `postcss` >= 8.5.10 |

**Verificación (2026-06-02):** `npm audit --audit-level=high` → 5 vulnerabilidades (3 high / 2 moderate), todas en las 2 cadenas de arriba. Ambas son dependencias de **build / herramienta**, no del runtime servido al usuario. Re-evaluar en cada `npm install` / bump de `next` o `@vercel/config`; quitar la fila cuando el fix no-breaking esté disponible.
