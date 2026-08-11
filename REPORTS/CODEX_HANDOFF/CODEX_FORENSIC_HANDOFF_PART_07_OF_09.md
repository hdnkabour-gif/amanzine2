| **`src/store.tsx`** / logout                                               | live store reset only → also clear handoff/conversation                               | static/mutation I missed       | legacy seed remains; browser blocked          |

## 21. Test ledger

Counts below are the last observed evidence from the relevant verification rounds; they are not silently refreshed or combined into a fake total.

| **Suite/commandObserved result/environmentProvesDoes not prove** |                                                                                                                                 |                                                               |                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| **`npm run lint`**                                               | PASS, local Node/TypeScript                                                                                                     | typecheck                                                     | runtime/business behavior                                  |
| **`npm run build`**                                              | PASS with two large-chunk warnings                                                                                              | bundling                                                      | route correctness/performance                              |
| **`npm run test:brain`**                                         | 725/725 PASS in prior focused run                                                                                               | fixed local corpus/unit contracts, including handoff helper   | browser/auth/DB/provider accuracy or real-user denominator |
| **`npm run test:constitution`**                                  | 18/18 PASS prior run                                                                                                            | constitution/source contracts                                 | E2E behavior                                               |
| **`npm run test:knowledge`**                                     | 11/11 PASS prior run                                                                                                            | fixed knowledge guards                                        | live learning/data quality                                 |
| architecture focused                                             | 72/72 PASS during mutations                                                                                                     | source invariants it actually scans                           | D/E/I/J behavior; all four defects escaped                 |
| broader architecture prior baseline                              | 150/152, 2 freshness/tooling failures before repair                                                                             | many structural/source checks                                 | runtime reachability                                       |
| focused security/customer/webhook/env/migration                  | 17/17 PASS, local                                                                                                               | admin/Meta rejection, static privacy/env/door, fake migration | real DB and successful mutation side effects               |
| VAPID first-start                                                | 1/1 PASS, local no-DB                                                                                                           | log/warn direct private disclosure absent                     | error/logger/file sinks; push delivery                     |
| full server prior no-DB                                          | 412 total: 276 pass, 136 skip, 0 fail (earlier recorded run); later summaries reported 289 pass after additions, still 136 skip | DB-independent route/service behavior                         | anything skipped/real PostgreSQL                           |
| **`ci-postgres-acceptance`**                                     | NOT RUN, no PostgreSQL                                                                                                          | designed acceptance only                                      | all claimed DB proof                                       |
| **`ci-acceptance`**/browser probes                               | BLOCKED, no Chromium/target                                                                                                     | missing-env fail-closed behavior                              | UI/auth/conversation/RTL/network                           |
| external integration sandbox                                     | NOT RUN                                                                                                                         | nothing live                                                  | all provider success paths                                 |

Do not sum runs with different revisions into a headline “total passed.” Corpus, revision and environment differ.

## 22. Mutation/sabotage ledger

All mutations were made in disposable worktrees or restored immediately; clean diff/tree comparison established no sabotage remained.

| **IDSabotageExpected guardActual outcomeRestored** |                                                         |                            |                                        |     |
| -------------------------------------------------- | ------------------------------------------------------- | -------------------------- | -------------------------------------- | --- |
| A                                                  | empty admin allowlist returns allow                     | security boundary          | failed **`true !== false`** — detected | yes |
| B                                                  | unsigned Meta request returns 200                       | webhook security           | expected 401, got 200 — detected       | yes |
| C                                                  | restore VAPID private console log                       | runtime + static log guard | both failed — detected                 | yes |
| D                                                  | disable Assistant policy selection while leaving tokens | architecture policy guard  | 72/72 stayed green — missed            | yes |
| E                                                  | add publish-seed writer outside narrow scanned slice    | legacy writer guard        | 72/72 stayed green — missed            | yes |
| F                                                  | allow ordinary external handoff URL                     | journey helper unit        | targeted assertion failed — detected   | yes |
| G                                                  | accept expired handoff                                  | journey helper unit        | expiry assertion failed — detected     | yes |
| H                                                  | old callback ignores expected id                        | journey helper unit        | identity assertion failed — detected   | yes |
| I                                                  | remove conversation clear from logout                   | architecture/logout guard  | 72/72 stayed green — missed            | yes |
| J                                                  | recompute destination inside Auth                       | architecture/auth guard    | 72/72 stayed green — missed            | yes |

**Not executed as live destructive mutations:** real PostgreSQL production-migration DDL failure/concurrency; actual browser malicious URL navigation; provider sandbox signature/delivery side effects; external AI payload leakage. These remain BLOCKED rather than inferred successful.

