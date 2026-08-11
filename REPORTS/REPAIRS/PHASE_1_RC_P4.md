# PHASE 1 — RC-P4: SECRET TRUST-DOMAIN COLLAPSE

**BASE SHA:** `b8faab2c50ca222843452408659ae6af2bffea5f` (= `origin/main`, no drift)
**BRANCH:** `repair/phase-1-security-boundaries` (branched from `origin/main`, **not** from any audit branch)
**SCOPE:** F-001 · F-003 · F-014 · F-029 · F-036 only.

---

## FILES CHANGED

| File | Why |
|---|---|
| `server/middleware/platformAdmin.js` | empty allowlist → deny, unconditionally |
| `server/routes/providers.js` | delete local weaker gate, use canonical |
| `server/routes/push.js` | stop logging VAPID private key; `mode 0o600` on key file |
| `server/lib/webhookAuth.js` **(new)** | single owner of inbound webhook authentication |
| `server/routes/webhooks.js` | delegate to that owner; header-only; no apiKey fallback |
| `server/migrate.js` | add `webhook_secret` column (existing `ADD COLUMN IF NOT EXISTS` pattern) |
| `server/database.js` | map/read/write `webhookSecret`, encrypted, in **both** INSERT and UPDATE |
| `server/lib/dbSsl.js` **(new)** | TLS trust policy, extracted so it can be tested |
| `server/db.js` | use it; actionable trust error |
| `src/pages/DeliveryPage.tsx` | generate/read `webhookSecret`, stop putting the secret in the URL |
| `server/test/phase1-security.test.js` **(new)** | 16 tests |
| `server/test/phase1-delivery-secret.test.js` **(new)** | 5 tests, real PostgreSQL |
| `server/test/webhook-door.test.js` | updated to the new contract (see COMPATIBILITY) |
| `REPORTS/{DISCONNECTED,LEXICON,PAGE_ACTIONS}.md` | regenerated (two new lib files) |

**Files outside the anticipated list, with reason:**
`server/migrate.js` + `server/database.js` — an independent inbound secret cannot exist without
persistence. Uses the file's own existing column-add loop; **no new migration framework** (that
is Phase 5). `src/pages/DeliveryPage.tsx` — the "generate secret" button wrote `apiKey`; after
the server split it would have produced a dead door. Storing the secret in the existing
`fields JSONB` was considered and rejected: that column is unencrypted and returned to clients,
while `api_key`'s encrypted-column pattern already existed and applies exactly.

---

## DEFECTS BEFORE → FIXES

| # | Before (measured) | After |
|---|---|---|
| 1 | `providers.js` local `isPlatformAdmin` = `!emails.length \|\| …` — **unconditional allow** on empty allowlist | local gate deleted; canonical middleware imported |
| 2 | canonical gate returned `NODE_ENV !== 'production'` on empty allowlist; `NODE_ENV` set in **no** deployment file in-repo | `return false` — deny, unconditionally |
| 3 | `push.js:25` printed `VAPID_PRIVATE_KEY=<value>` to stdout | `[REDACTED]`; public key still printed; key file `0o600` |
| 4 | inbound webhook authenticated with `row.apiKey` — the **outbound** credential | independent encrypted `webhook_secret`; **no fallback** |
| 5 | secret accepted from `req.query.secret` | canonical header `x-webhook-secret` only |
| 6 | `String(given) !== String(secret)` — content-dependent timing | SHA-256 → `crypto.timingSafeEqual`, single owner |
| 7 | remote DB defaulted to `{ rejectUnauthorized: false }` | remote verifies identity; explicit CA honoured |
| 8 | a CA that failed to load **silently downgraded** to tolerant TLS | throws with an actionable message |

---

## TESTS

| Suite | Count | Classification |
|---|---|---|
| `phase1-security.test.js` | 16 | BEHAVIORAL (direct unit calls) + INTEGRATION (real HTTP) + 2 declared SOURCE_SHAPE |
| `phase1-delivery-secret.test.js` | 5 | REAL_POSTGRESQL |
| `webhook-door.test.js` | 5 | SOURCE_SHAPE (pre-existing, updated) |

**Regression, full run:** server `434/434` pass, **0 skipped**, on real PostgreSQL ·
brain `725/725` · constitution `18/18` · knowledge `11/11` · architecture `152/152` ·
`npm run lint` PASS · `npm run build` PASS · `git diff --check` clean.

Meta HMAC untouched per scope §6; its existing guards pass.

---

## REAL POSTGRESQL

**USED.** Disposable cluster (`initdb -A trust`, port 5545), synthetic data only, no production
credentials, destroyed after the run. Migration ran clean; `webhook_secret` written, read back,
verified independent from `api_key`, verified stored as `enc:v1:` ciphertext, verified that a
legacy row without the column reads back as empty (door closed).

One test initially passed for the wrong reason — `secrets.encrypt` is a passthrough without
`SECRETS_KEY`/`JWT_SECRET`, so the assertion was measuring the environment. Fixed to set the key
and assert the ciphertext prefix.

---

## SABOTAGE MATRIX

Each mutation applied alone to a disposable copy, then the exact tree restored.

