# Frontera del KB: HumanOS mantiene el KB de RRHH; el control documental company-wide (SG Usuarios / ISO 9001) es un proyecto aparte que se consume por referencia

**Decidido 2026-06-04 (Jaime).** Fija qué parte del conocimiento documental pertenece a HumanOS y qué parte no. Respaldo: investigación de mercado (separación HR self-service KB vs eQMS ISO 9001), análisis del GDrive "Usuarios SG".

## Contexto

"Usuarios SG" (el GDrive de gestión) es el control documental ISO 9001 de ICONSA: 14 áreas, PO/IT/D/F controlados, listas maestras, fichas de proceso, más una capa de referencia legal (Reglamento Interno, Convención Colectiva ICONSA-SUNTRACS, leyes CSS/riesgos/antidiscriminación). Está incompleto, desactualizado y poco usado, pero es el system of record documental de la empresa. HumanOS ya tiene un KB de RRHH planeado (`docs.articles`).

## Decisión

- **HumanOS = KB de RRHH self-service** (`docs.articles`): FAQs, guías de onboarding, how-tos de beneficios/PTO, políticas RRHH — el rol estilo BambooHR/Guru. Más la captura de **acknowledgment** del empleado (ya existe con F-04-01 / F-01-09).
- **El control documental company-wide (SG Usuarios, ISO 9001) NO vive dentro de HumanOS.** Es candidato a **proyecto separado** (un eQMS / document-control) que las apps consumen **por referencia**. Donde un artículo de RRHH reformule una política controlada de SG, se **enlaza/transcluye** la versión autoritativa en vez de re-hospedarla.

## Alternativas descartadas

- **HumanOS como eQMS company-wide** — rechazado: obligaría a `docs.articles` a implementar gobierno ISO 9001 cláusula 7.5 (aprobación/re-aprobación, control de revisión, prevención de obsoletos, retención, audit con e-sign) para 14 áreas = construir un eQMS dentro de una app HR. Viola R1/MDM (no duplicar; el SOR es dueño). El ownership del control documental es de Calidad/SG (Samantha para SOPs de RRHH; Calidad para el resto), no de RRHH.
- **HumanOS como plataforma company-wide de formularios** — rechazado explícitamente por Jaime (2026-06-04): HumanOS es RRHH-scoped. Otros dominios (p.ej. MovimientOS = procedimiento de movilizaciones) tienen lógica propia y no son "solo formularios".

## Consecuencias / cross-refs

- La frontera exacta (qué consume HumanOS por referencia y cómo) y el ownership Calidad/SG vs RRHH se validan con Jaime + posible spec del proyecto eQMS aparte — fuera de scope MVP.
- Relacionado: ADR-0024 (sistema de docs), ADR-0014 (MDM no duplicar), ADR-0031 (GDrive "Usuarios SG" = SOR de documentos).
