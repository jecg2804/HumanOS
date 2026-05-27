# Parallel mode: revision aceptada resetea steps no-terminales a Pendiente

En `parallel` mode, si un approver elige "Modificar valor con razon" (R9), ApprovalEngine inserta fila en `requests.revisions` con `status='Pendiente_Aceptacion'`, cambia ticket a `Devuelta_Modificacion`, y pausa el resto de steps (incluso los ya `Aprobada`). Si el requester acepta la revision, TODOS los steps con decision != Rechazada/Modificada (es decir Pendiente y Aprobada) se resetean a `Pendiente` y el chain re-corre desde cero sobre el valor modificado. Si el requester rechaza la revision, ticket pasa a `Cancelada` (o se queda en `Rechazada` segun policy).

Razon: audit integrity. Un approver que firmo "Apruebo $500" no acepta automaticamente $300; el stamp_text quedaria refiriendo a un valor que no es el final. El reset force re-affirm con stamp nuevo. Trade-off: re-trabajo para approvers ya actuaron, especialmente si la modificacion fue trivial (typo en motivo). Mitigacion futura post-MVP: distinguir "modificacion menor" (sin reset) vs "modificacion sustantiva" (con reset) via checkbox en el approver UI.

Alternativa rechazada: stamps quedan tal cual sobre valor viejo, otros steps continuan independiente. Audit inconsistente — el aprobador firmo monto distinto al final.