| ID | Mutation | Expected | Actual |
|---|---|---|---|
| S1 | admin fail-open returns on empty allowlist | admin behavioral test fails | **1 failed — DETECTED** |
| S2 | restore `VAPID_PRIVATE_KEY=${keys.privateKey}` | log-capture test fails | **1 failed — DETECTED** |
| S3 | restore `row.apiKey` fallback | webhook contract + HTTP fail | **3 failed — DETECTED** |
| S4 | restore `req.query.secret` | header-only + door tests fail | **3 failed — DETECTED** |
| S5 | replace `timingSafeEqual` with `===` | owner guard fails | **1 failed — DETECTED** |
| S6 | remote TLS `rejectUnauthorized:false` | TLS matrix fails | **2 failed — DETECTED** |
| S7 | UI writes `apiKey` again | door test fails | **1 failed — DETECTED** |

Clean tree before and after: **0 failures**.

### S5 required restructuring, not a new assertion

S5 was **MISSED** on the first attempt — zero tests failed. Rather than add a guard to make the
table look right, the cause was measured: **timing-safety is not observable through behavior.**
Both comparisons return `401`; only the clock differs. Measured over 4096-char inputs, 40 000
iterations:

```
!==                       early=2.2ms   late=1.2ms   ratio 0.54×
hashed timingSafeEqual    early=1056ms  late=1038ms  ratio 0.98×
```

The early-exit signal **drowned in noise** — V8 compares length first and then uses a vectorized
compare. A timing-based test here would be flaky, and a flaky guard is worse than none.

The fix was therefore **structural**: the comparison was extracted into `lib/webhookAuth.js` so
there is exactly one owner, and the guard asserts (a) the route calls only that owner and
compares nothing itself, (b) the owner holds its behavioral contract. The source-shape part is
**declared as such in the test**, because it is the limit of what can be proven — not because it
was easier.

### S4a — an extra probe that exposed a weak guard

An additional self-invented variant (a second secret source inside the owner, spelled
`headers.__query.secret`) slipped a **blacklist-style** guard that forbade specific spellings.
Replaced with a **positive** assertion: only the canonical header may open the door — asserted
behaviorally against six alternative sources. S4a is now detected.

---

## COMPATIBILITY REQUIREMENT — OPEN, NOT CLOSED

`webhook-door.test.js` previously **required** `?secret=` with the rationale *"delivery company
dashboards don't send custom headers — the URL is all you have."* That assertion was changed,
not deleted, and the reasoning is recorded in the test itself.

Three facts support removing the query path:
1. URL secrets are written to every proxy log and survive in `Referer`.
2. **`DeliveryPage` already instructed merchants** to use the `x-webhook-secret` header
   *"بلا ما تحطّو ف الرابط"* — the route accepted what its own screen forbade.
3. The secret is generated by us and pasted into the provider's dashboard; it is not imposed by
   an external party.

**This is not proven against a real provider.** F-025 remains BLOCKED — no sandbox credentials.
If a specific company is shown to be header-incapable, the answer is a **named compatibility
path for that provider** with a separate, scope-limited secret — **not** reopening query secrets
for everyone.

---

## DEPLOYMENT RISK — REQUIRES AN OPERATOR DECISION

Two changes can stop a running deployment. Both are intentional and neither should be reverted
silently:

1. **`ADMIN_EMAILS` must now be set.** With no admin email configured, platform-admin routes
   deny everyone — including the owner. Set `ADMIN_EMAILS` (or `PLATFORM_ADMIN_EMAIL` /
   `ADMIN_EMAIL`) before deploying.
2. **Remote database TLS now verifies identity.** If the provider serves a self-signed chain,
   connection fails with an actionable message naming `DATABASE_CA` / `PGSSLROOTCERT`. No
   `ALLOW_INSECURE_DB` escape hatch was added — per instruction, that would need explicit
   approval, and it was not needed to make the tests pass.

---

## EXIT CRITERIA — 11/11

| # | Criterion | Status |
|---|---|---|
| 1 | one platform-admin gate | PASS |
| 2 | empty allowlist denies | PASS |
| 3 | no VAPID private material in logs | PASS |
| 4 | inbound/outbound delivery secrets independent | PASS (real PG) |
| 5 | no webhook secret in query strings | PASS |
| 6 | timing-safe comparison | PASS (structural; see S5) |
| 7 | remote DB trust explicit and secure by default | PASS |
| 8 | tests prove behavior, not only source shape | PASS (2 declared source-shape, both additional) |
| 9 | all sabotage mutations detected | PASS (7/7) |
| 10 | no regression in Meta/admin/push/delivery | PASS (434/434 server, 0 skipped) |
| 11 | no production credentials or data used | PASS |

**PHASE_1_STATUS = CLOSED.**

---

## BLOCKED

- **F-025** external provider sandboxes — no credentials; production calls forbidden. This is
  what leaves the header-only compatibility question open.

## KNOWN NON-PHASE-1 RISKS (recorded, not touched)

- **F-013** `POST /api/customers/public` returns full customer PII, unauthenticated, unlimited —
  **P0, Phase 2**.
- **F-035 / F-007** `ai_commerce_os_state`, `amanzine_publish_seed`, `amanzine_need_stance`,
  `amanzine_need_seed` all survive logout — Phase 3.
- **F-015 / F-037 / F-038** migration has no lock or ledger and 42 swallow sites; `orders` has no
  lifecycle constraint; settings JSONB writes are unversioned — Phase 5.
- **Full server suite shares one database** with default concurrency; one health test failed once
  in a full run and passed in isolation both with and without these changes. Interference, not a
  Phase 1 regression — worth isolating in a later phase.
