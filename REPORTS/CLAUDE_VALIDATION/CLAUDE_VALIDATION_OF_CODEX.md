# CLAUDE VALIDATION OF CODEX FORENSIC HANDOFF — COMPLETE

**Round type:** evidence reconciliation. **No product code, tests or config modified.**
**Branch:** `audit/claude-validation` · **main:** `b8faab2c50ca222843452408659ae6af2bffea5f`
**Codex handoff:** `3b818d89e5424fe2ae36cea76a66ed2812afb23b`

**Custody check — PASS.** `main...audit/codex-handoff` = 9 files, all under
`REPORTS/CODEX_HANDOFF/`. No production code differs.

**INDEPENDENT VERIFICATION COMPLETE: YES.** 39/39 classified. UNREACHED = 0.

| Status | Count |
|---|---|
| CONFIRMED | 21 |
| PARTIALLY_CONFIRMED | 4 |
| DISPROVED | 4 |
| OBSOLETE | 9 |
| BLOCKED | 1 |

**Environment upgraded vs Codex:** PostgreSQL `VERIFIED_DISPOSABLE` (cluster provisioned at
`/var/tmp/amzpg`, port 5544, trust auth, no secrets, no production data). Chromium
`VERIFIED_TARGETED` (`/opt/pw-browsers/chromium-1194`).

---

## 0. MODEL CORRECTION (§1)

`CODEX_REPAIR_STATUS` describes Codex's local PRODUCT tree. `CURRENT_MAIN_STATUS` is what
ships. **`REPAIR_PRESENT_ON_MAIN` is `NO` for every repair-dependent finding** — measured:
`JourneyHandoff`, `requirePlatformAdmin`, `webhook_secret`, `pg_advisory_xact_lock`,
`schema_migrations` → **0 files each**; `journeyHandoff.ts`, `conversationSession.ts`,
`ci-postgres-acceptance.js`, `ci-acceptance.mjs`, `probe-runtime.mjs` → absent from BASE *and*
main. Full per-finding matrix in the JSON companion.

---

## 1. SELF-CORRECTION — F-034

**My previous round was wrong.** I reported `amanzine_need`, `amanzine_need_stance`,
`amanzine_need_seed` as "0 occurrences in src/". I never ran that grep; I repeated Codex's
claim. Re-measured, all three are **ACTIVE**:

| Key | Writers | Readers | Cleanup | Expiry |
|---|---|---|---|---|
| `amanzine_need` | NeedFirst:212 | AuthPage:100 | AuthPage:221 *(seek branch only)* | 30 min, checked at read |
| `amanzine_need_stance` | NeedFirst:221 **and** :268 | AuthPage:212 | AuthPage:217 *(offer branch only)* | **none** |
| `amanzine_need_seed` | NeedFirst:202 | **NONE** | **NONE** | none |
| `amanzine_publish_seed` | LivingHome:278, CreateFlow:250 | CreateFlow:76 | CreateFlow:77 | none |

**F-034 = DISPROVED.**

---

## 2. §6 — CURRENT AUTH STATE CONTRACT (main)

Two defects follow directly from the table, both new in this round:

**(a) Stale stance hijacks the next login.** `AuthPage.resumeNeed()` (lines 210-225) reads
`amanzine_need_stance` **first**, before `need?.text`. `amanzine_need` expires after 30 min;
**stance never expires**. A user who once started an offer, abandoned it, and logs in hours
later for any reason is forced to `/home?page=publish`.

**(b) Each branch leaves the other key behind.** The offer branch removes only
`amanzine_need_stance`; the seek branch removes only `amanzine_need`. A completed seek journey
therefore leaves a live `offer` stance behind, which hijacks the following login per (a).

**(c) `amanzine_need_seed` is a write-only orphan** — written every `routeTo`, read nowhere,
cleared nowhere.

**(d) Logout clears none of the four.** `store.tsx:467` removes only `ai_commerce_user`.

