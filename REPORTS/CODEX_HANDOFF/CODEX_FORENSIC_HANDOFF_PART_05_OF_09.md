- Clarification option reuses current objects but follows option destination rather than a common snapshot/decision transition.
- Assistant orchestrates then invokes **`understand`** again for policy.
- LivingHome has the broadest canonical sequence.

**Disproved/qualified:** earlier raw count claims of “2 understand + 2 parse per render” were implementation/version-specific and partially obsolete after memoization. The current precise count above replaces them. Agreement between local semantic outputs does not prove the handoff/navigation contract; wiring and state lifetime, not merely understanding accuracy, are the dominant observed root causes. No live provider comparison was reached.

## 11. Assistant policy status

Before PRODUCT, Assistant directly routed orchestrator results and its remote-AI fallback could force find-pro/market-like results without ability/risk policy.

PRODUCT added an **`understand`**→**`abilityFor`**→execution/interface decision map for result navigation and blocks **`ask`**, **`confirm`**, and **`refuse`** in the main result handler. This is a real partial rewire.

It is not complete:

- **`soon`** and **`explain`** fall through to routing.
- options route directly.
- image result paths do not receive the same decision.
- absence of a policy falls back to **`NeedResult.page/url`**.
- persisted restore strips result/decision metadata.
- mutation D disabled actual policy selection while leaving source tokens, and all 72 architecture checks stayed green.

Therefore Assistant parity is **OPEN/WRONG statically** and runtime states ask/confirm/execute/refuse/soon remain **UNREACHED/BLOCKED** in Chromium.

## 12. Security ledger

| **AreaBefore/riskPRODUCT changeEvidenceRemaining blocker/risk** |                                                                                   |                                                                 |                                                         |                                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Platform admin                                                  | empty allowlist fail-open and provider-local weaker helper                        | deny-default canonical email middleware                         | **MEASURED:** mutation A detected; unit behavior passes | startup logs allowlist emails; continue route-wide canonical use                 |
| Meta webhook                                                    | missing/default secret/signature could admit mutation                             | app secret required; HMAC verified before handler               | **MEASURED:** HTTP rejection and mutation B             | successful DB/message/AI path, raw-body deployment, async handler reliability    |
| VAPID                                                           | generated private key logged                                                      | private material removed from direct logs; env values preferred | **MEASURED:** first-start test and mutation C           | console.error/logger/file sinks; plaintext file permissions; actual push blocked |
| Public customer                                                 | existing full PII returned                                                        | response reduced to id; 15/hour limiter                         | **MEASURED:** stub serialization; placement static      | **`isNew`**/stable id enumeration; raw 500 message; proxy/rate semantics         |
| Public tracking                                                 | identifier-based public status surface can expose lifecycle/customer correlations | no complete repair in this series                               | **EXECUTABLE\_PATH**                                    | enumerate/error/authorization behavior needs E2E                                 |
| JWT/cookies                                                     | server auth middleware + client cache                                             | no broad auth redesign                                          | **CODE\_READ**                                          | expiry/refresh/logout E2E and cookie flags in deployed environment               |
| CORS/readiness                                                  | hostile origin/readiness behavior previously focused-tested                       | no new handoff change beyond recorded server hardening          | **MEASURED in prior focused probes**, not production    | deployment origin/env matrix                                                     |
| Delivery secret                                                 | inbound trust reused outbound API key                                             | independent encrypted webhook secret                            | **EXECUTABLE\_PATH**                                    | real PG/provider, query exposure, **`!==`** compare                              |
| Env config                                                      | incomplete/unsafe examples could create false readiness                           | expanded **`.env.example`**; WhatsApp requires both secrets     | **STATIC**                                              | configuration does not establish connectivity                                    |
| Secrets/logging                                                 | integration settings spread across env/provider records                           | no universal secret manager introduced                          | **CODE\_READ**                                          | no environment dump audit across external infrastructure                         |
| Database TLS                                                    | remote DB trust may use **`rejectUnauthorized:false`**                            | unchanged                                                       | **CODE\_READ**                                          | define CA/production trust policy before deployment                              |

## 13. Database and migrations — evidence separation

### Statically/executable-path verified

- **`BEGIN`** precedes the migration body; **`pg_advisory_xact_lock`** is transaction-scoped.
- schema ledger is created in the transaction; the PRODUCT version is inserted before COMMIT but rolls back with failure.
- per-statement **`.catch(() => {})`** masking was removed.
- catch attempts ROLLBACK and preserves the original migration error even if rollback fails.
- **`webhook_secret`** is added; one-time legacy backfill copies encrypted **`api_key`** ciphertext only when the version ledger is absent.
- clearing **`webhook_secret`** after ledger creation will not trigger that backfill again.
- runtime delivery webhook reads only **`webhookSecret`**, not **`apiKey`** fallback.
- many order/delivery lifecycle invariants remain application-enforced rather than fully constrained in DDL; whole-document JSONB settings writes have lost-update risk.

