| F-028                                                                                                                                   | Admin allowlist logging / SECURITY                                 | P2 OPEN **CODE\_READ**           | startup dumps configured emails → operational PII logs.                                                                  | Server startup source inspection. Not repaired.                                                                                                                 |
| F-029                                                                                                                                   | Delivery secret transport/compare / SECURITY                       | P2 OPEN **CODE\_READ**           | query secret + **`!==`** → history/proxy/timing exposure.                                                                | Webhook/UI trace. Needs compatible provider transition, not blind edit.                                                                                         |
| F-030                                                                                                                                   | LivingHome god-surface / ARCHITECTURE                              | P2 OPEN **EXECUTABLE\_PATH**     | UI+conversation+brain+decision+memory+navigation ownership → coupling/bypass.                                            | Fan-out/call trace. Rewire existing layers; do not rewrite.                                                                                                     |
| F-031                                                                                                                                   | Freshness artifact contradiction / TOOLING                         | P3 FIXED **MEASURED**            | generated/self-counted files invalidate inventory → green/red noise.                                                     | PRODUCT freshness handling corrected; still only inventory consistency, not reachability.                                                                       |
| F-032                                                                                                                                   | Correction/fillSlot inequality hypothesis / CONVERSATION\_BOUNDARY | P2 FALSE **EXECUTABLE\_PATH**    | suspected bypass was not current behavior.                                                                               | Current LivingHome routes both through **`record`**; reset intentionally does not. Network payload remains blocked.                                             |
| F-033                                                                                                                                   | Environment failure as app verdict / TOOLING                       | P2 FALSE/FIXED **MEASURED**      | unavailable Chromium/target mislabeled → false product result.                                                           | Preflight now returns ENVIRONMENT\_BLOCKED. This does not prove UI.                                                                                             |
| F-034                                                                                                                                   | Old need/stance/seed keys / LEGACY                                 | P3 OBSOLETE **EXECUTABLE\_PATH** | former multi-key auth adapter.                                                                                           | Whole **`src`** search finds no active **`amanzine_need`**, **`_stance`**, **`_seed`**; **`_publish_seed`** is separately still live under F-007.               |
| F-035                                                                                                                                   | Offline business snapshot across identity / PRIVACY                | P1 OPEN **CODE\_READ**           | persisted business projection is not demonstrably scoped/removed on logout → cross-user stale products/orders/customers. | BASE store/persistence trace; no browser identity-switch reproduction; not fixed.                                                                               |
| F-036                                                                                                                                   | Database TLS trust / SECURITY                                      | P1 OPEN **CODE\_READ**           | remote TLS permits **`rejectUnauthorized:false`** → server identity may not be authenticated.                            | BASE pool configuration; deployment CA policy unverified; not fixed.                                                                                            |
| F-037                                                                                                                                   | Lifecycle invariants application-only / DATABASE                   | P1 OPEN **CODE\_READ**           | order/delivery transitions lack complete DB enforcement → races/direct writes can create invalid states.                 | BASE schema/service comparison; real constraint audit blocked.                                                                                                  |
| F-038                                                                                                                                   | Whole-document JSONB writes / DATABASE                             | P2 OPEN **CODE\_READ**           | unversioned read/modify/write → concurrent settings updates can be lost.                                                 | BASE database helper trace; PostgreSQL concurrency reproduction blocked.                                                                                        |
| F-039                                                                                                                                   | Public customer/tracking exposure / PRIVACY                        | P1 PARTIAL **EXECUTABLE\_PATH**  | public identifier-based surfaces enable abuse/enumeration → customer/shipment disclosure.                                | PRODUCT minimizes customer response/rate-limits one route; tracking and real HTTP/error behavior remain unverified.                                             |

## 4. Root-cause tree

```
```

