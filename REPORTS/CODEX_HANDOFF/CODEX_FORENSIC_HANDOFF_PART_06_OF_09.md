| execution policy outside LivingHome                       | High **PARTIALLY WIRED**                           | Assistant uses it conditionally; fallbacks remain                                                                 |
| provider/integration modules                              | Low/unknown                                        | dynamic route/registry/config and external calls must be checked before dead classification                       |
| test-only architecture references                         | Medium **TEST-ONLY CALLERS**                       | source occurrence can keep features looking connected; mutation demonstrates weakness                             |
| AI/local vs merchant conversation                         | High **DUPLICATE NAME, NOT DUPLICATE DOMAIN**      | never merge/delete based on naming                                                                                |
| URL/store page state                                      | High **DUPLICATE REPRESENTATION**                  | both active and intentionally synchronized; needs invariant, not deletion                                         |
| report inventories/patch artifacts                        | High **REPORT/TRANSFER ONLY**                      | not product runtime; export artifact commit should not define product behavior                                    |
| orphan/dead exports not runtime-proven                    | **UNKNOWN**                                        | static import absence is insufficient due lazy imports, registries and routes; no deletion authorized             |

## 17. Broken chains

\| Chain | Type/status | Current disposition |
\===== END PART 2/3 =====

\===== FILE 1: CODEX\_TO\_CLAUDE\_MASTER\_HANDOFF.md =====
\===== PART 3/3 =====
\|---|---|---|
\| clarification Signals → option adapter → raw/page route, not common Snapshot/Decision | producer → stale adapter → consumer; OPEN | Rewire existing snapshot/policy; browser parity required |
\| IntentSnapshot → LivingHome only | built subsystem → partial callers; OPEN | Do not rebuild snapshot; promote existing contract |
\| execution policy → Assistant conditional map → direct result/option/image | policy → bypass adapter; OPEN | Guard every actionable branch |
\| JourneyHandoff → Auth expected-id vs inline no-id | producer → inconsistent consumers; OPEN | unify identity-aware consumption |
\| JourneyHandoff/URL **`q`** ← legacy publish seed with higher precedence | duplicate producer → stale consumer; OPEN | migrate/clear only with regression proof |
\| conversation text projection → result/node/decision discarded | producer → lossy adapter → consumer; OPEN | product schema decision needed |
\| concept-expanded understanding → Landing raw/coarse query | producer → lossy search adapter; OPEN | typed search contract needed |
\| declared integration → configuration/readiness → no live sandbox call | built subsystem → runtime unreached; BLOCKED | sandbox contract tests, no fabricated success |
\| migration design → fake client → no real PostgreSQL | producer/test → missing runtime consumer; BLOCKED | execute disposable PG workflow |
\| browser workflow → manually seeded handoff → actual Landing producer bypassed | missing producer → consumer; OPEN | replace/add producer-to-consumer acceptance |
\| generated VAPID/audit files → freshness ownership | tooling producer → stale inventory; FIXED/PARTIAL | generator artifacts now distinguished; inventory still not reachability |
\| offline/local business projections → identity logout boundary | state producer → cleanup uncertainty; OPEN | verify browser identity-switch lifecycle |

## 18. Contradictions

| **Claim/appearanceExecutable/measured realityStatus** |                                                                                                 |                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| “one analysis”                                        | NeedFirst evaluates stance twice; Assistant re-understands                                      | OPEN; old raw counts superseded by current exact trace |
| “Decision owns policy”                                | NeedFirst and Assistant still choose business destinations outside it                           | OPEN                                                   |
| “Snapshot is canonical intent”                        | chiefly LivingHome consumes it                                                                  | OPEN                                                   |
| “Auth resumes the same journey”                       | AuthPage improved, inline id race/legacy seed/stale draft remain; E2E blocked                   | PARTIAL                                                |
| “conversation-centered product”                       | AI history is surface adapters/session projection; merchant messages are separate server domain | PARTIAL, naming clarified                              |
| “clarification enriches execution”                    | option adapter can route without shared snapshot/decision                                       | OPEN                                                   |
| “architecture green means invariant holds”            | D/E/I/J mutations remain green                                                                  | FALSE claim / OPEN testing defect                      |
| “server tests prove DB”                               | prior no-DB run skipped 136/412; real acceptance unrun                                          | FALSE claim / BLOCKED DB                               |
| “provider configured means works”                     | live sandbox calls unreached                                                                    | FALSE claim / BLOCKED                                  |
| “page has one truth”                                  | URL and store both write                                                                        | OPEN dual representation                               |
| “logout clears all journey data”                      | legacy publish seed survives                                                                    | FALSE claim / OPEN                                     |
| “public customer no longer leaks”                     | direct PII fixed; existence/id/error leakage remains                                            | PARTIAL                                                |
| “browser acceptance covers auth flow”                 | producer is manually bypassed                                                                   | FALSE claim / OPEN harness                             |
| “all external URLs rejected”                          | backslash relative authority bypass                                                             | FALSE claim / P0 OPEN                                  |

