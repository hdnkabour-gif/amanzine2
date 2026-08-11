2. Partial state/journey migration with inconsistent consumers and cleanup.
3. Surface-local orchestration instead of reuse of existing snapshot/policy contracts.
4. Lossy, privacy-undefined conversation projection.
5. Source-shape/manual-seed tests stronger in name than behavior.
6. Missing real PostgreSQL/Chromium/provider acceptance.

### Top remaining risks

1. P0 backslash open redirect in JourneyHandoff.
2. Assistant policy/ability bypass.
3. stale callback/draft/legacy publish state crossing auth/logout.
4. raw conversation PII persistence without product policy.
5. customer enumeration/error leakage.
6. unproven migrations and delivery-secret database lifecycle.
7. surface-dependent destination/search behavior.

### Top runtime blockers

Real PostgreSQL; Chromium/GitHub Actions execution; full auth/conversation/destination/network journeys; mobile RTL/touch/keyboard; search relevance; external provider sandboxes.

### Top things Claude must NOT rebuild

- local Understanding/normalization/concept machinery;
- existing IntentSnapshot;
- ability catalog and execution/interface policy;
- router/page mapping solely because semantic ownership is split;
- merchant/customer conversation infrastructure;
- PostgreSQL domain models and delivery/provider adapters;
- browser probe preflight semantics;
- platform-admin and Meta signing gates that already have useful behavioral guards.

**Final custody verdict:** PRODUCT PATCH **REJECT as merge-ready**, ACCEPTANCE INFRA **CONDITIONAL**, SECURITY P0 **PARTIAL**, JOURNEY HANDOFF **WRONG**, AUTH **NOT VERIFIED**, CONVERSATION **PARTIAL**, DESTINATION OWNERSHIP **NOT UNIFIED**, POSTGRESQL **BLOCKED**, CHROMIUM **BLOCKED**, SAFE TO MERGE MAIN NOW **NO**.
\===== END PART 3/3 =====

