# ADR-0002 — AMANZINE Architecture Constitution

- **Status:** Accepted (immutable until beta data justifies a change)
- **Date:** 2026-07-17
- **Supersedes discussion of:** Grok audit, DeepSeek Studio proposal, ChatGPT/reviewer notes

## Identity (settled)

AMANZINE is a **Need Operating System** ("نظام تشغيل للحاجة"), not a
marketplace, super-app, or commerce OS. The product is the chain:

```
Need → Perception(understand) → Decision → Action
```

Domains (products, cars, real-estate, services, jobs, hotels, medical…) are
**data**, not features. The user sees one simple question — "شنو محتاج؟" —
and feels understood; the developer sees a Control Center that sees, teaches,
and evolves the whole brain. Both run on the **same** architecture.

## The Laws (do not break)

1. **No knowledge outside the Registries.** Six registries are the single
   source of truth: Page · Workflow · Schema · Capability · Relation ·
   Component (+ the Knowledge Foundation registries: Vocabulary · Problem ·
   SymptomGraph · Profession · Tool · Geo · Category).
2. **Everything new is Registered → Understood → Related → Usable before use.**
   Any new module, page, button, word, capability, entity, language, or
   workflow declares itself; the brain must know it — it never reads source.
3. **The brain proposes, humans decide.** Knowledge is never self-modified.
   The only path is: `Observe → Suggest → Review → Approve → Publish`. AI
   proposes candidates; a developer/admin approves. No `Observe → Modify`.
4. **UI renders, engines decide.** No decision logic in pages/components. A
   page is `<PageEngine/>`; a control is a registered Component.
5. **One perception entry point.** All understanding flows through
   `understand()` (evolving into Perception: text→+image/voice/location/
   history). Callers never bypass it or call sub-engines directly.
6. **No new Engine without beta data.** The engine set is frozen (Decision ·
   Question · Action · Policies · Renderer · PageEngine). New engines require
   evidence from real usage, not speculation.
7. **Every feature spans all layers.** A real feature touches
   Knowledge → Decision → UI → Control Center → Learning. If it only touches
   one, it is incomplete.
8. **No special paths.** No domain/feature gets a bespoke route around the
   engines. Many exceptions = the architecture must be generalized, not
   patched. Knowledge changes are versioned, testable, and reversible.

## Learning — five sources, one gate

Learning is not "the app learns by itself" (rejected as vague/dangerous). It
is five explicit sources, all passing through Law #3's human gate:

1. **User** — this user's habits (Darija, WhatsApp, COD, few words).
2. **Collective** — patterns across users ("كيهرب" → plumber, 90%).
3. **Developer** — hand-added rules/relations/knowledge.
4. **AI** — proposes candidates (never writes) → Pending → approve.
5. **Runtime** — observations ("this question is always skipped").

## Control Center (next build — platform inside the platform)

Not an admin dashboard. Built with the **same** registries/engines/events.
Centers (staged, read-only first, then Teach/Approve, then Versioning/Sandbox):

- **Brain** — live `understand()` tester + Decision/Question/Action trace.
- **Knowledge** — vocabulary/problems/symptoms/capabilities/relations/geo.
- **System** — the app knows itself: pages/routes/buttons/modules/components/
  schemas/workflows/permissions/APIs (extends the AKG page descriptors).
- **Learning** — "what we learned today" + Approve/Reject/Merge (Law #3).
- **Live Brain** — last N understandings, low-confidence, unknown expressions,
  one-click **Teach**.
- **Evolution** — add a domain → brain scaffolds Schema/Theme/Questions/
  Capabilities/Relations/Workflow/Page for review.
- **Observatory / Health** — where the brain fails/hesitates; runtime health.
- **Memory** — experience/observation/decision/outcome (not logs).
- **Versioning + Sandbox** — Knowledge Packs (Morocco/Darija/Cars…) with
  version/author/changelog; Draft → Test/Simulate → Approve → Production →
  Rollback.

## What we keep / clean / build / defer

- **KEEP & FREEZE:** 6 registries, engines, PageEngine, Universal Renderer,
  Knowledge Foundation v2, `understand()`, "فهمنا طلبك".
- **CLEAN (beta-hardening, not user-facing, scheduled — not now):** God
  components (ProductsPage ≈2298 LOC), dead code (SQLite remnants, TikTok
  mock), duplicate analytics.
- **BUILD NEXT:** Control Center foundation (read-only unification of existing
  panels + kb + registries), then Teach/Approve.
- **DEFER until beta data:** Redis, SSR (public pages only), Semantic search /
  embeddings, Trust engine, autonomous suggestions, Perception (multimodal),
  capability levels, symptom canonical/community/embedding split.

## Roadmap (final, consolidated)

1. ✅ Architecture Freeze · 2. ✅ Knowledge Foundation v2 · 3. ✅ "فهمنا طلبك"
→ 4. ✅ **Control Center** (Phase A read-only + Explain/`describe()` per ADR-0003 +
Phase B: Memory Layer — Observe→Suggest→Approve→**Apply**, human gate) · ✅ Need OS
identity · ✅ dead-code cleanup → 5. **Closed Beta** (Casablanca · home maintenance
· 100–150 verified providers) → 6. Production hardening (Sentry · backups ·
God-split · then Redis when data proves need) → 7. Semantic · Embeddings ·
autonomous suggestions — data-driven, never speculative.

## Scores (for the record, honest)

Architectural vision 9.8/10 · Extensibility 9.8 · Separation 9.7 · Knowledge
design 9.5 · Production readiness 8.1 (the hard part — real data — hasn't
started). No 10/10 before thousands of real journeys.