**BROWSER-PROVEN** (Chromium, exact logout sequence `removeItem('ai_commerce_user')` +
`location.href='/login'`):

```
ai_commerce_user      : cleared ✓
ai_commerce_os_state  : SURVIVES  ⇒ {"products":[{"name":"سلعةُ (أ) السرّيّة"}],"orders":[{"total":990}],…
amanzine_publish_seed : SURVIVES  ⇒ مسوّدةُ (أ)
amanzine_need_stance  : SURVIVES  ⇒ offer
amanzine_need_seed    : SURVIVES  ⇒ حاجةُ (أ)
```

**VERDICT: FRAGMENTED, NO EXPIRY DISCIPLINE, NO LOGOUT BOUNDARY.**

---

## 3. §4 — DESTINATION OWNERSHIP (mandatory answer)

**CURRENT SEMANTIC DESTINATION OWNER FAMILIES: 6**

| # | Family | Producer | Callers / surface | Conflicts with |
|---|---|---|---|---|
| 1 | `NeedResult.page/url` | `src/lib/needEngine.ts` (32 page/url literals) | `NeedFirst.routeTo` (:270, :281) | 2, 3 |
| 2 | NeedFirst stance override | `NeedFirst.tsx:220-235` | Landing; writes stance at :221 **and** :268 | 1, 3 |
| 3 | `AuthPage.resumeNeed` | `AuthPage.tsx:210-225` | every auth entry | **overrides 1 & 2** |
| 4 | `Decision.dest` (canonical) | `abilityFor`→`decideExecution`→`decideInterface` | **LivingHome only** (:279, :312) | 5 |
| 5 | Assistant direct routing | `AssistantPage.tsx:133,137,143,149` | Assistant; **no policy imported** | 4 |
| 6 | `amanzine_publish_seed` | `LivingHome:278`, `CreateFlow:250` → consumed `CreateFlow:76` | post-auth publish | 1, 3 |

Excluded as mechanics per instruction: `navigate`, `setPage`, back, tabs, modal close, public
URLs, admin links.

**DESTINATION OWNERSHIP: FRAGMENTED.**
Codex said "minimum three". Measured: **six**, and family 3 (`AuthPage`) — which Codex
reclassified as "router/auth mechanics" after its repair — is in main a genuine semantic owner
that **takes precedence over the fresh need**.

---

## 4. §5 — ASSISTANT POLICY (mandatory answer)

**CAN ASSISTANT REACH A BUSINESS DESTINATION WITHOUT CANONICAL EXECUTION POLICY: YES.**

Not partial. `src/pages/AssistantPage.tsx` imports `understandHybrid` and `orchestrate` and
**does not import `abilityFor`, `decideExecution`, or `decideInterface` at all**.

| Path | Line | Guarded by policy? |
|---|---|---|
| text result → page | `:133` `if (r.page) setPage(r.page)` | **NO** |
| text result → url | `:137` `navigate(url)` | **NO** |
| option → page | `:143` `if (opt.page) setPage(opt.page)` | **NO** |
| option → url | `:149` `navigate(url)` | **NO** |
| image / hybrid result | feeds the same `goTo` | **NO** |

Codex described a "partial policy map" — that was its own PRODUCT addition. **Current main has
none.** F-008 is more severe than reported.

---

## 5. §12 — DUPLICATE SEMANTIC WORK

**ACTION-LEVEL DUPLICATE SEMANTIC WORK: YES.**

Per one `LivingHome.submit`: `orchestrate(q)` (which internally runs `parseNeed`→`stanceOf`),
then `understand(q)`, then `escalate()` → `understandRules(q)` → **`understand(q)` again**.
That is **understanding computed twice and stance at least twice per action**.

**Self-implicating:** the second `understand` comes from `escalate()`, which I added in an
earlier session. It re-derives what `submit` already holds.

`NeedFirst`: `understand` ×5 call sites, `parseNeed` ×3, explicit `stanceOf` ×2, and
`needEngine` calls `stanceOf` ×2 internally — stance evaluated at least twice per qualifying
text.

