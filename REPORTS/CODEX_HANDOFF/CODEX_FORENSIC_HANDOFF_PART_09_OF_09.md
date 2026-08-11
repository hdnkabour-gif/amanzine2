"rootCause": "Snapshot exists mainly in LivingHome and is built after parts of decision flow",
"symptoms": "Landing/Assistant do not share contract",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Canonical pipeline incomplete"
},
{
"id": "F-024",
"category": "SEARCH\_CONTRACT",
"severity": "P2",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/Landing/sections/NeedFirst.tsx",
"src/lib/orchestrator.ts"
],
"symbols": [
"expanded query",
"q"
],
"rootCause": "Some paths expand concepts while Landing direct route sends coarse/raw q",
"symptoms": "Search relevance can differ by surface",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Real ranking/relevance corpus not browser/server verified"
},
{
"id": "F-025",
"category": "AI",
"severity": "P2",
"status": "BLOCKED",
"evidence": "BLOCKED",
"files": [
"src/lib/hybridUnderstanding.ts",
"server/services"
],
"symbols": [
"understandHybrid",
"providers"
],
"rootCause": "Provider configuration is not live invocation proof",
"symptoms": "OpenAI/Gemini/etc. behavior unknown without sandbox credentials",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Fallback, payload privacy, timeout/cost not E2E verified"
},
{
"id": "F-026",
"category": "TESTING",
"severity": "P2",
"status": "OPEN",
"evidence": "MEASURED",
"files": [
"test/architecture.test.mjs",
"test/architecture-freshness.test.mjs"
],
"symbols": [
"architecture guards"
],
"rootCause": "Many guards inspect source tokens/slices rather than behavior",
"symptoms": "Mutations D/E/I/J passed 72/72",
"fixed": false,
"commit": "PRODUCT",
"tests": [
"mutations D,E,I,J"
],
"runtimeVerified": true,
"remainingRisk": "Green architecture suite can mask defects"
},
{
"id": "F-027",
"category": "PERFORMANCE",
"severity": "P3",
"status": "OPEN",
"evidence": "MEASURED",
"files": [
"dist assets"
],
"symbols": [
"vite build chunks"
],
"rootCause": "Large eager/route chunks",
"symptoms": "Build warns around 536k and \~997k chunks",
"fixed": false,
"commit": "BASE",
"tests": [
"npm run build"
],
"runtimeVerified": true,
"remainingRisk": "Initial-route impact not measured; do not optimize blindly"
},
{
"id": "F-028",
"category": "SECURITY",
"severity": "P2",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"server/index.js"
],
"symbols": [
"startup logs"
],
"rootCause": "Configured platform-admin emails logged",
"symptoms": "Operational PII in startup logs",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Log access exposure"
},
{
"id": "F-029",
"category": "SECURITY",
"severity": "P2",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"server/routes/webhooks.js"
],
"symbols": [
"delivery webhook compare"
],
"rootCause": "Secret transported in query and compared with !==",
"symptoms": "History/proxy leakage and timing weakness",
"fixed": false,
"commit": "PRODUCT",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Provider contract may require transition plan"
},
{
"id": "F-030",
"category": "ARCHITECTURE",
"severity": "P2",
"status": "OPEN",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/LivingHome.tsx"
],
"symbols": [
"LivingHome"
],
"rootCause": "Surface owns UI, conversation, parser, decision, snapshot, memory, telemetry, navigation",
"symptoms": "God-surface coupling and bypass risk",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Rewire rather than rewrite"
},
{
"id": "F-031",
"category": "TOOLING",
"severity": "P3",
"status": "FIXED",
"evidence": "MEASURED",
"files": [
"test/architecture-freshness.test.mjs"
],
"symbols": [
"freshness inventory"
],
"rootCause": "Generated runtime artifact/self-count invalidated freshness assertions",
"symptoms": "Generator-produced artifacts distinguished",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"architecture suite"
],
"runtimeVerified": true,
"remainingRisk": "Freshness still proves inventory consistency, not product reachability"
},
{
"id": "F-032",
"category": "CONVERSATION\_BOUNDARY",
"severity": "P2",
"status": "FALSE",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src/pages/LivingHome.tsx"
],
"symbols": [
"record",
"fillSlot",
"correction"
],
"rootCause": "Hypothesis that correction and fillSlot bypass record equally",
"symptoms": "Current Home routes both through record; reset intentionally does not",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Network payload order still runtime-blocked"
},
{
"id": "F-033",
"category": "TOOLING",
"severity": "P2",
"status": "FALSE",
"evidence": "MEASURED",
"files": [
"test/browser/probe-runtime.mjs"
],
"symbols": [
"preflight"
],
"rootCause": "Missing Chromium/target was previously liable to be described as app failure/pass",
"symptoms": "Now classified ENVIRONMENT\_BLOCKED rather than product verdict",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"blocked preflight"
],
"runtimeVerified": true,
"remainingRisk": "Does not substitute for browser run"
},
{
"id": "F-034",
"category": "LEGACY",
"severity": "P3",
"status": "OBSOLETE",
"evidence": "EXECUTABLE\_PATH",
"files": [
"src"
],
"symbols": [
"amanzine\_need",
"amanzine\_need\_stance",
"amanzine\_need\_seed"
],
"rootCause": "Old auth keys once carried raw/stance separately",
"symptoms": "No active src runtime reader/writer after repair",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"whole-source search"
],
"runtimeVerified": false,
"remainingRisk": "Historical docs/reports still mention them"
},
{
"id": "F-035",
"category": "PRIVACY",
"severity": "P1",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"src/store.tsx"
],
"symbols": [
"offline backup persistence"
],
"rootCause": "Business projection persists independently of live logout reset",
"symptoms": "Cross-identity stale products/orders/customers may remain locally",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Browser identity-switch lifecycle unverified"
},
{
"id": "F-036",
"category": "SECURITY",
"severity": "P1",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"server/database.js"
],
"symbols": [
"Pool SSL configuration"
],
"rootCause": "Remote TLS defaults to rejectUnauthorized false",
"symptoms": "Database server identity may not be authenticated",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Deployment CA/trust policy required"
},
{
"id": "F-037",
"category": "DATABASE",
"severity": "P1",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"server/migrate.js"
],
"symbols": [
"order/delivery lifecycle DDL"
],
"rootCause": "Lifecycle invariants are largely application-enforced",
"symptoms": "Invalid transitions can reach database under races/direct writes",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Real schema/constraint audit blocked"
},
{
"id": "F-038",
"category": "DATABASE",
"severity": "P2",
"status": "OPEN",
"evidence": "CODE\_READ",
"files": [
"server/database.js"
],
"symbols": [
"JSONB settings writes"
],
"rootCause": "Whole-document read/modify/write lacks versioning",
"symptoms": "Concurrent settings updates can overwrite each other",
"fixed": false,
"commit": "BASE",
"tests": [],
"runtimeVerified": false,
"remainingRisk": "Concurrency reproduction with PostgreSQL needed"
},
{
"id": "F-039",
"category": "PRIVACY",
"severity": "P1",
"status": "PARTIAL",
"evidence": "EXECUTABLE\_PATH",
"files": [
"server/routes/customers.js",
"server/routes/delivery.js"
],
"symbols": [
"public customer",
"tracking surfaces"
],
"rootCause": "Public lookup/tracking contracts expose identifiers and accept abuse-prone input",
"symptoms": "Customer/order/shipment information can be enumerated or overexposed",
"fixed": true,
"commit": "PRODUCT",
"tests": [
"customer minimization/rate static guards"
],
"runtimeVerified": false,
"remainingRisk": "Tracking surface and real rate/error responses need E2E"
}
]
}
\===== END PART 2/2 =====

SECOND\_MASTER\_SHA256: c995e336a021ab540aacaaac95c12025621d4e1d2babc1a146bfcb4647518cd2
SECOND\_FINDINGS\_SHA256: b71d33faa794d83d171c047b0eb2c8444282de2ccf873d4ddf65bc4443bf196a
SHA256\_UNCHANGED: YES