\===== FILE 2: CODEX\_TO\_CLAUDE\_FINDINGS.json =====
\===== PART 1/2 =====
{
"schemaVersion": 1,
"generatedAt": "2026-08-10",
"base": "b8faab2c50ca222843452408659ae6af2bffea5f",
"product": "ad6790761e68fff5d059c8f561fd8d3474bfbc40",
"acceptance": "3848a7c3e76cc89656a26fa0b296f7b59cc6e210",
"currentLocalHeadAtHandoffStart": "1e348bf",
"findings": [
{
"id": "F-001",
"category": "SECURITY",
"severity": "P0",
"status": "FIXED",
"evidence": "MEASURED",
"files": [
"server/middleware/platformAdmin.js",
"server/routes/providers.js"
],
"symbols": [
"platformAdmin",
"requirePlatformAdmin"
],
"rootCause": "Fail-open empty allowlist and duplicate gate",
"symptoms": "Unauthorised tenant admin could reach platform routes",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"security-boundaries.test.js",
"mutation A"
],
"runtimeVerified": true,
"remainingRisk": "Other routes must continue using canonical middleware"
},
{
"id": "F-002",
"category": "WEBHOOK",
"severity": "P0",
"status": "FIXED\_PARTIAL",
"evidence": "MEASURED",
"files": [
"server/routes/webhooks.js"
],
"symbols": [
"verifyMetaSignature",
"router.post"
],
"rootCause": "Meta mutations trusted missing/default configuration",
"symptoms": "Unsigned webhook could enter mutation handler",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"security-boundaries.test.js",
"mutation B"
],
"runtimeVerified": true,
"remainingRisk": "Successful downstream DB/AI path and raw-body deployment still unverified"
},
{
"id": "F-003",
"category": "SECURITY",
"severity": "P0",
"status": "FIXED\_PARTIAL",
"evidence": "MEASURED",
"files": [
"server/routes/push.js"
],
"symbols": [
"loadVapidKeys"
],
"rootCause": "Generated private VAPID material logged",
"symptoms": "Private key disclosure in logs",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"ci-vapid-log-acceptance.js",
"mutation C"
],
"runtimeVerified": true,
"remainingRisk": "console.error/logger/file sinks and plaintext file permissions remain"
},
{
"id": "F-004",
"category": "AUTH\_BOUNDARY",
"severity": "P0",
"status": "OPEN",
"evidence": "MEASURED",
"files": [
"src/lib/journeyHandoff.ts"
],
"symbols": [
"safeUrl",
"validDestination"
],
"rootCause": "Regex treats backslash relative URL as safe",
"symptoms": "/\evil.example resolves to an external authority",
"fixed": false,
"commit": "PRODUCT",
"tests": [
"compiled behavioral probe"
],
"runtimeVerified": true,
"remainingRisk": "Open redirect after auth/handoff"
},
{
"id": "F-005",
"category": "AUTH\_BOUNDARY",
"severity": "P1",
"status": "PARTIAL",
"evidence": [
"EXECUTABLE\_PATH"
],
"files": [
"src/pages/Landing/sections/NeedFirst.tsx",
"src/pages/AuthPage.tsx"
],
"symbols": [
"consumeJourneyHandoff",
"finishAuth"
],
"rootCause": "Consumers apply inconsistent expected-id protection",
"symptoms": "Older inline callback can consume newer journey",
"fixed": false,
"commit": "PRODUCT",
"tests": [
"journeyHandoff unit misses inline consumer"
],
"runtimeVerified": false,
"remainingRisk": "Journey loss/race"
},
{
"id": "F-006",
"category": "STALE\_STATE",
"severity": "P1",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/Landing/sections/NeedFirst.tsx"
],
"symbols": [
"draft handoff effect"
],
"rootCause": "Empty draft does not clear prior handoff",
"symptoms": "Top Login may resume deleted need",
"fixed": false,
"commit": "PRODUCT",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Wrong post-auth need"
},
{
"id": "F-007",
"category": "LEGACY",
"severity": "P1",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/LivingHome.tsx",
"src/components/CreateFlow\.tsx",
"src/store.tsx"
],
"symbols": [
"amanzine\_publish\_seed"
],
"rootCause": "Legacy publish state survived handoff migration",
"symptoms": "Old seed can override q and survive logout",
"fixed": false,
"commit": "PRODUCT",
"tests": [
"mutation E not detected"
],
"runtimeVerified": false,
"remainingRisk": "Empty/stale/cross-user publish"
},
{
"id": "F-008",
"category": "BYPASSED\_POLICY",
"severity": "P1",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/AssistantPage.tsx"
],
"symbols": [
"goTo",
"goToOption",
"orchestrate"
],
"rootCause": "Assistant retained direct result/option/image routes",
"symptoms": "soon/explain/options/image/missing-policy can route without policy",
"fixed": false,
"commit": "PRODUCT",
"tests": [
"mutation D not detected"
],
"runtimeVerified": false,
"remainingRisk": "Risk/ability decision bypass"
},
{
"id": "F-009",
"category": "DESTINATION\_OWNERSHIP",
"severity": "P1",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/Landing/sections/NeedFirst.tsx",
"src/pages/AssistantPage.tsx",
"src/pages/LivingHome.tsx"
],
"symbols": [
"NeedResult.page",
"Decision.dest",
"routeTo"
],
"rootCause": "Three semantic destination families",
"symptoms": "Same need can obtain surface-dependent destination",
"fixed": false,
"commit": "PRODUCT",
"tests": [
"static call trace"
],
"runtimeVerified": false,
"remainingRisk": "Auth parity and destination E2E blocked"
},
{
"id": "F-010",
"category": "DUPLICATE\_ANALYSIS",
"severity": "P2",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/Landing/sections/NeedFirst.tsx",
"src/pages/AssistantPage.tsx",
"src/lib/needEngine.ts"
],
"symbols": [
"understand",
"parseNeed",
"stanceOf",
"orchestrate"
],
"rootCause": "Independent surface analysis composition",
"symptoms": "NeedFirst invokes stance twice; Assistant re-understands",
"fixed": false,
"commit": "PRODUCT",
"tests": [
"call trace"
],
"runtimeVerified": false,
"remainingRisk": "Divergence/performance/telemetry duplication"
},
{
"id": "F-011",
"category": "CONVERSATION\_BOUNDARY",
"severity": "P1",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/lib/conversationSession.ts",
"src/pages/LivingHome.tsx",
"src/pages/AssistantPage.tsx"
],
"symbols": [
"readConversation",
"writeConversation"
],
"rootCause": "Conversation was component-local; repair persists only text projection",
"symptoms": "Navigation/refresh preservation improves but actions/metadata disappear",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"unit/static only"
],
"runtimeVerified": false,
"remainingRisk": "No Chromium lifecycle proof"
},
{
"id": "F-012",
"category": "PRIVACY",
"severity": "P1",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"src/lib/conversationSession.ts"
],
"symbols": [
"writeConversation"
],
"rootCause": "Raw text persisted without user scope, TTL, size/schema hardening",
"symptoms": "PII/secrets typed by users live in sessionStorage",
"fixed": false,
"commit": "PRODUCT",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Session restore behavior and policy undecided"
},
{
"id": "F-013",
"category": "PRIVACY",
"severity": "P1",
"status": "PARTIAL",
"evidence": "MEASURED",
"files": [
"server/routes/customers.js",
"server/index.js"
],
"symbols": [
"POST /public",
"publicCustomerLimiter"
],
"rootCause": "Public endpoint returned full existing customer",
"symptoms": "Response reduced and rate limited, but isNew/stable id enumerate membership",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"stub serialization",
"static committed guard"
],
"runtimeVerified": true,
"remainingRisk": "Raw error message and enumeration remain"
},
{
"id": "F-014",
"category": "DELIVERY",
"severity": "P1",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"server/database.js",
"server/routes/webhooks.js",
"src/pages/DeliveryPage.tsx"
],
"symbols": [
"webhookSecret",
"delivery webhook"
],
"rootCause": "Inbound webhook reused outbound API key",
"symptoms": "Independent encrypted secret now used",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"static/fake tests"
],
"runtimeVerified": false,
"remainingRisk": "Query-string secret, timing comparison, real DB/provider blocked"
},
{
"id": "F-015",
"category": "MIGRATION",
"severity": "P1",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"server/migrate.js"
],
"symbols": [
"runMigrations",
"MIGRATION\_VERSION"
],
"rootCause": "DDL errors were caught/continued without ledger or lock",
"symptoms": "Transaction, advisory lock, ledger and error propagation added",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"mocked atomicity"
],
"runtimeVerified": false,
"remainingRisk": "Real PostgreSQL semantics/idempotency/concurrency blocked"
},
{
"id": "F-016",
"category": "DATABASE",
"severity": "P1",
"status": "BLOCKED",
"evidence": "BLOCKED",
"files": [
"server/test/ci-postgres-acceptance.js",
".github/workflows/ci.yml"
],
"symbols": [
"postgres acceptance"
],
"rootCause": "Local environment lacks DATABASE\_URL/PostgreSQL",
"symptoms": "Real DDL/FK/index/lock/backfill suite not executed",
"fixed": false,
"commit": "ACCEPTANCE",
"tests": [
"designed only"
],
"runtimeVerified": false,
"remainingRisk": "Cannot approve migration"
},
{
"id": "F-017",
"category": "TOOLING",
"severity": "P2",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"test/browser/probe-runtime.mjs",
"test/browser/screens.mjs",
"test/browser/walk.mjs"
],
"symbols": [
"probeError",
"preflight"
],
"rootCause": "Browser probes could exit green when browser/target absent",
"symptoms": "Explicit environment/invalid-probe exits added",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"local blocked-path behavior"
],
"runtimeVerified": false,
"remainingRisk": "Actual Chromium behavior blocked"
},
{
"id": "F-018",
"category": "TESTING",
"severity": "P1",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"test/browser/ci-acceptance.mjs"
],
"symbols": [
"main"
],
"rootCause": "Acceptance manually seeds handoff and registers via API",
"symptoms": "Green run bypasses NeedFirst and most auth/conversation/policy journeys",
"fixed": false,
"commit": "ACCEPTANCE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Cannot accept product from this harness alone"
},
{
"id": "F-019",
"category": "TOOLING",
"severity": "P2",
"status": "BLOCKED",
"evidence": "BLOCKED",
"files": [
".github/workflows/browser-acceptance.yml"
],
"symbols": [
"browser-acceptance"
],
"rootCause": "Chromium runner unavailable locally",
"symptoms": "Workflow exists but has never been observed here",
\===== END PART 1/2 =====

\===== FILE 2: CODEX\_TO\_CLAUDE\_FINDINGS.json =====
\===== PART 2/2 =====
"fixed": false,
"commit": "ACCEPTANCE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "GitHub Actions and Chromium unverified"
},
{
"id": "F-020",
"category": "SOURCE\_OF\_TRUTH",
"severity": "P2",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/store.tsx",
"src/App.tsx",
"src/types.ts"
],
"symbols": [
"page",
"setPage",
"RouterSync"
],
"rootCause": "Page represented in URL and store with bidirectional writers",
"symptoms": "Potential sync divergence; public routes opt out",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Requires navigation runtime trace"
},
{
"id": "F-021",
"category": "SOURCE\_OF\_TRUTH",
"severity": "P1",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/Landing/sections/NeedFirst.tsx",
"src/pages/LivingHome.tsx",
"src/pages/AssistantPage.tsx"
],
"symbols": [
"text",
"turns",
"msgs"
],
"rootCause": "Current need/conversation owned separately per surface",
"symptoms": "Handoff and shared text persistence added but no canonical journey object",
"fixed": true,
"commit": "PRODUCT",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Multiple schemas and lifetimes remain"
},
{
"id": "F-022",
"category": "BROKEN\_CHAIN",
"severity": "P2",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/Landing/sections/NeedFirst.tsx"
],
"symbols": [
"applyAnswer",
"routeTo"
],
"rootCause": "Clarification enriches signals but adapter routes option/raw destination",
"symptoms": "Structured answer does not uniformly reach snapshot/decision",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Clarification auth parity blocked"
},
{
"id": "F-023",
"category": "BROKEN\_CHAIN",
"severity": "P2",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/lib/intentSnapshot.ts",
"src/pages/LivingHome.tsx"
],
"symbols": [
"IntentSnapshot"
],