```
MULTIPLE SEMANTIC DESTINATION OWNERS
├─ NeedResult.page/url and clarification options
├─ executionPolicy / Decision.dest
├─ NeedFirst stance override → publish/market
└─ Assistant direct result/option/image fallbacks
   ├─ same need can route differently by surface/auth entry
   ├─ ability/risk policy can be bypassed
   └─ destination parity remains unprovable

PARTIAL JOURNEY/STATE MIGRATION
├─ JourneyHandoff coexists with legacy publish seed
├─ consumers use different identity/cleanup rules
├─ clearing Landing input does not clear draft
└─ logout omits legacy seed
   ├─ stale or cross-session publish input
   ├─ delayed callback consumes newer journey
   └─ source-of-truth remains plural

SURFACE-LOCAL ORCHESTRATION
├─ NeedFirst composes understanding/need/stance itself
├─ LivingHome owns UI + conversation + brain + policy + memory
└─ Assistant orchestrates then re-understands and adapts result
   ├─ duplicate analysis/telemetry
   ├─ different clarification behavior
   └─ no canonical conversation/decision pipeline

TEXT-ONLY CONVERSATION PERSISTENCE
├─ one session key shared by Home/Assistant
├─ no user scope/TTL/strict schema/size bound
└─ result/node/decision metadata stripped
   ├─ raw PII persists across refresh
   ├─ action cards disappear after remount
   └─ lifecycle product policy is undefined

SOURCE-SHAPE TESTING
├─ token/presence/slice assertions
├─ manually seeded browser smoke
└─ fake-client migration tests
   ├─ policy/auth/logout regressions stay green
   ├─ browser producers are bypassed
   └─ DB claims can exceed evidence

SECURITY TRUST-DOMAIN COLLAPSE (partially repaired)
├─ platform admin fail-open (fixed)
├─ unsigned Meta mutation (fixed at gate)
├─ VAPID private logging (fixed at direct sink)
├─ public customer enumeration (partial)
└─ delivery query secret/timing comparison (open)

ENVIRONMENTAL ACCEPTANCE GAP
├─ no real PostgreSQL
├─ no Chromium/GitHub Actions observation
└─ no external provider sandboxes
   ├─ migration/lock/index behavior blocked
   ├─ auth/conversation/mobile/RTL/network blocked
   └─ integration readiness cannot be claimed

APPLICATION-ONLY DATA INVARIANTS
├─ lifecycle transitions primarily guarded by services
├─ whole JSONB document writes lack optimistic versioning
└─ remote DB TLS trust is deployment-config dependent
   ├─ race/direct-write state violations
   ├─ lost concurrent settings updates
   └─ database endpoint authenticity risk
```

## 5. Source-of-truth map

| **ConceptOwner today; writers/readersStorage/schema/lifetime/cleanupDuplicate/conflictRecommended canonical owner** |                                                               |                                                                                                      |                                                          |                                                                    |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| User                                                                                                                | store/auth responses; login/register/refresh write, app reads | React + **`ai_commerce_user`** localStorage + server cookie; cache has no visible TTL; logout clears | cookie/server truth vs local projection                  | Server auth identity; client store as revocable projection         |
| Auth session                                                                                                        | server auth middleware/routes                                 | HttpOnly cookie/token policy; refresh/expiry/logout                                                  | UI cache can outlive server validity                     | Server session/token only                                          |
| Platform Admin                                                                                                      | **`requirePlatformAdmin`**, configured email allowlist        | environment config; request lifetime                                                                 | tenant **`role=admin`** is distinct                      | Single canonical middleware (current repair direction)             |
| AI conversation                                                                                                     | LivingHome/Assistant writers/readers                          | **`amanzine_conversation_session`**, **`{who,text,at?}[]`**, last 40, no TTL, reset/logout           | surface metadata schemas differ                          | Versioned user-scoped conversation session/domain                  |
| Merchant messages                                                                                                   | messaging routes/services and DB                              | PostgreSQL conversation/message schemas, durable                                                     | same word “conversation,” different domain               | Server messaging domain; never AI sessionStorage                   |
| Current need                                                                                                        | each surface + JourneyHandoff                                 | local React plus 30m session envelope                                                                | legacy publish seed and local variants                   | Journey/snapshot contract created once per user action             |
| Intent                                                                                                              | understanding/need/orchestrator outputs                       | ephemeral objects                                                                                    | action/intent variants across parsers                    | IntentSnapshot field sourced from one understanding result         |
| Stance                                                                                                              | **`stanceOf`**, **`parseNeed`**, surface overrides            | ephemeral/handoff field                                                                              | stance recomputed twice and overridden                   | One snapshot field computed once                                   |
| Understanding                                                                                                       | local **`understand`**, hybrid/remote refinement              | ephemeral; telemetry/memory separately persisted                                                     | surfaces call different combinations                     | Local canonical Understanding; remote fills bounded gaps           |
