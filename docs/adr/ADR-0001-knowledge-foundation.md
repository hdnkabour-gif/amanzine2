# ADR-0001 — Knowledge Foundation & Architecture Freeze

- **Status:** Accepted
- **Date:** 2026-07-17
- **Context owner:** AMANZINE core

## Context

Over ~12 iterations the runtime settled into a clean, data-driven core:
**six registries + engines**, with pages reduced to `<PageEngine page="x" />`.
A large external dossier then proposed evolving AMANZINE into a national
"Knowledge OS" with ~15 additional engines (Context, Rule, Reasoning, Trust,
Reputation, Event, Behavior, Spatial, Versioning, Provenance, Temporal,
Policy, Capability Graph…), microservices, Neo4j, Elastic, PostGIS, pgvector.

The same dossier also warns, in its own final recommendation, that
**over-engineering is the single biggest risk** and "don't build everything
at once." We take that warning as binding.

## Decision

### 1. Architecture is FROZEN at six registries + engines
Registries: **Page · Workflow · Schema · Capability · Relation · Component.**
Engines: **Decision · Question · Action · Renderer · PageEngine · Policies.**
No new engine, layer, or registry is added. All future work is **data added
to a registry**, not new code in an engine.

### 2. Product identity (this stage)
AMANZINE is a **smart services platform built on a knowledge core** — not a
"Knowledge Operating System." The user wants their problem solved; the
provider wants work. The knowledge core is the *means*, not the product the
user sees. "Knowledge OS" is a possible future framing once the core is
reused across many domains — not today's identity.

### 3. Adopt: Knowledge Foundation Pack v1 (data, not engines)
Six data registries under `src/lib/akg/kb/`, feeding inference/search without
touching the architecture:
- **Vocabulary Registry** — AR / Darija / FR / EN (+ Amazigh when available),
  synonyms, typos, slang → one concept.
- **Profession Registry** — profession → sector, specializations, skills,
  capabilities, related professions, tools (ontology, not words).
- **Problem Registry** — Darija symptom → profession + severity + emergency.
- **Tool & Material Registry** — tools/materials ↔ profession.
- **Administrative Geography Registry** — 12 regions → cities → districts →
  postal; powers the location widget and "near me".
- **Category Registry** — the ten Moroccan market domains with priority.

`kb.understand(text)` bridges these into `inference.ts`, which is now
data-driven ("الما كيسيل" → سبّاك; "الماطور كيطق طق" → ميكانيكي; "الروي مفشوش"
→ تقني عجلات; پنو → إطار). This respects the Freeze — it adds data, not an
engine.

### 4. Closed beta scope
**One city (Casablanca) · one section (home maintenance) · ~150 verified
providers · a few thousand users.** If it works, the model is copied to any
city. Narrower than "home services in general."

## Deferred (explicitly NOT now — needs real data first)

- The ~15 additional engines and the full "Knowledge OS."
- Microservices split, GraphQL/gRPC gateway, Neo4j, Elasticsearch.
- Server-side unified `businesses` discovery table — when needed, start with a
  read-only **Adapter** over existing tables, not a migration.
- Trust Engine (multi-signal), Reputation, Semantic search (pgvector),
  Spatial (PostGIS), Temporal knowledge, Provenance, Facts↔Observations split.

**Rationale:** every deferred engine is worthless without behavioral data;
that data comes from the closed beta; the beta needs the Knowledge Foundation
+ production readiness first. The sequence is therefore forced, and building
the engines now would be the over-engineering the dossier itself warns against.

## Parallel track (not blocking, not first)

Production readiness — Sentry DSN, real backups (`pg_dump` → external
storage), image optimization (webp/sharp), health checks, rate limiting.
These do not affect knowledge design and can proceed alongside data work.

## Consequences

- New domains/pages/components are **data**: a Schema/Page/Workflow/Component
  entry — no engine change.
- This ADR is the reference: proposals to add an engine or re-frame as
  "Knowledge OS" are out of scope until the beta produces data justifying them.
- Revisit only when closed-beta data exists (≈500–1000 real journeys).