---

## 6. §13 — CONVERSATION (current main only)

**CURRENT AI CONVERSATION LIFETIME: component-local React state; nothing persisted.**
`AssistantPage.tsx` contains **zero** `sessionStorage`/`localStorage` calls. `LivingHome.turns`
is `useState` with a single guarded writer. No `amanzine_conversation*` key exists anywhere.
It dies on navigation, refresh, tab close and logout (logout is a full reload).

**CURRENT PRIVACY RISK: not persistence — egress.** Nothing is stored in the browser, so
Codex's F-011/F-012 retention critique describes code that was never merged. The live risk is
that `recentMessages` is transmitted to `/api/ai/understand` and onward to an external LLM
provider. That contract is unaudited.

Merchant↔customer messaging remains a separate server/PostgreSQL domain. Not merged here.

---

## 7. §8 — F-013 PUBLIC CUSTOMER (real HTTP, real PostgreSQL)

**PUBLIC CUSTOMER DISCLOSURE CURRENT SEVERITY: P0.**

Measured against a live server + disposable PostgreSQL, unauthenticated:

1. New customer → `201`, response carries **16 fields**: `id,userId,name,phone,email,city,
   address,notes,vip,source,trustScore,buyerScore,totalSpent,totalOrders,lastOrderDate,createdAt`.
2. **PII read oracle.** Repeating with only `userId`+`phone` and a throwaway `name:'X'`
   returned the **victim's stored record** — real name «زبون اختبار», real address
   «حي الاختبار». The attacker's value did not overwrite; stored PII came back.
3. **Membership oracle.** `isNew:false` vs `true` distinguishes existing phones.
4. **No rate limiting.** 25 consecutive calls → `{"200":15,"201":10}`, zero 429.
5. **Raw DB error leak:** `insert or update on table "customers" violates foreign key
   constraint "customers_user_id_fkey"`.

Anyone holding a merchant's `userId` can enumerate phone numbers and harvest full customer PII
at unlimited rate. Codex's minimisation and limiter are **not in main**.

---

## 8. §9 — PLATFORM ADMIN (F-001)

**CODE DEFECT — CONFIRMED, unconditional.** `server/routes/providers.js:125-128` defines a
local `isPlatformAdmin` returning `!emails.length || emails.includes(...)`. With an empty
allowlist this **always allows**, with no environment condition.

**CODE DEFECT — CONFIRMED, conditional.** Canonical `platformAdmin.js:29`:
`if (allow.length === 0) return process.env.NODE_ENV !== 'production'`.

**DEPLOYMENT ENV UNKNOWN.** `NODE_ENV` is not set in `railway.json`, `nixpacks.toml`,
`Procfile` or `package.json`. Whether Railway sets it in its own dashboard is **not knowable
from the repository** and is explicitly not asserted here. The `providers.js` defect is
unconditional and does not depend on this.

---

## 9. §11 — POSTGRESQL: VERIFIED_DISPOSABLE

Provisioned `initdb -A trust` as unprivileged user, port 5544, no secrets, no production data.

- **Migration ran twice, clean — idempotent.** `[DB] ✅ Migrations complete` both runs.
- **F-015 CONFIRMED:** `server/migrate.js` has **0** advisory locks, **0** ledger
  (`schema_migrations` absent), and **42** `.catch(() => {})` swallow sites.
- **F-037 CONFIRMED — now REAL-PG evidence, not code read.** `pg_constraint` for `orders`
  returns exactly `orders_pkey (p)` and `orders_user_id_fkey (f)`. **No lifecycle CHECK
  constraint exists.** Order/delivery invariants are application-only.
- **F-038 CONFIRMED:** `saveSettings` does `INSERT … ON CONFLICT DO UPDATE SET data = $2` —
  whole-document JSONB, no version column, no optimistic concurrency.
