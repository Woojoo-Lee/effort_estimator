# Production Release Sign-Off 2026-06

## Purpose

This document records the June first Production handoff state for the Standard
Effort operation app. It summarizes what is in Production, what was smoked,
what remains non-blocking, and how to roll back if an operating issue appears.

No source code, database migration, package file, env file, commit, push, tag,
main merge, or Vercel deploy is performed by this documentation phase.

## Production Release Status

Status: `PASS`

- The June first feature scope based on `feature/app-auth-row-history` has been
  reflected in Production.
- Production login had an initial operating issue.
- The issue was resolved by reviewing and correcting Vercel Production env
  configuration, then redeploying Production.
- Production login smoke passed after the redeploy.
- Secret values, passwords, password hashes, cookies, session secrets, service
  role keys, and DB passwords are intentionally not recorded.

Latest known gate before Production handoff:

- `npm.cmd run test:run`: `PASS`, 58 files / 892 tests passed.
- `npm.cmd run build`: `PASS`.
- Vite large chunk warning only.
- `dist/index.html` remains a build artifact and must not be committed.

## Included In June First Production

- ID/password app auth.
- Full-screen LoginPage.
- Global account bar and logout.
- Logged-in user password change.
- `admin` / `sales` / `viewer` role policy.
- Admin-only user and role management.
- Admin-only codebook management.
- Project management responsibility split from the estimation screen.
- Project soft archive / restore.
- Admin all-project control.
- Sales own-project edit/archive policy.
- Viewer read-only policy.
- Compact Standard Effort estimation UI.
- Standard Effort last updated time and updater display.
- Standard Effort calculation/read/save.
- Solution toggle save.
- Item checkbox save.
- `actual_effort_mm` save for admin.
- Explicit `공수 저장` button for Standard Effort changes.
- Solution toggle, item checkbox, and `actual_effort_mm` edits remain local
  draft changes until `공수 저장` is clicked.
- Standard Effort Excel download.
- Standard Effort meta management.
- Minimum row-history responsibility tracking with business table
  `updated_by` / `updated_at`.
- Footer broken-string cleanup.

## Production Smoke Summary

Current Production smoke status: `PASS`

- `admin01` login: `PASS`.
- `sales01` login: `PASS`.
- `viewer01` login: `PASS`.
- Admin full management/edit path: `PASS`.
- Sales own-project solution/item save: `PASS`.
- Sales non-owner project read-only behavior: `PASS`.
- Sales `actual_effort_mm` read-only behavior: `PASS`.
- Viewer read-only behavior: `PASS`.
- User management admin access and sales/viewer block: `PASS`.
- Codebook management admin access and sales/viewer block: `PASS`.
- Project archive/restore policy: `PASS`.
- Broken footer text removed: `PASS`.
- Secret/password/hash exposure check: `PASS`.

## Phase 15-HF-1 Hotfix Note

Status: `READY FOR HOTFIX VALIDATION`

Production users found that Standard Effort edits were persisted immediately on
solution toggle, item checkbox, and `actual_effort_mm` edit/blur. The hotfix
changes the operating model to explicit save:

- Users can make multiple Standard Effort changes locally.
- The screen shows `저장되지 않은 변경사항이 있습니다.` while draft changes are
  unsaved.
- `공수 저장` persists solution selections, item selections, and
  `actual_effort_mm`.
- Row history updates at the `공수 저장` click time, not at each checkbox/input
  change.
- A successful `공수 저장` clears the dirty indicator and leaves only the
  success message.
- Failed saves keep the draft dirty so the user can retry.
- Project creation/edit/archive responsibility remains in Project Management.

Detailed repeatable smoke steps are maintained in
[Production Smoke Checklist](./production-smoke-checklist.md).

## Known Non-Blocking Items

- Meta base effort row history smoke: `PENDING`, non-blocking.
- Active toggle row history smoke: `SKIP`, non-blocking.
- Vite large chunk warning: non-blocking.
- Some React/Vitest act warnings may appear in existing error-path tests:
  non-blocking when final tests pass.
- Backend Maven `DbHealthControllerTest` issue is non-blocking for the current
  Vercel frontend/API functions operating path. It must be handled before any
  internal Tomcat/Jenkins backend deployment.
- `common_code` / codebook management is intentionally simplified for the June
  MVP. Code category hierarchy, parent-code logic, and ETC expansion remain
  follow-up work.
- Detailed `app_audit_logs` event history, `before_json`, and `after_json`
  payloads are not part of the June Production scope.

## Rollback Criteria

Use rollback or hotfix action when Production has one of these operating
failures:

- Login unavailable.
- Permission behavior is reversed or unsafe.
- Save actions unavailable.
- Standard Effort Excel download unavailable.
- Production blank page.
- Required Vercel env missing or misconfigured.

Preferred rollback order:

1. Roll back to the previous Vercel Production deployment.
2. If the issue is env-only, correct Vercel Production env and redeploy.
3. Use a Git tag or known stable commit only if deployment rollback is not
   enough.
4. Avoid destructive DB rollback. Prefer forward-fix for data/schema issues.

## Operating Env And Secret Rules

- `VITE_*` values are frontend build-time env values.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- `APP_AUTH_SESSION_SECRET` is server-only.
- `VITE_SUPABASE_ANON_KEY` must use only the publishable/anonymous key.
- Never document real passwords, password hashes, cookies, session secrets,
  service role keys, DB passwords, or private env values.
- Do not commit `.env`, `.env.local`, `.env*`, `.vercel`, or `dist/index.html`.

## Executive Demo Link

The representative executive demo flow is tracked in
[Executive Demo Scenario 2026-06](./executive-demo-scenario-2026-06.md).

## Decision

June first Production handoff decision: `PASS`

The app is acceptable for controlled June first operation and executive demo,
with the non-blocking items above carried into follow-up phases.
