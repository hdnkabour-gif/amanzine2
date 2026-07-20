# ADR-0003 — Everything is Explainable

- **Status:** Accepted
- **Date:** 2026-07-18
- **Builds on:** ADR-0001 (Knowledge Foundation) · ADR-0002 (Constitution)

## Context

ADR-0002 Law #2 says everything new is *Registered → Understood → Related →
Usable*. Reviewers (and the owner) pushed this further: the deepest guarantee
of a system that grows for years without collapsing is not Redis, not a graph
DB, not autonomous learning — it is that **every entity can explain itself**.

We reject the phrasing "the app knows itself" (it implies consciousness). The
correct, buildable phrasing is: **the app can *explain* itself** — every
decision, page, button, service, capability is *explicable*.

## Decision — one law

> **Anything that enters AMANZINE must be explainable by the brain.**
> Before an entity is "part of the system," it can answer four questions:
> **What am I? · Why do I exist? · What do I depend on? · Who depends on me?**
> If it cannot, it is not mature yet — it does not enter.

### Implementation — an Interface, not an Engine

No new engine, no new registry, no migration (respects the Freeze). A single
adapter over the existing registries: `describe(type, id) → Describable`

```ts
interface Describable {
  id; type; label;
  purpose;             // why it exists
  relations;           // what it depends on (outgoing)
  capabilities;
  usedBy;              // who depends on it (incoming)
  impactOfDeletion;
  metadata;
}
```

`src/lib/akg/describe.ts` computes this for services, modules, pages, entities,
professions, problems, and capabilities — from the registries only (Law #2).
Control Center's **Explain** tab consumes it; Living Graph / search will reuse
the *same* lens later. Adopted incrementally: start with the entities Control
Center already touches; add the rest (button, error, permission, language,
theme, API) when a real consumer needs them — never a big-bang retrofit.

## The four-sentence gate (process, not code)

No feature enters the project unless it can be described in four sentences:
**What is it? Why does it exist? What does it depend on? What depends on it?**
If you can't answer, it hasn't matured. This gate keeps the project clean more
reliably than any framework.

## Vocabulary — Knowledge → Memory → Experience → Wisdom

Refines ADR-0002's "learning is memory, not self-modification":

- **Knowledge** — facts (plumber, leaks, cities, problems). Curated.
- **Memory** — what happened (user A searched "…"). Recorded, never mutates truth.
- **Experience** — inferences ("80% who wrote كيهرب wanted a plumber"). Observed.
- **Wisdom** — policies ("if you see كيهرب, ask one question before suggesting an
  electrician"). These are **approved Policies** (the existing Policies engine) —
  reached only through the human gate (ADR-0002 Law #3), never autonomously.

## Deferred (unchanged from ADR-0001/0002)

Embeddings · Graph DB · LLM memory · autonomous learning · advanced semantic
search · multimodal perception · Redis · full event sourcing — all wait for
real beta data.

## Consequences

- New entity types add a `describe()` case — not new architecture.
- "Orphan" (usedBy = ∅) is not an error; it is a question the Explain tab surfaces.
- The Constitution now has three laws documents: ADR-0001 (foundation),
  ADR-0002 (architecture), ADR-0003 (explainability).
