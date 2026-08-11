
MASTER\_BYTES: 60019
MASTER\_LINES: 595
MASTER\_SHA256: c995e336a021ab540aacaaac95c12025621d4e1d2babc1a146bfcb4647518cd2

FINDINGS\_BYTES: 25524
FINDINGS\_LINES: 890
FINDINGS\_SHA256: b71d33faa794d83d171c047b0eb2c8444282de2ccf873d4ddf65bc4443bf196a

\===== FILE 1: CODEX\_TO\_CLAUDE\_MASTER\_HANDOFF.md =====
\===== PART 1/3 =====

# AMANZINE — CODEX TO CLAUDE CODE MASTER ENGINEERING HANDOFF

> **Purpose:** self-contained forensic dossier for the next engineer. This is not a README, desired architecture, or release approval. Claims below were re-derived from the executable tree, diffs, focused runtime tests, and controlled mutations. Earlier reports are historical leads only where explicitly identified.

## 0. Evidence contract

| **LabelMeaning in this dossier** |                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| **MEASURED**                     | Observed by a command, behavioral probe, serialized response, tree comparison, or mutation. |
| **EXECUTABLE\_PATH**             | Established from a reachable code path and its callers/consumers.                           |
| **CODE\_READ**                   | Source inspection only; no runtime claim.                                                   |
| **INFERRED**                     | Strong conclusion from multiple sources, awaiting runtime confirmation.                     |
| **BLOCKED**                      | Required environment/service was unavailable; never means pass.                             |
| **UNREACHED**                    | Runtime existed but the target state/branch was not reached.                                |
| **FALSE**                        | A hypothesis was tested and disproved.                                                      |
| **OBSOLETE**                     | Historically relevant but no longer active in current runtime source.                       |

Every ledger item includes evidence, paths/symbols, change boundary, test strength, and remaining risk. **`REPORTS/CODEX_TO_CLAUDE_FINDINGS.json`** is the machine-readable source for filtering the same findings.

## 1. Version identity and custody

| **NameSHA / treeRelationshipCurrent custody** |                                                |                                                                                                                                                                |                                                                |
| --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| BASE                                          | **`b8faab2c50ca222843452408659ae6af2bffea5f`** | Original repair-series base; Git object exists locally.                                                                                                        | Historical main baseline.                                      |
| PRODUCT REPAIR                                | **`ad6790761e68fff5d059c8f561fd8d3474bfbc40`** | Requested **`BASE..PRODUCT`**; original object no longer exists after squash. Export reconstructs product tree **`2cea81f704b7af03de7cfa5ac3c05d9340b28f0c`**. | Encoded by transfer patch and squashed current tree.           |
| ACCEPTANCE                                    | **`3848a7c3e76cc89656a26fa0b296f7b59cc6e210`** | Requested **`PRODUCT..ACCEPTANCE`**; original object absent. Export reconstructs expected tree **`5e65db38b4ec69bddfb9a536d1ce8f68d719ebdc`**.                 | Encoded by transfer patch and squashed current tree.           |
| LOCAL HEAD at handoff start                   | **`1e348bf`**                                  | Squashed implementation/acceptance at **`21f0917`**, followed by final hostile review.                                                                         | Branch **`work`**; this handoff will be the next local commit. |

**MEASURED — reconstruction:** two fresh BASE worktrees independently applied (a) the full format-patch and (b) PRODUCT then ACCEPTANCE. Both produced tree **`5e65db38b4ec69bddfb9a536d1ce8f68d719ebdc`**. The split intermediate tree was **`2cea81f704b7af03de7cfa5ac3c05d9340b28f0c`**. Recreated commit IDs differed, so tree SHAs—not commit IDs—were compared.

**Repository/remote truth:** this clone has **no configured Git remote** (**`git remote -v`** is empty). Therefore Codex cannot independently claim what GitHub currently contains. User-supplied evidence says GitHub **`main`** remained at BASE and no **`codex/*`** branch existed; treat that as external custody information, not locally measured fact. Nothing in this session was merged to **`main`**, pushed, deployed, or proven present in production. The working branch is local **`work`**.

## 2. What AMANZINE actually is in code

