# Toolstack Roadmap — HumanOS

**Role:** hoja de ruta de herramientas/servicios para llevar HumanOS a paridad con líderes de mercado HR (Workday, BambooHR, Rippling, Personio, Deel) siendo fundador solo + construido con IA, sobre Next.js 16 + Supabase + Vercel. · **Read-when:** al evaluar adoptar una librería/servicio externo, o al planear un Group nuevo. · **Maintain-when:** un candidato cambia de veredicto o pasa de fase (ej. EVALUATE-LATER -> ADOPT).

**Última actualización:** 2026-06-01

---

## Principios de selección

1. **Supabase-native primero.** Postgres ya tiene casi todo: `pgvector` (embeddings), full-text search (`tsvector` + GIN), `pgmq` (colas), `pg_cron` (scheduling), Storage (archivos + CDN). Antes de traer un servicio externo, demuestra por qué un primitive de Supabase NO basta. La regla R1 (schemas permitidos) y la BD compartida con MovimientOS hacen que cada tabla nueva sea más barata que un sistema externo a sincronizar.
2. **Vercel-native segundo.** AI Gateway (routing + embeddings + observabilidad de IA), Cron, Edge Config, KV. Ya pagamos Vercel; evitamos un proveedor más.
3. **YAGNI con disparador explícito.** Cada herramienta se clasifica ADOPT-NOW / ADOPT-AT-GROUP-N / EVALUATE-LATER y lleva un **disparador de decisión** concreto, no "instalar todo ya". El coste de un fundador solo no es la licencia: es el mantenimiento, el on-call y los ciclos de upgrade que compiten con shipping.
4. **Cuesta de salida baja.** Preferimos open-source / Postgres-native / estándares (OpenTelemetry, ICU) sobre lock-in propietario, salvo que el SaaS ahorre semanas reales.
5. **No duplicar fuente de verdad.** La BD es source of truth (CLAUDE.md). Un CMS o un índice de búsqueda externo que copie datos de `hr.*`/`docs.*` viola esto salvo justificación fuerte.
6. **Encoding R23 / idioma:** este doc UTF-8 sin BOM, español neutro Panamá, sin voseo.

**Leyenda de veredictos:** MANTENER (ya elegido, sigue siendo correcto) · REEMPLAZAR (cambiar por alternativa native) · DIFERIR (válido, pero no ahora) · RECHAZAR (no adoptar). **Fase:** ADOPT-NOW = Group 3 actual · GROUP-N = al llegar a ese hito · EVALUATE-LATER = sin compromiso, revisar al disparador.

---

## Fase 0 — LIVE hoy (no tocar)

| Herramienta | Categoría | Veredicto | Fase / Disparador | Por qué | Alternativa Supabase/Vercel-native |
|---|---|---|---|---|---|
| Resend | Email transaccional | MANTENER | LIVE | 7 templates en prod, worker Cron `/api/cron/process-notifications`, opt-in en `hr.user_settings`. React Email + Tailwind ya integrado. | Supabase Auth emails solo cubre auth; Resend sigue siendo el canal correcto para notificaciones de dominio. |
| Sentry | Error tracking + APM | MANTENER | LIVE | Ya activo HumanOS + MovimientOS, SDK `@sentry/nextjs`, MCP para triage. Error tracking de calidad no es Postgres-native. | Vercel Runtime Logs/Observability cubre menos; mantener Sentry como SOR de errores. |
| Vercel (hosting + Cron) | Hosting / scheduling | MANTENER | LIVE | Cron en `vercel.ts`, deploys, env vars. Base de la regla "Vercel-native segundo". | n/a (es la plataforma). |
| Supabase (Postgres + Auth + Storage) | BD / auth / storage | MANTENER | LIVE | Fuente de verdad. `auth.users` compartido (R2), schemas modulares (R1). | n/a (es la plataforma). |
| Documenso | Firma electrónica | MANTENER | GROUP-N (cuando un form requiera firma legal vinculante) | Ya decidido. Open-source, self-host posible, evita lock-in DocuSign. Necesario para acción de personal / contratos. | No hay equivalente native; firma criptográfica es dominio especializado. |

## Fase 1 — ADOPT-NOW (Group 3: Perfil + Knowledge Base + doc Q&A)