## 23. BLOCKED / NOT VERIFIED

| **ItemWhy blockedRequired evidence** |                                                       |                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Real PostgreSQL                      | no server/**`DATABASE_URL`** in execution environment | disposable clean DB, migration twice, production failure rollback, constraints/indexes, concurrent processes, zero unjustified DB skips |
| Chromium/GitHub Actions              | browser binary/runner not executed here               | actual workflow logs/artifacts and deterministic target assertions                                                                      |
| Auth E2E                             | browser absent; current harness bypasses producer     | same need through inline/top-login/authenticated/register; compare snapshot/destination/storage                                         |
| Conversation E2E                     | browser/network absent                                | 3+ turns, navigation, refresh, reset, logout/relogin, request-body inspection                                                           |
| Destination runtime                  | no instrumentation/complete journeys                  | record semantic producer and final router action per surface/verdict                                                                    |
| Network payload                      | current harness records responses only                | redacted request bodies, recentMessages order/no duplication/stale isolation                                                            |
| Mobile/RTL/touch/keyboard            | no Chromium                                           | 360/390/412/768/1024/1280 computed direction, overflow, hit testing, focus/safe-area evidence                                           |
| Search relevance                     | no integrated corpus/runtime results                  | semantic query→server matcher/ranking→visible relevance, including false-positive analysis                                              |
| External providers                   | no sandbox credentials; production forbidden          | official sandbox contract/error/fallback tests for each provider                                                                        |
| Production deployment                | intentionally untouched                               | separate operational acceptance/change review                                                                                           |

## 24. Exact next steps for Claude Code

1. Read this handoff and the JSON companion; do **not** begin another repository-wide audit.
2. Verify the highest-risk claims against the current working tree: F-004, F-005, F-007, F-008, F-012/F-013, F-015/F-016 and F-018.
3. Do not rebuild Understanding, IntentSnapshot, ability catalog, execution policy, router, messaging, or provider adapters. They exist; the task is to rewire/guard/complete them.
4. First create behavioral regressions that fail for the measured URL bypass, inline expected-id race, stale/legacy publish state, Assistant bypass and logout/auth mutations.
5. Keep fixes small and measurable. Do not mix security, state migration and browser harness redesign into one unreviewable change.
6. Use a disposable real PostgreSQL database; run migration twice, inject a production-path failure safely, check the full schema/ledger/lock behavior, and explain every remaining skip.
7. Use real Chromium. Replace/add producer-to-consumer journeys rather than manual session seeding. Capture redacted request bodies and verify final paths, computed RTL and state lifecycle.
8. Exercise external providers only with official sandbox credentials; otherwise retain **`BLOCKED/NOT_LIVE_VERIFIED`**.
9. Preserve separation between AI conversation and merchant/customer messaging.
10. Do not delete legacy/dead candidates until runtime reachability and data migration prove safe removal.
11. Re-run mutations D/E/I/J after behavioral guards are added; each guard must fail under sabotage.
12. No merge to **`main`** and no deployment until PostgreSQL + Chromium acceptance is executed, artifacts independently reviewed, and P0/P1 failures resolved.

## 25. Final index

### By priority

- **P0:** F-001 FIXED, F-002 FIXED\_PARTIAL, F-003 FIXED\_PARTIAL, **F-004 OPEN**.
- **P1:** F-005–F-009, F-011–F-016, F-018, F-021. Core blockers are handoff identity/state, policy/destination, conversation privacy, public enumeration, migration/DB and truthful browser acceptance.
- **P1 (continued):** F-035–F-037 and F-039 cover offline identity scoping, DB TLS, lifecycle constraints and public tracking/customer exposure.
- **P2:** F-010, F-017, F-019–F-020, F-022–F-026, F-028–F-030, F-032–F-033, F-038.
- **P3:** F-027 performance observation, F-031 fixed tooling inventory, F-034 obsolete legacy need keys.

### By status

- **OPEN:** F-004, F-006–F-010, F-012, F-018, F-020, F-022–F-024, F-026–F-030, F-035–F-038.
- **FIXED:** F-001, F-003 direct sink, F-031, F-033 classification behavior, F-034 removal of old need keys.
- **PARTIAL:** F-002, F-005, F-009, F-011, F-013–F-015, F-017, F-021, F-024, F-039.
- **BLOCKED:** F-016, F-019, F-025 plus all items in §23.
- **FALSE/DISPROVED:** F-032 and the proof/metric claims in §19.
- **OBSOLETE:** F-034 old need/stance/need-seed runtime keys; historical raw analysis counts superseded by §10.

### Top root causes

1. Multiple semantic destination owners.
