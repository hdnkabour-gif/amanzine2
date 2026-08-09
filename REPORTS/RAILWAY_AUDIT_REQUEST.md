I have upgraded this Railway project to the Hobby plan.

I need a COMPLETE PRODUCTION READINESS AUDIT.

**AUDIT ONLY. Do NOT change, restart, redeploy, migrate, rename, or delete anything.**
Inspect the actual project and report what you find. Do not give generic Railway advice
when real project data is available. If something cannot be verified from Railway, say
**"NOT VERIFIED"** — do not assume it is correct. Never print secret values; report
variable **names** and whether they look correctly configured.

Project: **AMANZINE** · Repo: `hdnkabour-gif/amanzine2`
Node/Express API + React (Vite) frontend + PostgreSQL.
**The Express server also serves the built frontend (`express.static(dist)` + SPA
fallback), so frontend and API are expected to be the SAME service and SAME origin.**

---

## A. TEN SPECIFIC CHECKS — please answer these FIRST, each with evidence

These come from real defects measured in this codebase. They matter more to me than a
generic report.

**A1. How many services serve HTTP?**
I expect exactly ONE web service (it serves both the UI and `/api`) plus PostgreSQL.
If the frontend is deployed as a SEPARATE service on a different domain, tell me
immediately — the frontend calls the API at `window.location.origin + '/api'`, so a
split deployment would break every API call in production. List every service and its
public domain.

**A2. Is `NODE_ENV` exactly `production` on the web service?**
Auth cookies are issued with `secure: prod` where `prod` is derived from `NODE_ENV`.
If `NODE_ENV` is not `production`, session cookies are sent WITHOUT the `Secure` flag
over HTTPS. Confirm the exact value.

**A3. Is `JWT_SECRET` set, and is it stable across deployments?**
Two consequences: (a) the server refuses to start / auth breaks without it;
(b) `SECRETS_KEY || JWT_SECRET` is used to encrypt merchant secrets **at rest** in the
database. **If this value ever changes, previously stored merchant secrets become
permanently unreadable.** Confirm it is set, and tell me whether Railway has changed or
regenerated it at any point.

**A4. Is `SECRETS_KEY` set separately?**
If not, encryption falls back to `JWT_SECRET` — meaning rotating the JWT secret would
destroy stored secrets. Tell me if `SECRETS_KEY` exists as its own variable.

**A5. What is the healthcheck path and how does Railway evaluate it?**
`GET /api/health` returns **HTTP 200 even when the body says `"status": "degraded"`**
(no `DATABASE_URL`, or a failed migration). So a service with a broken database can
look HEALTHY to Railway. Tell me: the configured healthcheck path, timeout, and whether
Railway inspects only the status code. Then tell me the CURRENT body of `/api/health`
in production — specifically `status` and `migration.ok`.

**A6. Are `ADMIN_EMAILS` / `PLATFORM_ADMIN_EMAIL` / `ADMIN_EMAIL` set?**
Platform-admin pages (Knowledge Centre, moderation, field visits) are gated by email.
The code denies platform admin to EVERYONE when none of these is set and
`NODE_ENV=production`. If none is set, the owner is locked out of his own admin pages
in production. Report which of the three exists (names only).

**A7. Which exact commit is deployed right now?**
The repo has had many recent commits. Give me the deployed commit SHA and its message,
the branch, and whether auto-deploy is on. Do not assume it matches `main` HEAD —
verify.

**A8. Does PostgreSQL have a persistent volume, and where is the data?**
The logs show a volume mount and a normal crash-recovery cycle
(`database system was not properly shut down; automatic recovery in progress` →
`redo done` → `ready to accept connections`). **Please confirm explicitly that this is
routine restart recovery and NOT data loss or corruption.** Also: volume size, current
usage, and what backup / PITR is actually available to me on Hobby.

**A9. Does the app depend on the local filesystem for anything that must survive a
redeploy?** Uploaded images/media in particular. Tell me what is ephemeral on the web
service, and whether external storage (Cloudinary or similar) is configured.

**A10. Do any logs contain secrets?**
Scan build and runtime logs for leaked tokens, keys, `DATABASE_URL`, or passwords.
Report whether anything sensitive is printed — do not reproduce the values.