## 19. False, disproved, obsolete and measurement corrections

1. **FALSE:** correction and fill-slot were suspected to contribute unequally in current LivingHome; both currently pass through **`record`**. Reset intentionally does not.
2. **FALSE:** missing Chromium/target is not proof of app failure or success. New preflight correctly labels it environment blocked.
3. **OBSOLETE:** old **`amanzine_need`**, **`amanzine_need_stance`**, and **`amanzine_need_seed`** are no longer active current-source keys. Do not spend time deleting nonexistent runtime uses; the distinct publish seed remains active.
4. **CORRECTED METRIC:** historic “100% concept/decision” referred to fixed small denominators (reported as 43 and 28 cases inside an 80-line local corpus), not product accuracy.
5. **CORRECTED METRIC:** a generated tracked-file inventory invalidated itself when reports/artifacts were added. File-count freshness is not reachability or correctness.
6. **QUALIFIED:** multiple parser functions do not inherently mean multiple independent “brains.” The proven issue is duplicate invocation/composition and divergent consumers.
7. **QUALIFIED:** AI and merchant “Conversation” names do not indicate duplicate implementations; they are different domains.
8. **QUALIFIED:** no static import does not prove a file dead because routes, lazy imports, registries and configuration can load it.
9. **FALSE AS PROOF:** 289-ish/no-DB server passes with 136 skips cannot establish backend DB correctness.
10. **FALSE AS PROOF:** a green manually seeded browser smoke cannot establish Landing/Auth semantic parity.

## 20. Complete BASE..PRODUCT production change ledger

| **Path / important symbolsWhy; old → newTests/evidenceRisk/runtime proof** |                                                                                       |                                |                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------- |
| **`server/.env.example`** / environment names                              | document independent secrets/config; incomplete → expanded                            | static env guard               | APPROVED documentation; no connectivity proof |
| **`server/database.js`** / provider mapper/upsert                          | persist encrypted **`webhook_secret`**; api-key-only schema → separate inbound secret | code/fake paths                | NEEDS real PG                                 |
| **`server/index.js`** / public-customer limiter                            | anonymous write had generic protection → 15/hour route limiter                        | static placement               | proxy/full-app runtime needed                 |
| **`server/middleware/platformAdmin.js`** / **`requirePlatformAdmin`**      | empty allowlist fail-open → deny-default                                              | behavioral + mutation A        | APPROVED locally                              |
| **`server/migrate.js`** / **`runMigrations`**, ledger/version              | swallowed DDL/no lock/ledger → transaction lock, ledger, explicit failure/backfill    | fake atomicity                 | RISKY until PG                                |
| **`server/routes/customers.js`** / public POST                             | full existing record → id only                                                        | stub serialization/static test | PARTIAL; enumeration/error leakage            |
| **`server/routes/providers.js`** / admin middleware                        | local weaker predicate → canonical middleware                                         | static + mutation              | APPROVED                                      |
| **`server/routes/push.js`** / VAPID load/generate                          | private log/default behavior → no direct private log/env preference                   | runtime + mutation C           | other sinks/file permissions                  |
| **`server/routes/settings.js`** / readiness                                | verify token alone could advertise ready → token+secret                               | static                         | provider live blocked                         |
| **`server/routes/webhooks.js`** / Meta/delivery gates                      | missing signing/apiKey reuse → fail-closed HMAC and webhookSecret-only                | HTTP + mutation B              | downstream success/real provider blocked      |
| **`src/components/CreateFlow.tsx`** / auth gate/seed restore               | ad hoc publish seed → also structured handoff and URL q                               | static                         | legacy precedence remains; RISKY              |
| **`src/lib/conversationSession.ts`** / read/write/clear                    | no shared surface persistence → 40-entry session projection                           | unit/static                    | privacy/schema/lifecycle RISKY                |
| **`src/lib/journeyHandoff.ts`** / create/save/peek/consume                 | several raw keys → versioned TTL envelope                                             | unit/mutations/probe           | WRONG due URL bypass and page validation      |
| **`src/pages/AssistantPage.tsx`** / policy map/goTo/persistence            | direct routing/local msgs → partial policy plus shared text                           | static/mutation D              | WRONG; bypasses remain                        |
| **`src/pages/AuthPage.tsx`** / handoff resume                              | reconstruct raw/stance and reload → consume captured structured target                | static/mutation J missed       | NEEDS Chromium; inline differs                |
| **`src/pages/DeliveryPage.tsx`** / secret UI                               | expose/reuse api key → independent generated webhook secret                           | static                         | query leakage, provider blocked               |
| **`src/pages/Landing/sections/NeedFirst.tsx`** / memo/handoff/route        | repeated render analysis/ad hoc keys → memo and structured draft/answers              | call trace/unit                | stale draft/id race/coarse destination        |
| **`src/pages/LivingHome.tsx`** / conversation persistence/reset            | component-only turns → shared projection/reset                                        | static                         | legacy publish writer persists                |