| Herramienta | Categoría | Veredicto | Fase / Disparador | Por qué | Alternativa Supabase/Vercel-native |
|---|---|---|---|---|---|
| **pgvector** (Supabase) | Embeddings / vector store | ADOPT-NOW (en vez de Pinecone) | Group 3 al construir KB + doc Q&A | Bajo ~50M vectores es más barato y más simple: el documento y su vector se escriben en un solo INSERT atómico, sin servicio que sincronizar. Permite combinar vector + full-text + filtros RLS en una sola query SQL. | **Es** el native. Reemplaza a Pinecone. |
| **Vercel AI Gateway** | AI gateway / routing / embeddings | ADOPT-NOW | Group 3 (cualquier llamada a LLM) | Un solo endpoint para múltiples proveedores, fallback por uptime/latencia, budgets, observabilidad de tokens, y genera los embeddings que alimentan pgvector. Evita acoplar a un proveedor. | Es el native de Vercel. |
| **Vercel AI SDK** | SDK de IA (chat, RAG, tool calling) | ADOPT-NOW (en vez de LangChain) | Group 3 doc Q&A | Native Edge, mejor DX en RSC, sin la sobrecarga de abstracción de LangChain (10-15% de tokens en scaffolding, +12-19% latencia por doble parseo medido en migraciones 2026). Para RAG/chat de un KB no necesitamos el grafo de agentes de LangChain. | Es el native. Reemplaza a LangChain. |
| **Postgres FTS (`tsvector` + GIN)** | Búsqueda full-text | ADOPT-NOW | Group 3 al hacer KB/empleados buscables | Bajo 10M docs y cientos de qps, FTS nativo es más rápido de implementar, más barato y sin infra extra. Hybrid search (FTS + pgvector) en una query. | Es el native. (Algolia/Typesense = EVALUATE-LATER). |
| **Supabase Storage + CDN** | File storage / CDN | ADOPT-NOW | Group 3 (uploads de KB, fotos, adjuntos de tickets) | Ya parte de la plataforma, RLS sobre buckets, CDN incluido. Schema `files.*` ya reservado. | Es el native (vs S3/Cloudinary externos). |
| **markitdown / Docling** (lib local) | Extracción de documentos -> Markdown | ADOPT-NOW (de su lista) | Group 3 ingestión de SOPs/PDFs al KB | Open-source, corre local/en una function, convierte PDF/DOCX a Markdown limpio para chunking + embeddings. Sin coste por página. Docling gana en tablas complejas (los SOPs ICONSA tienen tablas). | Corre dentro de una Vercel Function / Edge Function; no requiere SaaS. |

## Fase 2 — ADOPT-AT-GROUP-N (cuando el hito lo exija)

| Herramienta | Categoría | Veredicto | Fase / Disparador | Por qué | Alternativa Supabase/Vercel-native |
|---|---|---|---|---|---|
| **Supabase Queues (`pgmq`)** | Background jobs / colas | ADOPT-AT-GROUP-N | Disparador: primer job que NO encaje en "Cron cada 5 min + tabla". Probablemente Group 4+ (ApprovalEngine async, recordatorios, batch de notificaciones). | Cola durable en Postgres, cero infra nueva, transaccional con el resto del dominio. Empezar aquí antes que cualquier SaaS de jobs. | Es el native. Reemplaza la necesidad de Inngest/Trigger.dev al inicio. |
| **Trigger.dev** | Background jobs largos / orquestación | EVALUATE-LATER | Disparador: necesitas jobs > límite de timeout de Vercel Function, fan-out/retry/observabilidad complejos que `pgmq` + Cron no dan cómodamente (ETL pesado, reprocesar miles de docs). | Open-source (Apache-2.0), self-host posible, jobs en compute dedicado sin límite de timeout serverless. Menor lock-in que Inngest (closed-source). | `pgmq` cubre el 80%; subir a Trigger.dev solo al chocar con el límite. |
| **PostHog** (cloud, no self-host) | Product analytics + feature flags + session replay | ADOPT-AT-GROUP-N | Disparador: hay usuarios reales midiendo adopción de un Group shipped (post Group 3/4). Usar **cloud**, NUNCA self-host. | All-in-one: analytics + flags + replay + surveys. Para un fundador solo, una sola herramienta < integrar 3. **No self-host** (requiere ClickHouse+Kafka+Redis+PG = on-call que no queremos). | Vercel Web Analytics cubre tráfico básico ya; PostHog cuando necesites funnels/cohortes/flags de producto. |
| **Feature flags** | Gestión de releases | ADOPT-AT-GROUP-N | Disparador: primer rollout gradual o A/B. Si ya entró PostHog, usar sus flags. Si no, **Vercel Edge Config / flags SDK**. | Permite shippear Groups detrás de flag sin ramas largas. | **Vercel flags SDK + Edge Config** es el native y suficiente; PostHog flags si ya está. (Flagsmith solo si compliance lo exige). |
| **Upstash Redis** | Rate limiting / cache efímero | ADOPT-AT-GROUP-N | Disparador: primer endpoint público o costoso que necesite rate limit (ej. doc Q&A contra LLM, login throttling más fino que el de Supabase). | `@upstash/ratelimit` es el estándar serverless. Por-request, sin instancia que mantener. | **Vercel KV** (= Upstash con billing Vercel) o **Vercel Runtime Cache** primero por fricción cero; Upstash directo si quieres mejor precio/control. Caching de datos: preferir Cache Components de Next 16 (`use cache`) antes que Redis. |
| **next-intl** | i18n | EVALUATE-LATER | Disparador: segundo idioma real requerido (hoy es español-only Panamá; inglés solo si entra personal expat o se vende fuera). | Diseñado para RSC de App Router, ICU, sin overhead de hidratación. Estructurar copy en mensajes desde ya facilita la migración futura. | Es una lib, no hay native; es el default correcto para Next 16. |

