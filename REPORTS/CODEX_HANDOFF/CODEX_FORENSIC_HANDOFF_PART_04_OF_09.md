| Signals/facts                                                                                                       | readers/resolvers, clarification mutators                     | ephemeral objects; some memory/local/server facts                                                    | multiple schemas/lifetimes                               | Snapshot-owned normalized signals with provenance                  |
| Clarification                                                                                                       | need result/options, Home signals/snapshot                    | local UI and handoff **`answers`**                                                                   | option routing can bypass decision; Landing/Home differ  | Snapshot transition reducer, then rerun policy                     |
| IntentSnapshot                                                                                                      | primarily LivingHome                                          | in-memory object                                                                                     | absent from Landing/Assistant                            | Existing IntentSnapshot, promoted—not replaced                     |
| Decision                                                                                                            | **`abilityFor`**, execution/interface policy                  | ephemeral decision with verdict/dest                                                                 | NeedResult/surface fallback competes                     | Existing execution/interface decision pair                         |
| Ability                                                                                                             | ability catalog/**`abilityFor`**                              | code registry                                                                                        | declaration does not prove UI/server reachability        | Existing catalog plus executable adapters/tests                    |
| Destination                                                                                                         | NeedResult, policy, surface overrides                         | object/page/url/JourneyHandoff                                                                       | at least three semantic owners                           | **`Decision.dest`**; router executes without reinterpretation      |
| Current page                                                                                                        | store **`page`**, URL RouterSync                              | React + URL                                                                                          | bidirectional writers/public-route exceptions            | URL/router for mechanics; Decision for business target             |
| Search query                                                                                                        | Landing/orchestrator/Marketplace                              | URL **`q`**/city + React/API payload                                                                 | raw/coarse vs concept-expanded                           | Typed search request derived from snapshot                         |
| Publish state                                                                                                       | CreateFlow/NeedFirst/LivingHome                               | React, URL **`q`**, JourneyHandoff, legacy session seed                                              | multiple schemas; legacy overrides                       | JourneyHandoff → CreateFlow typed seed; remove only after proof    |
| Product/order/customer/shipment                                                                                     | server DB/services, store projections                         | PostgreSQL canonical + React/offline projections                                                     | offline cache/identity lifetime needs runtime audit      | Server domain records/state machines                               |
| Language                                                                                                            | store/UI/normalizer                                           | React/local preferences/document dir                                                                 | locale, text direction and detected language can diverge | User preference + per-message detected language                    |
| User graph/memory                                                                                                   | memory helpers/server sync/local storage                      | localStorage and server mechanisms                                                                   | person/session/world facts overlap                       | User-scoped server memory with provenance and explicit local cache |

The offline business projection deserves separate attention: logout resets the live arrays, but earlier code-read evidence did not establish deletion or user scoping of every persisted commerce backup. This remains **CODE\_READ/OPEN**, not a confirmed cross-account runtime leak.

## 6. Current call graph and surface wiring

### Intended reusable path already present

\===== END PART 1/3 =====

\===== FILE 1: CODEX\_TO\_CLAUDE\_MASTER\_HANDOFF.md =====
\===== PART 2/3 =====

```
```

```
USER TEXT
→ normalization / Arabizi / concepts
→ understand / facts / signals
→ parseNeed / intent / stance
→ clarification transition
→ IntentSnapshot
→ abilityFor
→ executionPolicy
→ interfaceDecision
→ Decision.dest
→ Router mechanics
→ conversation/surface + memory/telemetry
```

### Actual surfaces

| **SurfaceActual pathClassification** |                                                                                                                                                       |                                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Landing/NeedFirst                    | memo **`understand`** + **`parseNeed`** + explicit **`stanceOf`**; scoring/trace; clarification option or coarse stance override; handoff/auth/router | **PARTIALLY WIRED / BYPASSED.** Does not consistently construct snapshot/ability/decision; stance is computed internally twice. |
| LivingHome                           | understanding/context/signals → ability/execution/interface decision → snapshot/turn record → surface/router                                          | **CLOSEST TO CANONICAL**, but ordering/coupling is surface-owned and it still writes legacy publish seed.                       |
| Assistant                            | orchestrate result, additional understand, partial policy lookup, then decision or result/option/image fallback                                       | **PARTIALLY WIRED / BYPASSABLE.**                                                                                               |
| Auth                                 | peek handoff id → login/register → consume same id → execute stored target                                                                            | **ROUTER/AUTH MECHANICS** in current path, but inline threshold differs and no behavioral regression guard exists.              |
| Publish/CreateFlow                   | initialize from legacy seed first, URL **`q`**, or handoff; edit/submit workspace                                                                     | **STALE ADAPTER.** Multiple producers and precedence rules.                                                                     |
| Marketplace                          | consumes URL/search state and server results                                                                                                          | **PARTIAL.** Receives different query richness depending producer.                                                              |

## 7. Destination ownership before and after repair