- **F-036 CONFIRMED:** `server/db.js:50` returns `{ rejectUnauthorized: false }` as the
  **default** for any remote DB unless `DATABASE_CA`/`PGSSLROOTCERT` is supplied.

---

## 10. §7 — F-035: CONFIRMED WITH BROWSER PROOF

**CURRENT STATUS: CONFIRMED (P1).**

- **Exhaustive static fact:** `ai_commerce_os_state` occurs exactly **twice** in `src/` — one
  write (`store.tsx:379`), one read (`store.tsx:240`). `removeItem('ai_commerce_os_state')`
  occurs **zero** times anywhere.
- **Payload:** whole state minus `token/user/notifications/currentPage/sidebarOpen/isLoading/
  isOnline/hydrated` — i.e. **products, orders, customers, conversations**.
- **Read condition:** `store.tsx:237-249` — loaded **only on the offline branch**
  (`if (!online)`), preserving the *current* `token`/`user` (`:243`).
- **Browser-proven:** survives the real logout sequence carrying user A's data (§2 output).

**Precision over Codex:** exposure is **conditional on offline boot**, not unconditional. The
persistence half is browser-proven; the "B renders A's rows" half remains inferential because
it additionally requires two real accounts plus a backend outage.

---

## 11. PRODUCT ROOT CAUSES (§16)

### RC-P1 — No canonical destination ownership
Findings: F-008, F-009, F-020, F-021, F-022, F-023, F-024, F-030.
Six owner families; `Decision.dest` authoritative on one surface; Assistant imports no policy;
`AuthPage` overrides both.
**Canonical owner candidate:** `Decision.dest`; router executes without reinterpretation.
**Exit:** same sentence through Landing / Home / Assistant / post-auth yields one destination,
proven per surface in Chromium.

### RC-P2 — Client state has no identity or lifetime boundary
Findings: F-005, F-006, F-007, F-034, F-035.
Five keys; one has no reader; two have asymmetric cleanup; one has no expiry; none are cleared
by logout.
**Canonical owner candidate:** a registry of client-persisted keys with declared scope+TTL, and
a logout that iterates the registry.
**Exit:** browser test — A → logout → B → offline boot → zero rows of A; no key survives logout
unless declared cross-identity.

### RC-P3 — Unauthenticated surfaces over-disclose
Findings: F-013 (P0), F-039.
**Exit:** public responses expose nothing beyond caller-supplied data plus an opaque id; no raw
`e.message`; rate limit measured.

### RC-P4 — Secret trust-domain collapse
Findings: F-001, F-003, F-014, F-029, F-036.
Private VAPID key logged; inbound webhook secret **is** the outbound API key; secret accepted
via `req.query`; non-constant-time compare; TLS `rejectUnauthorized:false` default; unconditional
admin fail-open in `providers.js`.
**Exit:** no secret in logs or query strings; inbound/outbound secrets separated; constant-time
compare; TLS trust explicit; one admin gate, deny-default.

### RC-P5 — Data invariants are application-only
Findings: F-015, F-037, F-038.
**Exit:** lifecycle constraints in DDL; migration transactional with lock + ledger; JSONB writes
versioned. Verified on real PostgreSQL.

### RC-P6 — Duplicate semantic work per action
Findings: F-010, F-027, F-030.
**Exit:** one semantic analysis per user action, asserted by a counting probe.

### RC-P7 — Guards can stay green under defect
Finding: F-026.
**Exit:** every guard covering RC-P1…P5 fails under injection of its own defect.

## PROCESS / CUSTODY RISKS (kept separate)

### RC-PROCESS-1 — Repair custody loss
A complete security/architecture series was produced against this exact base and lost; main
carries the unmitigated defects while the dossier index reads `FIXED`/`PARTIAL`. This is a
delivery-process failure, **not** an AMANZINE architecture defect, and is excluded from the
product count.

---

## 12. REPAIR PLAN — 5 PHASES