## Fase 3 — EVALUATE-LATER (sin compromiso; revisar al disparador)

| Herramienta | Categoría | Veredicto | Fase / Disparador | Por qué | Alternativa Supabase/Vercel-native |
|---|---|---|---|---|---|
| **CMS headless** (Sanity / Payload) | Gestión de contenido | DIFERIR / casi RECHAZAR para datos de dominio | Disparador: contenido editorial largo (políticas, blog interno, marketing) que RRHH edite sin tocar código. | Para el KB de SOPs el contenido vive en `docs.*` (BD = source of truth, R1). Un CMS que copie eso duplica la fuente de verdad. Solo justificado para contenido editorial NO-dominio. Si entra: **Payload** (Next-native, corre dentro del repo) > Sanity (Content Lake externo). | **MDX en repo** para docs técnicas; **tablas `docs.*` + editor propio** para contenido de dominio. CMS solo para editorial puro. |
| **dbt** | Transformaciones analíticas (ELT) | DIFERIR | Disparador: existe un warehouse separado y >1 fuente que modelar (PayDay payroll, Trimble, etc. — ya planned en `future/13-INTEGRATIONS-PLANNED.md`). | Para un esquema Postgres single-source, vistas SQL + `pg_cron` bastan. dbt aporta cuando hay ELT multi-fuente y un equipo de datos; hoy no. | **Vistas / materialized views + `pg_cron`** en Supabase. dbt cuando el ETL planned se active. |
| **ETL / reverse-ETL** (Airbyte/Fivetran/Estuary) | Integración de datos | DIFERIR | Disparador: activar las integraciones planned (PayDay, Trimble B2W/Spectrum/ProjectSight, Skydata). | Documentado en `future/13-INTEGRATIONS-PLANNED.md` + `12-SOR-MATRIX.md`. No es scope MVP. | Edge Functions + `pgmq` para syncs simples; herramienta ETL solo si las fuentes lo exigen. |
| **Algolia / Typesense / Meilisearch** | Search-as-a-service | EVALUATE-LATER | Disparador: FTS Postgres deja de rendir (>10M docs o necesidad de typo-tolerance/instant-search tipo consumer). | Ninguno está hecho para Postgres; añaden un índice a sincronizar. Innecesarios al volumen ICONSA (~cientos de empleados). | **Postgres FTS + pgvector hybrid** cubre el caso. |
| **OpenTelemetry / observabilidad ampliada** | Tracing / logs | EVALUATE-LATER | Disparador: latencias multi-servicio difíciles de diagnosticar con Sentry + Vercel logs. | Sentry APM + Vercel Observability + Supabase logs bastan al tamaño actual. | Vercel Observability + Sentry; OTel cuando haya servicios distribuidos. |
| **Compliance/audit tooling** (DSAR, retención) | Cumplimiento Ley 81 | DIFERIR (construir, no comprar) | Disparador: requisito formal de export/borrado de datos personales (R27, `14-COMPLIANCE-LEY81.md`). | Ley 81 se cumple con el schema `audit.*` + RLS + flujos propios, no con un SaaS genérico de GDPR. Datos médicos/personales no deben salir a un tercero. | Schema `audit.*` + funciones SQL + Storage con RLS. Construido in-house. |

---

## Rechazos explícitos (de la lista del fundador)