### Fake-client verified

**`migrate-atomicity.test.js`** validates query order, rollback call, version insertion and original-error preservation against an injected client. It does **not** prove PostgreSQL DDL semantics, locks, constraints, indexes or production failure rollback.

### Designed for real PostgreSQL, not executed

**`ci-postgres-acceptance.js`** is non-vacuous when **`CI_ACCEPTANCE=1`**/**`DATABASE_URL`** exist and is designed to run clean migration twice, inspect sampled FK/unique/indexes, exercise generic transactional DDL rollback, observe advisory lock waiting via **`pg_stat_activity`**, run two migration processes, and verify legacy webhook backfill/clear behavior. Limits: schema inspection is sampled; generic rollback is not an injected failure inside production migration; full server tests share one DB with default concurrency and may interfere; skip grep is TAP-format coupled.

### BLOCKED

No real PostgreSQL server or **`DATABASE_URL`** was available. Consequently **zero claims in this handoff are labeled VERIFIED WITH REAL POSTGRESQL**. Migration idempotency, advisory lock behavior, constraint/index correctness, race behavior, and all DB-dependent server tests remain BLOCKED.

## 14. Browser, mobile, RTL and tooling

| **ToolPurpose/repairTrust status** |                                                                                            |                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`probe-runtime.mjs`**            | browser/target discovery and explicit **`ENVIRONMENT_BLOCKED`**/invalid exits              | Useful; missing-env behavior verified, not UI behavior                                                                                              |
| **`screens`**                      | viewport screenshots and preflight                                                         | Browser blocked; screenshots are evidence only                                                                                                      |
| **`walk`**                         | route/surface walking                                                                      | Browser blocked; reachability assertions limited                                                                                                    |
| **`journey`**                      | scripted user journey                                                                      | Browser blocked; must verify target branches, not step completion text                                                                              |
| **`pipeline`**                     | cross-layer probe                                                                          | Browser blocked; response/request semantics must be inspected                                                                                       |
| **`film`**                         | visual recording                                                                           | Primarily descriptive, not a behavioral assertion                                                                                                   |
| **`gate`**                         | launch/readiness guard                                                                     | Improved fail-closed preflight; does not establish business flow                                                                                    |
| **`ci-acceptance.mjs`**            | widths 360/390/412/768/1024/1280, computed RTL, overflow and **`elementFromPoint`** checks | Materially incomplete: manually seeds handoff, registers via API, omits Home/Assistant/clarify/confirm, request bodies and canonical producer paths |

The acceptance scene loop does not always assert the final pathname, may set splash state after navigation without reload, and its control heuristic does not exclude opacity-zero, pointer-events-none or disabled controls. No actual Chromium run occurred, so RTL, touch targets, keyboard focus, overlays, safe areas, scrolling, mobile layouts, screenshots or film are **BLOCKED**, not passed.

## 15. Search and Marketplace

- **EXECUTABLE\_PATH:** concept/synonym expansion helpers and orchestrator/search request construction exist.
- **PARTIAL:** Landing direct routing still uses raw/coarse **`q`** and city in paths where orchestrator can produce richer expansion; NeedFirst also overrides non-offers to URL-or-market and can ignore authored **`NeedResult.page`**.
- **NOT FIXED:** no single typed search request is consumed by all surfaces.
- **BLOCKED:** relevance for Arabic/Darija/Arabizi/French-mixed corpus, ranking, false-positive “success,” location handling and server matcher payloads were not verified in browser+server runtime. Do not infer correctness from nonzero result count.

## 16. Dead, legacy, duplicate and reachability candidates

These are classifications, **not deletion instructions**.

| **CandidateConfidence/statusEvidence and caution**        |                                                    |                                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **`amanzine_need`**, **`_need_stance`**, **`_need_seed`** | High **OBSOLETE in current ****`src`**** runtime** | whole-source search finds no active runtime writers/readers after PRODUCT; historical docs/tests may mention them |
| **`amanzine_publish_seed`**                               | High **ACTIVE LEGACY**, not dead                   | LivingHome writes; CreateFlow reads/removes before newer input; logout omits it                                   |
| IntentSnapshot outside LivingHome                         | High **ACTIVE\_BUT\_BYPASSED**                     | layer has a live Home consumer; Landing/Assistant absence does not make it dead                                   |
