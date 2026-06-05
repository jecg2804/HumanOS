# GDrive "Usuarios SG" = SOR de documentos (no solo RECURSOS HUMANOS); el repo guarda un espejo curado y pinneado, no un mirror completo

**Decidido 2026-06-04 (Jaime).** Generaliza y formaliza el modelo "GDrive = fuente de verdad de SOPs" ya presente en CLAUDE.md y los skills, a la luz de que Code lee el GDrive directo y de que las formas relevantes a RRHH se reparten por todo "Usuarios SG".

## Contexto

Code puede leer el GDrive vía el conector claude.ai (`read_file_content` da OCR). El SOR documental relevante no es solo la carpeta RECURSOS HUMANOS: la planilla vive en GESTION DE PROYECTOS (`IC-GP-*`), y las reglas (Reglamento Interno, Convención Colectiva ICONSA-SUNTRACS, leyes) viven en DOCUMENTOS DE REFERENCIA LEGAL. Jaime había pre-cargado algunos documentos al repo sin saber esta capacidad; ya no hace falta pre-cargar adivinando.

## Decisión

1. **El SOR documental es el GDrive "Usuarios SG" completo** (RECURSOS HUMANOS + GESTION DE PROYECTOS/planilla + DOCUMENTOS DE REFERENCIA LEGAL + las demás áreas), no solo RECURSOS HUMANOS. Code explora/lee on-demand.
2. **`docs/sops/` deja de ser un mirror exhaustivo**; se vuelve un **espejo curado y pinneado** de los SOPs que YA implementamos (la versión exacta contra la que se validó el `approval_chain_template`, revisable en PR) + artefactos de planilla.
3. **Fixes de skill (follow-up):** `sop-chain-auditor` (`.claude/agents/`) debe (a) incluir los tools de Google Drive en su lista de `tools` (hoy NO los tiene → físicamente no puede leer el SOR, cae al espejo incompleto: riesgo R26), y (b) corregir su `description` (aún dice "Reads the SOP PDF in docs/sops/"). Generalizar el puntero "GDrive RECURSOS HUMANOS" → "Usuarios SG" en `iconsa-form-implementation` + `sop-chain-auditor`.

## Alternativas descartadas

- **Mantener un mirror completo en repo** — rechazado: Code lee el SOR directo; mirror completo = mantenimiento y drift, justo lo que SP-0a combate.
- **Depender de GDrive en CI/headless** — rechazado: el conector claude.ai es interactivo, NO garantizado en headless/CI/cron. Lo determinista (check-docs en CI, el auditor en un gate automático) usa la copia pinneada en repo.

## Consecuencias / cross-refs

- Caveat técnico: `.xls` no se lee con `read_file_content` (usar `download_file_content`).
- Es un hecho de doc-system → su entrada de `canonical-facts` + los fixes de skill se capturan en el grill de SP-0a.
- Relacionado: ADR-0024 (sistema de docs), ADR-0027 (cadenas leídas del corpus GDrive), SP-0a (doc-sync foundation), ADR-0029 (frontera KB).
