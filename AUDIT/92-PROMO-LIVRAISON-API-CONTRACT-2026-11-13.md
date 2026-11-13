# Promo Livraison — API Contract & AMANZINE Integration (13 Nov 2026)

## Ground truth and limits
**Source:** The user shared an image and exact text copied from their Promo Livraison seller API documentation, including Add Order and Track Order requests and responses. These are source material, not a successful live handshake. Direct public page access was not available during the audit; no actual account/token was used and **no carrier parcel was created**.

Login page given by user: `https://promo-livraison.ma/seller/login` — **login UI only**, do not POST API credentials here.
Documented API URL (Add AND Track): `https://promo-livraison.ma/seller/api-parcels`.

### Documented Add Order (POST, form-encoded)

| Parameter | Type/example | Required according to provided example |
|---|---|---|
| action | `add` | yes |
| token | `YOUR_TOKEN` | yes; use confidential seller API token, **not seller password** |
| name | `John Doe` | yes |
| phone | `0600000000` | yes |
| marchandise | `Chaussures` | yes |
| marchandise_qty | `2` | yes |
| ville | `Casablanca` | yes (city as text; no official ID requirement established) |
| adresse | `123 Rue Exemple` | yes |
| note | `Livraison rapide SVP` | shown, can be empty if accepted |
| stock | 0 | shown |
| products[0][sku] | `SKU-DEMO-001` | shown |
| products[0][qty] | 1 | shown |
| price | 150 | shown; amount collected under COD is not the delivery fee |

Header: `Content-Type: application/x-www-form-urlencoded`. Send with `URLSearchParams`/PHP `http_build_query`. **Do not send JSON, Bearer auth or a browser-login form.**

Documented success: `{"status":200,"msg":"Commande ajoutée avec succès","tracking":"DZ-DEMO-000123"}`.
Documented invalid token: `{"status":401,"msg":"Token invalide ou expiré"}`.

### Documented Track Order (POST, same URL)

Form: `action=track&token=YOUR_TOKEN&tracking=DZ-DEMO-000123`. Successful response has `status:true`, `tracking`, `msg` **array of history events** (fields `code,colorstatus,status,coloretat,etat,time`) and `delivery:{name,phone}`.
Negative tracking lookup: `{"status":false,"msg":"Aucune information trouvée pour ce code"}`.

**Important:** `status=200` when creating and `status=true` when tracking; `status=401` for bad Token and `status=false` for unknown tracking. HTTP 200 by itself does **not** prove a parcel was created. The documented example also has `marchandise_qty=2` while `products[0][qty]=1`, so those two example quantities should not be interpreted as an invariant.

No `seller_id` appears in this user-provided Add/Track contract. Although a seller ID may appear in the panel, it is NOT a proven API input and is not automatically submitted.

## Actual AMANZINE implementation and fixes
- Plugin: `server/services/delivery/providers/promo_livraison.provider.js` uses one URL, POST form encoding, `action=add/track`, `token` in body, exact documented French fields, correct JSON response shapes. `ville` is sent as text, not an undocumented numeric ID.
- API endpoint is restricted to HTTPS under `promo-livraison.ma`; rejects `/seller/login` so tokens cannot be sent to a login page or wrong host.
- `testConnection` no longer uses a made-up `__ping__` and incorrectly accepts generic errors. A **known previous tracking code** from the same seller account is used for read-only verification. Without it status is `inconclusive` (not `verified`). No shipment is created during connection tests.
- Add `status:200` without `tracking` = `acceptedUnconfirmed`; HTTP failures contradicting success payloads and transport timeout after POST are also unknown outcomes. Do **not** retry automatically because a duplicate COD parcel might be created; merchant should consult Promo dashboard first.
- `seller_id` is deliberately not appended to POST because absent from the provided contract; `SKU` falls back to product ID if necessary.
- Credential safety: when saving a Promo provider, `fields.token` is moved into the existing encrypted `api_key` DB column; it is removed from plaintext JSONB. A tenant-scoped one-time cleanup moves old JSON tokens into the encrypted column on next authorized provider read. No real Token is printed, copied to reports or tested against production.
- Delivery flow fixes in PR #19: do not ignore selected carrier; no internal fake tracking; no false-positive `testConnection`; mark `confirmation_required` for uncertain shipment creation; protect against duplicate creation; offline never marks order `shipped`; API UI edit/save path accepts provider's default URL and avoids duplicate row.

### Evidence (mock transport + disposable PostgreSQL)
- `server/test/promo_livraison-contract.test.js`: actual source-document success/error examples, 200 vs true, history array, authorization encoding, product fields, no seller_id, unknown tracking, 401 token, known-tracking read, wrong hostname/login rejection, unknown response/timeout safeguards.
- `server/test/phase1-delivery-secret.test.js`: encrypted Promo key at rest + API roundtrip from a PostgreSQL row and one-time legacy token migration.
- `server/test/shipment-retry.test.js`: false webhook success, no duplicate on ambiguous outcome and explicit carrier choice.
- PR and review: https://github.com/hdnkabour-gif/amanzine2/pull/19
- **Do not mark as production-ready unless the latest GitHub CI is all green; mock tests do not prove carrier accepts credentials or parcel creation.**

### Safe live acceptance
1. Merchant opens `/delivery`, chooses API/Advanced → Promo Livraison. Provides secret Token **inside AMANZINE only**, not chat/GitHub. Save; test with *an existing genuine tracking code* on same seller account, without making a parcel.
2. Verify the read-only `action=track` response and matching code. If no existing tracking, report verification inconclusive; do not issue an automatic paid shipment.
3. From `/orders` verify that purchase creates `pending`; approval occurs explicitly; `autoSendOnApproval` defaults false. Select Promo Livraison, not generic webhook.
4. With explicit permission to create a **single real billable carrier parcel** or a sanctioned Promo sandbox, send `action=add` once; match the returned tracking with its presence in the seller dashboard and later track history. Do not repeat on unknown outcome.
5. Capture sanitized response `status` and `msg`, order ID, date, provider type, and whether `tracking` was returned; **never record Token, password, customer phone/address, or session cookies in evidence**.

## Current branch scope
This is QA and code repair on `repair/amanzine-delivery-connection-truth-20261113`; production `main` and the merchant account have not been changed by this report. No actual parcel can be confirmed solely from unit tests or the source-document example.
