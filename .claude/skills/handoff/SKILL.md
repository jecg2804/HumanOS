---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

## Kickoff prompt (OBLIGATORIO — siempre)

Despues de escribir el documento, **genera SIEMPRE un PROMPT DE ARRANQUE** copy-pasteable para la proxima sesion y muestralo en el chat dentro de un bloque de codigo (```). Debe ser corto y auto-contenido para que el usuario lo pegue en una sesion fresca y el agente arranque sin re-derivar:
1. Apuntar al **path absoluto del handoff doc** (leerlo primero).
2. Los 2-4 **artefactos must-read** (ADRs/specs/STATUS/CONTEXT por path).
3. La **tarea inmediata** (donde retoma).
4. Los **gotchas que NO se pueden saltar** (verificaciones obligatorias, asunciones a evitar, fuentes-de-verdad, estilo del usuario, acciones manuales pendientes).
5. Los **skills a invocar**.