| Herramienta | Veredicto | Razón |
|---|---|---|
| **Pinecone** | RECHAZAR (usar pgvector) | Servicio externo que sincronizar + coste 40-60% mayor a escala media. pgvector escribe doc+vector atómicamente y permite hybrid search con RLS en una query. Solo reconsiderar > ~50M vectores (ICONSA está a órdenes de magnitud de eso). |
| **LangChain** | RECHAZAR (usar Vercel AI SDK) | Sobrecarga de abstracción (101 kB gzip, bloquea Edge, +scaffolding de tokens, +latencia por doble parseo). Para chat/RAG sobre un KB no aporta sobre AI SDK + AI Gateway. Si algún día hace falta un grafo de agentes complejo en backend, reconsiderar LangGraph puntualmente. |
| **CMS (para datos de dominio)** | RECHAZAR como SOR de dominio | Duplicaría la fuente de verdad (`docs.*`/`hr.*`), viola el principio "no duplicar SOR" + R1. Válido solo para contenido editorial puro (DIFERIR, ver Fase 3). |

---

## Resumen ejecutivo por fase

- **LIVE:** Resend, Sentry, Vercel Cron, Supabase, (Documenso al primer form con firma).
- **ADOPT-NOW (Group 3):** pgvector, Vercel AI Gateway, Vercel AI SDK, Postgres FTS, Supabase Storage/CDN, markitdown/Docling.
- **ADOPT-AT-GROUP-N:** Supabase Queues (`pgmq`) al primer job no-Cron; PostHog **cloud** + feature flags al tener usuarios midiendo adopción; Upstash/Vercel KV al primer rate limit.
- **EVALUATE-LATER:** CMS (solo editorial), dbt + ETL (al activar integraciones planned), Algolia/Typesense (si FTS no rinde), OTel, tooling de compliance (construir, no comprar), next-intl (al segundo idioma).
- **RECHAZAR:** Pinecone (-> pgvector), LangChain (-> Vercel AI SDK), CMS como SOR de dominio.

---

## Fuentes

- [Supabase — pgvector vs Pinecone: cost and performance](https://supabase.com/blog/pgvector-vs-pinecone)
- [Encore — pgvector vs Pinecone: which to choose in 2026](https://encore.dev/articles/pgvector-vs-pinecone)
- [Vercel — AI Gateway docs](https://vercel.com/docs/ai-gateway) · [Capabilities (embeddings)](https://vercel.com/docs/ai-gateway/capabilities)
- [Digital Applied — LangChain to Vercel AI SDK migration playbook 2026](https://www.digitalapplied.com/blog/langchain-to-vercel-ai-sdk-migration-playbook-cost-quality-2026)
- [Speakeasy — agent framework comparison (LangChain vs AI SDK)](https://www.speakeasy.com/blog/ai-agent-framework-comparison)
- [Supabase Queues / pgmq docs](https://supabase.com/docs/guides/queues)
- [StarterPick — Inngest vs BullMQ vs Trigger.dev 2026](https://starterpick.com/guides/background-jobs-inngest-vs-bullmq-vs-trigger-2026)
- [PostHog — alternatives compared](https://posthog.com/blog/posthog-alternatives) · [Better Stack — Top PostHog alternatives 2026](https://betterstack.com/community/comparisons/posthog-alternatives/)
- [buildmvpfast — cache pricing: Upstash vs Vercel KV (2026)](https://www.buildmvpfast.com/api-costs/cache)
- [ParadeDB — Postgres full-text search vs alternatives](https://www.paradedb.com/blog/elasticsearch-vs-postgres) · [Tiger Data — hybrid search pgvector + FTS](https://www.tigerdata.com/blog/combining-semantic-search-and-full-text-search-in-postgresql-with-cohere-pgvector-and-pgai)
- [Firecrawl — best PDF parsers for RAG 2026](https://www.firecrawl.dev/blog/best-pdf-parsers) · [Procycons — Docling vs Unstructured vs LlamaParse benchmark](https://procycons.com/en/blogs/pdf-data-extraction-benchmark/)
- [buildmvpfast — best headless CMS for SaaS 2026 (Payload/Sanity/Strapi)](https://www.buildmvpfast.com/blog/best-headless-cms-saas-blog-2026-payload-sanity-strapi)
- [Simor — dbt vs SQLMesh 2026](https://simorconsulting.com/blog/dbt-vs-sqlmesh-which-transformation-tool-wins-in-2026/)
- [next-intl vs next-i18next (Locize)](https://www.locize.com/blog/next-intl-vs-next-i18next/) · [Best i18n libraries 2026 (DEV)](https://dev.to/erayg/best-i18n-libraries-for-nextjs-react-react-native-in-2026-honest-comparison-3m8f)
- [TrulyCritic — BambooHR vs Workday vs Rippling vs ADP 2026](https://www.trulycritic.com/blog/best-hr-software-2026) · [SIIT — best HRIS systems 2026](https://www.siit.io/blog/best-hris-system)
