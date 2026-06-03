# Chain fidelity: una firma = una aprobación; RRHH = visibilidad no gate; el app digital colapsa los hand-offs de papel; los procedimientos maestros (PO) ganan

**Decidido 2026-06-03 (Jaime).** Refina R26 (`reference/business-rules.md`) con las reglas que rigen cómo se traduce un formulario papel ICONSA a un `approval_chain_template`. Fuente de las cadenas corregidas: `docs/work/2026-06-03-hr-catalog-and-launch-plan.md` §1+§4 (lectura del corpus GDrive RECURSOS HUMANOS, la SOR de SOPs).

## Decisión — cuatro reglas de fidelidad de cadena

1. **Firma = aprobación.** Si el formulario papel imprime una línea de firma para una entidad (Supervisor, Gerente General, etc.), esa entidad es un **step de aprobación** (`kind=approval`) en la cadena. No se infieren ni se omiten gates: la firma en el papel es el gate.

2. **RRHH siempre está en el flujo, pero como VISIBILIDAD, no como gate.** Todo ticket pasa por RRHH —porque el **expediente digital** debe ver todo— pero RRHH es un step de **procesamiento/visibilidad** (`kind=processing`), **NO** un step de aprobación, *salvo que el formulario tenga una firma de RRHH* (entonces sí aplica la regla 1). Esto codifica la frase de Jaime: *"todo debe llegar a RRHH; no es que RRHH tenga que aprobar."* (Consistente con `CONTEXT.md` ChainResolver: "RRHH siempre incluido desde día 0 en modes no `parent_only`".)

3. **El app digital COLAPSA los hand-offs de papel.** Las rutas físicas intermedias del papel ("el Capataz llena y lo devuelve al Superintendente para entregar a RRHH") son artefactos de papel: en digital el Capataz llena y **llega directo** a quien aprueba/recibe. Solo se modelan como steps las **decisiones reales** (aprobación) y la **recepción/processing** (R8), no los traslados de papel.

4. **Los procedimientos maestros (PO) ganan sobre los scans de formulario viejos.** En conflicto entre el cuerpo de un PO (p.ej. `IC-RH-PO-05` Acciones de Personal, VV.2018) y un scan de formulario más antiguo (p.ej. los formatos VV.2012), **el PO es autoritativo** para la cadena. La cadena per-tipo se LEE del cuerpo del PO, no se asume del formulario.

### Distinción de step: `kind`

Cada step del `approval_chain_template` lleva `kind`:
- `submit` — el solicitante inicia.
- `approval` — gate real (hay firma en el papel; bloquea el avance hasta decidir; R5 no-self-approval, R9 back-and-forth aplican).
- `processing` — recepción/post-aprobación R8 ("Recibido/Procesado/Para uso de oficina", Asist. Planillas, RRHH-archivo, Finanzas). Render **read-only/admin**; nunca input del empleado ni gate; provee visibilidad/expediente.

## Contexto / por qué

Los formularios papel ICONSA mezclan tres cosas en sus bloques de firma: aprobaciones reales, recepciones administrativas (R8), y traslados físicos de papel. Sin estas reglas, el ApprovalEngine modelaría RRHH como gate donde solo recibe (rompiendo la regla "RRHH no aprueba pero ve todo"), o preservaría hand-offs de papel que el digital elimina, o seguiría un scan 2012 que el PO 2018 ya corrigió. Mapear "Gerencia General" → `president` (resuelto en ADR-0020 update + `CONTEXT.md`) es un caso de la regla 1.

## Alternativas descartadas

- **Modelar cada línea de firma/recepción como gate de aprobación** — rechazado: convierte recepciones administrativas (RRHH-archivo, Planilla-procesa) en gates que bloquean, contra la realidad operativa.
- **Preservar las rutas de papel intermedias** — rechazado: son fricción que el digital existe para eliminar.
- **Tratar el scan del formulario como autoritativo** — rechazado: los scans 2012 divergen del PO 2018 vigente.

## Consecuencias / cross-refs

- `requests.types.approval_chain_template` steps llevan `kind` (approval/processing/submit). El ApprovalEngine solo gatea en `kind=approval`.
- `sop-chain-auditor` (`.claude/agents/`) NO debe marcar como DEVIATES una cadena digital correctamente colapsada (firma=aprueba; RRHH=visibilidad salvo firma; hand-offs colapsados; PO > scan viejo).
- Relacionado: ADR-0020 (chain-template modes; "Gerencia General"=`president`), ADR-0005 (manual-entry trust), ADR-0022 (admin viewer read-only en MVP; el editor de cadenas es v1.1/v2 — las cadenas son config en `approval_chain_template`, su EDITOR no es MVP).
- La membresía del `president` (solo Rodrigo vs +VP Javier Ferrer/otros gerentes) sigue **abierta/define-in-practice** (ver ADR-0020 update + `CONTEXT.md`).