| **SubsystemActual implementation and evidence** |                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                                        | **EXECUTABLE\_PATH.** React/TypeScript/Vite SPA. A central store holds authenticated user and business projections; **`App`**/router synchronize URL and a page enum. Large workspace pages and conversation surfaces own substantial local orchestration.                                                 |
| Backend                                         | **EXECUTABLE\_PATH.** Node/Express API with route modules, middleware, service/provider adapters, webhooks, uploads, push, auth, marketplace, orders, customers, delivery, settings, admin and health/readiness endpoints.                                                                                 |
| Database                                        | **CODE\_READ/BLOCKED.** PostgreSQL accessed through **`server/database.js`**; a monolithic bootstrap migration creates/evolves tables for users, stores, products, orders, customers, conversations/messages, delivery/providers, notifications and other domains. Real DB behavior was not executed here. |
| Understanding/NLP                               | **EXECUTABLE\_PATH.** Local normalization/understanding, **`parseNeed`**, **`stanceOf`**, fact/signal/concept resolution, clarification, hybrid/external refinement, and orchestrator paths coexist. They are composed differently by each surface.                                                        |
| Need/Intent                                     | **EXECUTABLE\_PATH.** Need results include action/intent, page/URL, questions/options and semantic data. **`IntentSnapshot`** exists, but LivingHome is its primary surface consumer; Landing and Assistant do not consistently consume it.                                                                |
| Decision/Ability                                | **EXECUTABLE\_PATH.** Ability catalog, **`abilityFor`**, execution policy and interface decision can yield ask/confirm/execute/explain/refuse/soon and destination. Only part of the UI consistently honors it.                                                                                            |
| Conversation                                    | **EXECUTABLE\_PATH.** There are two different domains: AI/need turns (**`turns`**/**`msgs`**, now projected to sessionStorage) and merchant↔customer conversations/messages persisted through API/PostgreSQL. They must not be merged.                                                                     |
| Marketplace/search                              | **EXECUTABLE\_PATH.** Surface/orchestrator creates query/city/concept expansions, API/server matcher/ranking returns listings. Some paths send expanded concepts; Landing still has coarse/raw query routing. Relevance E2E remains unverified.                                                            |
| Publish/products                                | **EXECUTABLE\_PATH.** CreateFlow/workspaces build and submit product/listing data, media and storefront data. Publish input can arrive via URL **`q`**, JourneyHandoff, or still-live legacy session seed.                                                                                                 |
| Auth                                            | **EXECUTABLE\_PATH.** Login/register/Google/OTP-like UI and server session/token mechanisms. AuthPage now resumes a structured handoff by id; inline threshold uses a different consume path.                                                                                                              |
| Orders/customers                                | **EXECUTABLE\_PATH.** Server-backed CRUD/lifecycle pages and APIs; public customer creation remains anonymous/rate-limited and has residual enumeration risk.                                                                                                                                              |
| Messaging                                       | **EXECUTABLE\_PATH.** Merchant/customer messages are server conversations with notifications/provider handling. This is separate from AI understanding context.                                                                                                                                            |
| Delivery                                        | **EXECUTABLE\_PATH/BLOCKED.** Provider configuration, shipment/tracking routes and inbound webhook exist. Repair separates inbound webhook secret from outbound API key; real provider/DB operation is blocked.                                                                                            |
| Payments                                        | **CODE\_READ/UNREACHED.** Routes/configuration and workspace surfaces exist, but no live sandbox payment lifecycle was executed.                                                                                                                                                                           |
| Notifications/push                              | **EXECUTABLE\_PATH.** Notification records/UI and VAPID web-push routes exist. First-start private-key log regression was tested; actual push delivery was not.                                                                                                                                            |
| Admin                                           | **EXECUTABLE\_PATH.** Tenant roles and platform-admin are distinct. Platform-admin is email-allowlist middleware and now denies empty configuration.                                                                                                                                                       |
| External integrations                           | **CODE\_READ/BLOCKED.** Configuration/adapters reference AI providers, Cloudinary, Google OAuth, Meta/WhatsApp, Brevo/email, SMS, payments, RemoveBG/delivery-style providers. Configuration is not live verification; no production/sandbox credentials were used.                                        |

## 3. Complete findings ledger

The companion JSON contains the full requested fields (**`files`**, **`symbols`**, root cause, symptoms, fixed, commit, tests, runtimeVerified, remainingRisk). This table keeps every finding independently addressable.

| **IDTitle/categorySev/status/evidenceRoot cause → symptom / affected flowDiscovery/reproduction; old → current; fix/test/runtime/risk** |                                                                    |                                  |                                                                                                                          |                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-001                                                                                                                                   | Canonical platform-admin gate / SECURITY                           | P0 FIXED **MEASURED**            | Empty allowlist + duplicate helper → unauthorized platform routes.                                                       | Mutation A made gate fail-open and guard failed; providers now import canonical deny-default middleware. PRODUCT; behavioral test; runtime verified locally.    |
