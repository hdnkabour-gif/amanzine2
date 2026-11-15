# AMANZINE — Consolidation candidate (2026-11-15)

## Sources merged
- `main` at `f47ba4702945842ea1aa022b9820a74056b1c3b6`: human-reviewed field visits, optional external extractor, existing security gates.
- `staging/pre-production` at `236dec37217cc64e1f74b6daf43000cddd49f376`: knowledge improvements, need engine, order idempotency and timeline, delivery connectors, OTP and verification, database migration and regression tests.
- The order timeline API definitions were merged into `src/services/api.ts` while preserving `visitUnderstand` from main.
- Audit and lexicon reports were regenerated from the integrated tree with CI's Node environment.

## Explicitly preserved
- No production deployment has been made from this candidate.
- No database migration or destructive operation has been performed against live Railway production.
- Historical branches and the staging and production PostgreSQL volumes remain unchanged.

## Release gate
1. PR CI: React/Vite build, brain, constitution, knowledge, architecture freshness and real PostgreSQL server tests.
2. Fault/sabotage matrix, Chromium Golden Journeys and TypeScript typecheck.
3. Staging deployment must use precisely the approved candidate SHA; verify /api/health and smoke tests without creating real shipments or payments.
4. Review remaining unimplemented concepts and external integrations separately; their presence in source code does not prove they work in production.

## Regression found by browser tests
The sabotage test recreates the disposable PostgreSQL schema. A browser journey exposed its missing post-test index; the runner now resets and migrates the CI-only schema before browser tests. This change does not run against any Railway database.