**Before PRODUCT (EXECUTABLE\_PATH):** Landing NeedResult/stance routes, LivingHome policy/decision, Assistant result routing, Auth reconstruction/session keys, CreateFlow/publish seed, and ordinary router mechanics all participated. Not every **`navigate`** was a semantic owner.

**After PRODUCT:** AuthPage improved to execute a captured target instead of reinterpreting it. JourneyHandoff gives target transport a typed envelope. However semantic ownership is still **NOT UNIFIED**:

1. **`NeedResult.page/url`** and clarification destinations.
2. **`Decision.dest`** from ability/execution/interface policy.
3. surface adapters: NeedFirst offer→publish / non-offer→URL-or-market, Assistant result/option/image fallbacks.
4. CreateFlow may explicitly construct publish target at the auth boundary.

**`navigate`**, **`setPage`**, URL synchronization, back/tabs/modal close, admin links and public share links are mechanics/user navigation and excluded from the semantic-owner count. Runtime parity for inline login, top login, authenticated and registration flows is **BLOCKED**.

## 8. Conversation systems and lifetime

### AI/Need conversation

- Landing has need/clarification UI state, not a durable transcript.
- LivingHome owns **`turns`**, signals, snapshot and record transitions.
- Assistant owns **`msgs`** and orchestration results.
- PRODUCT added a shared sessionStorage projection limited to the latest 40 entries. Read validation accepts an array of objects with valid **`who`** and string **`text`**; it does not strictly validate timestamps, text size, user identity, schema version or TTL. Corrupt JSON yields an empty conversation but is not removed.
- Only text/who/time-like projection persists; **`NeedResult`**, node, policy decision and action-card metadata do not.
- It survives same-tab navigation and refresh. Browser session restore after tab/browser closure is implementation-dependent and not a promised policy. It is cleared by LivingHome “من جديد” and current logout; Assistant has no equivalent reset surface. Mutation I proved the logout guard does not detect removal.
- Raw text may contain PII, credentials or private circumstances. sessionStorage reduces cross-tab duration but is still script-readable and survives refresh. Claude must obtain/define the intended privacy/retention policy before expanding persistence.

### Merchant↔customer conversation

This is a distinct server/API/PostgreSQL messaging domain with roles, message records, notifications and provider integration. It survives logout on the server (access ends; data does not vanish). Do not merge it with AI **`recentMessages`** or sessionStorage.

### `recentMessages`

Local/hybrid AI calls select recent AI turns. Static traces indicate intended oldest→newest context, but real browser request bodies were not captured. Current acceptance logging records response method/path/status, not request payloads. Ordering, duplication of the current user message, clarification/correction inclusion, and merchant-message isolation remain **BLOCKED**.

## 9. Authentication handoff: before, repair, residual defects

### Before

Landing/Auth/CreateFlow used separate raw need, stance, need seed and publish seed keys plus closure state/full reload. Different auth entry paths could reconstruct different subsets and lifetimes.

### PRODUCT JourneyHandoff

- Storage key: **`amanzine_journey_handoff`**; schema version 1.
- Fields include unique id, raw text, stance, destination, timestamp and optional clarification answers.
- TTL: 30 minutes; future timestamps beyond allowed skew are rejected.
- Corrupt/expired entries are removed; consume deletes only a valid matching envelope.
- AuthPage captures **`handoff.id`** before async auth and consumes with that expected id.
- ordinary **`https:`**, protocol-relative **`//`**, and **`javascript:`** targets are rejected.

### Residual defects/edge cases

- **MEASURED P0:** **`/\\evil.example`** passes the regex and resolves cross-origin.
- Page validation accepts any syntactically matching slug, not the application page registry.
- NeedFirst inline threshold calls consume without expected id.
- clearing input does not clear its previously written draft.
- “من جديد” clears conversation but not a pending handoff.
- **`amanzine_publish_seed`** remains active, has no TTL, can override newer **`q`**, and survives logout.
- Unit mutations proved ordinary external URL, expiry and expected-id helper behavior. They do not prove all consumers.
- Full Landing inline/top-login/authenticated/register/clarification journeys are **BLOCKED on Chromium**.

## 10. Understanding/NLP findings

Important layers include normalization/Arabizi handling, concept resolution, **`understand`**, fact/signal readers, **`parseNeed`**, **`stanceOf`**, clarification, hybrid/remote refinement and **`orchestrate`**.

**Definitions:** multiple functions are not automatically “multiple brains.” The verified defect is action-level repeated semantic evaluation and surface-level divergent composition:

- NeedFirst per qualifying text value: **`understand`** once, **`parseNeed`** once, explicit **`stanceOf`** once; **`parseNeed`** itself invokes **`stanceOf`**, so stance is evaluated at least twice. The PRODUCT memo avoids extra recomputation in unchanged Continue and reuses understanding for mirrors/trace, improving but not achieving one semantic analysis.
- An alternate query recomputes the composition.
