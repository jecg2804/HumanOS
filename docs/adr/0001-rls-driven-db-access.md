# RLS-driven DB access via user JWT + RPC SECURITY DEFINER for cross-user writes

> Related: implementa el access-control sobre los schemas modulares definidos en `0011-schemas-modulares-bd-compartida.md` (Chat-level ADR-0002, merged 2026-06-01).

Toda query/mutation desde Next.js usa Supabase client autenticado con cookies del user (server) o JWT (browser). RLS policies sobre las tablas de `hr.*`, `requests.*`, `docs.*`, etc. son la fuente de truth de visibilidad y autorizacion. Para writes que cruzan boundaries de RLS (ej: ApprovalEngine.approve() debe registrar accion del approver + actualizar ticket + insertar audit log + queue notification a otros users), usamos SQL functions `SECURITY DEFINER SET search_path = ''` invocadas via RPC. Esto da defensa en profundidad — si una policy esta mal, lo descubrimos rapido en tests E2E, no en produccion.

Alternativa rechazada: service role en server actions con validacion manual de R5, R13, R22 en cada path. Demasiado facil olvidar un check; los incidentes 2026-05-25 (47 users borrados) ocurrieron exactamente por ese pattern.
