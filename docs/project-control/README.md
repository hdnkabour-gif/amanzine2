# AMANZINE — Project Control

Documentation bootstrap: 2026-11-24. Observed main baseline: `cb7c87c2800040bfe5e09c68c43cd1281f1cbf57`. This is a source-control reference only; it does not certify CI, deployment, production readiness or data acceptance.

## Read before work

- Read existing README, architecture, ADRs, tests, issues, open PRs and relevant project-control records. Existing verified evidence must not be discarded. The owner's authorized Project Control Center contains the private historical migration; ask the owner for scoped access or a redacted handoff if required. Do not copy private history into a public repository.
- Keep order and delivery lifecycles consistent; external operations require idempotency or reconciliation when results are uncertain. Prefer existing audit and architecture documentation.
- Use one owner per task; coordinate with other agents before editing overlapping files. Do not start a duplicate fix while another PR is active. Use small scoped branches and a distinct reviewer where practical.

## Record format

Maintain a single entry per stable ID, link related entries instead of duplicating them. Extend this directory only when needed; reference existing ADRs and test reports rather than replacing them.

| Record | Required fields |
|---|---|
| Decision D-xxx | date, context, decision, alternatives, constraints, source, supersedes |
| Feature F-xxx | objective, role, acceptance criteria, dependencies, state, issue/PR |
| Risk/Bug R-xxx | severity, scope, evidence, reproduction, fix reference, regression test; sensitive details restricted |
| Test T-xxx | exact test/command, commit SHA, CI run or report, environment, result, date, dependencies, invalidation reason |
| Release REL-xxx | approved SHA, main CI, deployment environment and ID, deployed SHA, health/smoke, backup/rollback/restore evidence, acceptance decision |
| Handoff H-xxx | baseline, task owner, scope/non-goals, files/PR, tests reused/run, blockers, next action |

States: PROPOSED / ACCEPTED / IN_PROGRESS / IMPLEMENTED / VERIFIED / BLOCKED / SUPERSEDED. HISTORICAL and NEEDS_VERIFICATION mark evidence quality; a historical pass is not a current pass. Preserve previous evidence and explain invalidation rather than overwriting it.

## Testing and release policy

Reuse prior successful evidence only if the exact tested behavior and relevant code/dependencies/configuration/schema/permissions/environment remain applicable; rerun targeted regression for affected behavior, plus required CI or release gates. Never bypass required checks or assume an old SHA certifies a new one. Every bug fix should include a regression test where feasible. If tests were not executed, say so explicitly.

Separate decisions: code review, merge authorization, deployment authorization, and real-data/business acceptance. Check for automatic deployment before merge. Keep demo and production data separate. Do not change production data or credentials for documentation work. Verify actual deployed SHA and environment, not only build success. No secrets, personal/customer data, internal vulnerability details, or raw documents in public logs, issues or this directory.

## Handoff checklist

1. Exact branch, base/head SHA, issue/PR and scope.
2. Decisions and features changed (stable IDs); review risks and dependencies.
3. Evidence reused, tests run and results; what remains unverified.
4. CI status, merge/deployment status (separately), rollback implications.
5. One next task, with owner and acceptance criteria.

This initial file defines the process; the historical migration is maintained privately and must be reconciled with current repository evidence before any status is marked VERIFIED.
