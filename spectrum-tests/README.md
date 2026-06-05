# spectrum-tests — SNAPSHOTS DE REFERENCIA, **NO** fuente de verdad

> ⚠️ Los `*.response.xml` aqui son **snapshots parciales y posiblemente stale** de una corrida de `test-spectrum.ps1`. **NO son la fuente de verdad de la data SDX.**

**Leccion 2026-06-04:** la captura `GetPhase.response.xml` (501 filas) estaba **incompleta** — no traia las phases de los extras (`24-404E1` en vivo = **91 phases**, ausentes del snapshot). Casi modelamos `core.phases` mal (FK a la obra base en vez de al extra). Lo atrapo el query en vivo.

## Regla

Para CUALQUIER decision de modelo / conteo / completitud, **consulta el SDX en vivo**, no estos archivos:
- Endpoint: `https://iconsanet.dexterchaney.com:8482/ws/<Service>` · auth `ICN:API` · SOAP/XML (ver `*.request.xml`).
- O via el Edge Function `sdx-sync` (cuando exista).

Estos archivos sirven SOLO como:
- `*.wsdl.xml` — contrato del servicio (params, estructura). Util offline.
- `*.request.xml` — envelope SOAP de ejemplo.
- `*.response.xml` — **estructura de campos de referencia, NO data completa.**

**SOR de data SDX = la API live.** Ver `docs/adr/0032-core-mdm-foundation-spectrum-sdx.md` + `docs/superpowers/specs/2026-06-04-core-mdm-foundation-design.md`.
