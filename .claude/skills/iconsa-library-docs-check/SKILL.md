---
name: iconsa-library-docs-check
description: Verify external library APIs are current via Context7 before implementation. Use whenever about to import or write code using Next.js, React, Tailwind, Supabase SDK, Resend, Twilio, Documenso, Zod, npm package, library, framework, API, hook, server action, middleware, proxy, client component, server component, useState, useEffect, useRouter, app router, route handler, layout, page, or any external dependency. Also trigger on prompts mentioning specific versions like next 16, react 19, tailwind 4.
---

# Library docs check via Context7

## When to invoke

Before writing code that uses external libraries, especially:
- Next.js APIs (middleware/proxy, server actions, route handlers, app router, dynamic params, async params, image, fonts)
- React APIs (hooks, suspense, server components, transitions, useEffectEvent, Activity)
- Supabase SDK (auth helpers, RLS patterns, ssr clients, realtime, edge functions)
- Tailwind CSS (utility classes, config syntax — Tailwind 4 is CSS-first, very different from 3)
- Resend (email API, React email templates)
- Twilio (SMS, WhatsApp Business API, verify)
- Documenso (e-signature API, webhooks)
- Zod (schema validation, v4 has breaking changes from v3)
- Any other npm package about to be installed or used

## How to invoke

1. mcp__context7__resolve-library-id with library name (e.g. "next.js", "supabase", "react", "tailwind")
2. mcp__context7__get-library-docs with the resolved ID and the specific topic
3. Read returned docs BEFORE writing code

If Context7 namespace is different in this session (e.g. `mcp__plugin_context7_context7__*`), use the namespace shown in /mcp.

## Why this matters

Training data has knowledge cutoffs. APIs change in breaking ways. Recent examples models miss:

| Library | Version | Breaking change |
|---|---|---|
| Next.js | 16 (Oct 2025) | middleware.ts -> proxy.ts, Turbopack default, async params required |
| React | 19.2 (Apr 2026) | View Transitions API, useEffectEvent stable, Activity component |
| Tailwind | 4 (May 2025) | CSS-first config (no tailwind.config.js needed for base), removed JIT flag |
| Supabase SSR | Latest | createServerClient signature changed, cookies handling different |
| Zod | 4 (2025) | .partial(), .strict(), .passthrough() deprecated |

Without Context7 check, you may write code with deprecated APIs that emits build warnings, breaks in production, or looks fine in training but is wrong now.

## Exceptions (skip Context7)

- Pure internal HumanOS code (no external library)
- Just consulted Context7 for same library + topic in current session
- Trivial usage you verified recently this session

## Workflow integration

If Context7 reveals an API change:
1. Note in `docs/CONTEXT.md` glossary (vocabulary now means X in version Y)
2. If non-trivial: create ADR in `docs/adr/` documenting the chosen approach
3. Pin library version in `package.json` to avoid surprise upgrades

## Anti-patterns

- Asuming React/Next.js/Supabase APIs without verification
- Copying patterns from old tutorials, Stack Overflow, or training memory
- Saying "this is standard" without checking current docs
- Installing latest version of a library without reading its changelog


