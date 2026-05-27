# Snapshot profile fields into tickets.form_data at submit time

Cuando un solicitante envia un ticket, FormEngine captura TODOS los campos con `source='profile'` (nombre, cedula, employee_code, cargo, departamento, supervisor en ese momento) y los persiste dentro de `requests.tickets.form_data` JSONB junto con los user_input. Las vistas del ticket renderizan los valores guardados, NO hacen lookup live contra `hr.people` / `hr.employments` / etc.

Esto matchea el precedente R7 (stamp_data captura `signer_name` aunque la persona cambie de nombre despues) y es audit-correct: si un empleado cambia de cargo despues de submitir un PRESTAMO, el ticket conserva el cargo que tenia al momento del envio — esa fue la base del approval. Trade-off conocido: si se corrige un typo en `hr.people.full_name` los tickets viejos siguen mostrando el typo. Mitigado con admin manual edit del ticket en casos exceptionales (RLS permite hr_admin update on tickets).

Alternativa rechazada: lookup live at view time. Mas fresco pero rompe audit y puede mostrar info incorrecta a approvers en tickets historicos.