---

## B. FULL AUDIT

**1. Plan & quotas** — confirm Hobby is active; list the limits that could affect a
production app; flag any usage/billing/quota concern.

**2. Services** — for each: environment, current deployment + status, health, region,
CPU/RAM allocation and usage, restart & crash history, build/start commands, watch
paths, healthcheck config, public vs private networking, domains, ports, replicas,
volumes. Flag anything duplicated or misconfigured.

**3. PostgreSQL** — health; is the app connected to the right database; is
`DATABASE_URL` correct (name only); are migrations applying safely; connection errors;
restart/recovery events; persistence; volume; backup/PITR available on my plan;
disaster-recovery position; what I should configure before traffic grows.
Distinguish normal recovery from real corruption.

**4. Variables & secrets** — across all services: missing, duplicated, defined on the
wrong service, dev/test values in production, `DATABASE_URL`, frontend/backend URLs,
CORS-related, JWT/auth, cookie config, hCaptcha, delivery-provider credentials,
storage, email, AI keys. **Names only.**

**5. Networking / CORS / domains** — Railway domains, custom domains, HTTPS,
frontend→backend, backend→PostgreSQL, internal networking, allowed origins, any
`localhost` or `127.0.0.1` left in production variables, HTTP/HTTPS mismatch, cookie
domain/security.
*Context:* the app previously had a real CORS failure because the browser called
`http://localhost:3001` directly instead of the same origin. That is now fixed by using
the same origin. **Confirm the production deployment cannot reintroduce it** — i.e. no
variable points the frontend at a different host.

**6. Deployment pipeline** — GitHub connection, deploy branch, auto-deploy, build
process, triggers, failed-deploy history, rollback capability.

**7. Logs** — classify recent errors as: (A) real application defects · (B)
infrastructure/environment · (C) harmless warnings · (D) external dependency failures ·
(E) expected PostgreSQL restart/recovery. Do not treat every warning as a failure.

**8. Resources & performance** — CPU, memory, network, disk, DB resources, spikes,
possible leaks, restart loops, slow startup, slow health checks, timeout risk. What is
safe now and what breaks as traffic grows.

**9. Security** — secrets handling, public services, database exposure, unnecessary
ports, CORS, HTTPS, auth, cookies, environment separation, sensitive data in logs,
publicly reachable internal services, deploy permissions, GitHub↔Railway risks.

**10. Persistence** — which services have volumes, what is ephemeral, where PostgreSQL
data lives, whether media survives redeploy, filesystem dependence, external storage,
what happens to data after redeploy/restart.

**11. Architecture** — draw the ACTUAL architecture (correct my assumption if wrong):

```
User Browser → [Web service: React build + Express API] → PostgreSQL
                         ↘ hCaptcha · storage · delivery APIs · email · AI
```

**12. Domain & HTTPS** — custom domain status, SSL certificate, DNS, redirects,
www/non-www, and whether the API is on the same domain as the UI.

**13. Health checks** — endpoint, expected response, timeout, interval, whether the
database dependency is actually checked, and whether a broken API could appear healthy.
(See **A5** — I believe it currently can.)

**14. Cost on Hobby** — likely usage sources, unnecessary consumption, what could become
expensive, whether the current configuration is reasonable for a small/medium
production app, and what I should monitor. **Do not recommend cost cuts that reduce
reliability.**

---

## C. OUTPUT FORMAT

| AREA | STATUS | SEVERITY | EVIDENCE | RECOMMENDATION |

Use 🟢 HEALTHY · 🟡 WARNING · 🔴 CRITICAL · ⚪ INFORMATION.

Then:
**A.** what is already correct
**B.** what must be fixed immediately
**C.** what to fix before real customers arrive
**D.** what can wait
**E.** what must NOT be changed
**F.** what to monitor

Finish with a **Production Readiness Score (0–100)** and show exactly how you
calculated it.

For every 🔴 finding, give the exact evidence (log line, variable name, deployment id).
Clearly separate **Railway infrastructure problems** from **AMANZINE code problems**.

Again: **AUDIT ONLY. NO CHANGES.**
