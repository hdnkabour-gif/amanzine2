# AMANZINE — CORE CONVERGENCE

**BASE:** `b8faab2c50ca222843452408659ae6af2bffea5f` · **BRANCH:** `repair/core-convergence`

Root-cause ledger. One line per state change; no forensic re-derivation.

| RC | Title | State | Closing SHA |
|---|---|---|---|
| RC-P4 | Secret trust boundaries | **CLOSED_FINAL** | (below) |
| RC-P3 | Public surfaces over-disclose | **CLOSED** | (below) |
| RC-P2 | Client identity/state lifetime | **CLOSED** | (below) |
| RC-P1 | Semantic destination ownership | **CLOSED** | `d05913c` · `88c9153` |
| RC-P5 | Database invariants | **CLOSED** | `1d70b96` |
| RC-P6 | Duplicate semantic work | **CLOSED** | `5c6bbff` |
| RC-P7 | Guards green under defect | **CLOSED** | `896082a` |

الحصيلةُ النهائيّةُ ومعها ما لم يُقَس: **`REPORTS/REPAIRS/CORE_READY.md`**.
والرحلاتُ الذهبيّة (`dbcd671`) كشفت عطبَين بعد الإغلاق — عبورُ ذاكرةِ التعلّم
للخروج، وخطأُ مُدخَلٍ يُقدَّم خطأَ خادم — وكلاهما أُغلق.

---

## RC-P4 — CLOSED_FINAL

Phase 1 (`8482af3`, cherry-picked exactly) closed six defects. This round closed the
three self-review points plus one correction of my own earlier verdict.

| # | Defect | Fix |
|---|---|---|
| P1-A | `PGSSLMODE=disable`/`DB_SSL=false`/`sslmode=disable` were honoured **before** local/remote was distinguished — one env line made a remote production DB run in **plaintext** | disable is a local/dev tool; remote + production now throws with an actionable message |
| P1-B | `ADMIN_EMAIL` was simultaneously authorization **and** the VAPID contact address — setting a mailing address granted Platform Admin | contact reads `VAPID_CONTACT_EMAIL` first. Authorization compatibility **kept, with evidence**: `index.js` seeds the owner account from `ADMIN_EMAIL`+`ADMIN_PASSWORD`, so it is the owner identity in this product — a contract in code, not a habit |
| P1-C | `mode 0o600` protected only **newly** created `vapid.json`; a file written before the fix stayed world-readable forever | hardened on read (`chmod 600` when group/other bits are set); key material untouched |
| F-028 | **Correction of my own verdict.** I marked F-028 DISPROVED from a narrow grep. Startup actually printed `list.join(', ')` — the owner's email into an exported log | prints the **count**, not the addresses |

**TLS matrix — all nine cases measured:** local/dev `false` · local/prod verify · remote verify ·
remote+`DATABASE_CA` verify+CA · remote+`PGSSLROOTCERT` verify+CA · remote+bad CA **throws** ·
remote+disable/prod **throws** (×3 spellings) · remote+disable/dev `false` · local+disable/prod `false`.

**Sabotage: 11/11 detected.** S1 admin fail-open · S2 VAPID log · S3 apiKey fallback ·
S4 query secret · S5 non-timing-safe · S6 TLS tolerant · S7 UI writes wrong key ·
S8 remote plaintext · S9 contact grants auth · S10 legacy file left weak · S11 admin log.

**Note on S5 (carried from Phase 1):** timing-safety is **not behaviorally observable** — both
comparisons return `401`, and measured timing on 4096-char inputs gave ratio `0.54×` for the
naive compare (signal drowned in noise). The property is therefore held **structurally**: one
comparison owner in `lib/webhookAuth.js`, with the guard declared `SOURCE_SHAPE` in the test.

---

## RC-P3 — CLOSED

`POST /api/customers/public` is an anonymous **write** door by design — a customer fills a form
on the merchant's public page before having an account. The defect was never its existence; it
was its **answer**.

| Defect (measured over real HTTP) | Fix |
|---|---|
| returned the **stored** record — 16 fields incl. name, phone, address, notes, vip, trustScore, totalSpent — so sending a real phone with a made-up name returned **the phone owner's data** | one acknowledgement `{ ok: true }` for every outcome |
| `isNew` + `201`/`200` distinguished existing from new ⇒ **membership oracle**: try phone after phone and enumerate the merchant's customers without reading a single field | identical body **and** identical status in both cases |
| raw `e.message` exposed table and constraint names | generic 400; detail to server log only |
| the **only** public route with no dedicated limiter (orders/coupons/bookings/track all had one) | `15/hour`, same pattern as its siblings |

**Caller check first, as required:** a full `src/` sweep found **no client anywhere in the
repository** that calls this endpoint, so minimising the response hides no existing screen.

**Cross-tenant verified:** the same phone under a second merchant creates that merchant's own
row and copies nothing from the first.

**Sabotage 4/4:** S12 full-record return (2 failed) · S13 membership oracle (3) · S14 raw error
(1) · S15 no rate limit (1).

Tests: 7 INTEGRATION (real HTTP + disposable PostgreSQL). No customer field is printed in any
failure message — the guard does not leak what it exists to protect.

---

## RC-P2 — CLOSED

Five browser-persisted keys, five different rules, none written together. One registry now
declares **scope + TTL + store** for every key (`src/lib/clientState.ts`), and logout **iterates
the registry** instead of naming keys — because naming forgets, iterating does not.

| Scope | Meaning | Cleared when |
|---|---|---|
| `identity` | belongs to one account (`os_state`, `user`, `pending_settings`) | any identity change |
| `journey` | belongs to one live journey (`need`, `need_stance`, `publish_seed`, `conversation`) | identity change · journey end · "من جديد" |
| `device` | not account-bound (`theme`) | never |

| Defect | Fix |
|---|---|
| logout removed `ai_commerce_user` only — **1 of 8**; business cache with products/orders/customers survived | `clearIdentityState()` walks the registry |
| offline hydration read whatever was stored and stamped the **current** identity over it | every value carries `owner`; a value belonging to someone else is refused **and deleted** |
| `amanzine_need_stance` had **no TTL** — an abandoned offer hijacked the next login to publish, hours later | every journey key carries the same 30-minute TTL, enforced in one place |
| cleanup was **asymmetric** — the offer branch cleared stance, the seek branch cleared need, each leaving the other behind | `resumeNeed` consumes the whole journey once |
| `amanzine_need_seed` written on every route, **read nowhere** | retired — keeping a key with no reader is keeping a habit, not a function |
| conversation was component-local; contextual navigation destroyed it | lifted into the same registry, `journey` scope. **No server, no account history** — survives navigation and refresh, dies with the journey or the identity |

**Chromium-proven** (build served, real browser): A's five keys present → logout → **only
`ai_commerce_user` written by B remains, session empty** → B sees none of A's trade → a surviving
copy is refused by owner mismatch → a 40-minute-old `offer` stance is expired and cannot hijack.

**Sabotage 5/5:** S16 logout clears one key · S17 no owner check · S18 no TTL · S19 stance
without TTL · S20 back-door write outside the registry.