**Phase 1 — RC-P4 secrets (highest damage/effort ratio).**
Files: `server/routes/push.js`, `server/routes/webhooks.js`, `server/routes/providers.js`,
`server/db.js`. Exit: no secret logged or in query; separate inbound secret; constant-time
compare; one deny-default admin gate. Sabotage: restore each — every test must fail.

**Phase 2 — RC-P3 public surfaces.**
Files: `server/routes/customers.js`, `server/routes/delivery.js`. Real-PG HTTP tests.
Exit: opaque-id responses, no raw errors, enforced limiter.

**Phase 3 — RC-P2 client identity boundary.**
Files: `src/store.tsx`, `src/pages/AuthPage.tsx`, `src/pages/Landing/sections/NeedFirst.tsx`,
`src/pages/LivingHome.tsx`, `src/components/CreateFlow.tsx`. Chromium identity-switch journey.
Exit: registry-driven logout; expiry on every key; `amanzine_need_seed` removed or given a reader.

**Phase 4 — RC-P1 destination ownership.**
Wire `Decision.dest` into Assistant and Landing; make `AuthPage` execute a captured target
rather than re-deriving. Exit: 6 families → 1; parity proven per surface in Chromium.

**Phase 5 — RC-P5 + RC-P6 + RC-P7.**
DDL constraints, transactional migration with lock/ledger, JSONB versioning; one analysis per
action; injection-prove every guard from Phases 1-4.

**STOP CONDITION (each phase):** if a phase opens more than 2 new P0s, stop and re-plan.

---

## 13. VERDICTS

**REWRITE VERDICT: REUSE_AND_REWIRE.** All 21 confirmed findings are wiring, boundary or
disclosure defects. None requires replacing understanding, ability catalog, execution policy,
router, messaging or DB models — those exist and are correct where they are actually reached.
A rewrite would recreate every boundary defect and discard working machinery. `LivingHome`
being large (F-030) is a symptom of RC-P1, not an argument for rewriting.

**PRIMARY IMPLEMENTER: CLAUDE_CODE. REVIEWER: CODEX.**
RC-P1 and RC-P2 span five files writing shared state; splitting them reproduces the exact
failure already documented. Codex should review RC-P3/P4/P5, where its server and DB analysis
is strongest — and where it should be held to the custody rule it broke.

**SAFE TO START REPAIRS: YES — beginning at Phase 1.**
The evidence matrix is closed, PostgreSQL and Chromium are available, and Phase 1 is
self-contained with sabotage-provable exits.

---

## 14. DEFINITION OF DONE — "AMANZINE CORE READY"

1. No open P0 (currently: F-013, F-003, F-001-providers).
2. All 39 findings hold a current-main status; UNREACHED = 0. **(met this round)**
3. No status reads FIXED without a reachable commit SHA.
4. One semantic business destination owner; mechanics explicitly excluded and documented.
5. No active conflicting legacy journey writer; every client key has declared scope + TTL and
   is cleared by a registry-driven logout.
6. Landing / Home / Assistant / Auth all obey the canonical decision backbone, proven per
   surface in Chromium — not asserted.
7. One semantic analysis per user action, asserted by a counting probe.
8. Public endpoints disclose nothing beyond caller-supplied data plus an opaque id; rate limits
   measured; no raw errors.
9. No secret in logs or query strings; inbound/outbound trust domains separated; DB TLS trust
   explicit.
10. Order/delivery lifecycle constraints enforced in DDL; migration transactional with lock and
    ledger; verified on real PostgreSQL with every skip explained.
11. Mobile widths + computed RTL verified in Chromium.
12. Every guard covering a confirmed root cause fails under injection of its own defect.

**On reaching this: stop general architecture audits.** Everything else becomes backlog.

---

## 15. WHAT THIS ROUND DID NOT DO

No product code, test or config modified. No Codex file modified. No production database or
credentials used — PostgreSQL was a disposable trust-auth cluster with synthetic data.
F-025 remains **BLOCKED**: external provider sandboxes require credentials that do not exist
here, and production calls are forbidden. That is the only remaining blocked item.
