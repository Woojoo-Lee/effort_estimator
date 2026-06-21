# Release Candidate Gate: App Auth Row History

## Purpose

This document records the release candidate gate for
`feature/app-auth-row-history`. It checks whether the branch can be promoted as
the next scheduled Production release candidate.

The remaining June delivery cutline is tracked in
[June Delivery Cutline](./june-delivery-cutline.md).

This phase does not commit, push, tag, merge to `main`, or trigger Vercel
Production deployment.

## Scope

Included in this gate:

- Working tree review.
- Secret/env file exclusion check.
- Frontend test/build verification.
- Local Vercel smoke checklist.
- `admin` / `sales` / `viewer` permission smoke status.
- Row history smoke status.
- Remaining `PENDING` / `SKIP` items.
- Release Candidate decision.

Excluded from this gate:

- Feature implementation.
- `src/**`, `api/**`, `db/migrations/**`, `backend/src/**`, or package file
  changes.
- Main merge.
- Vercel Production deploy.
- Git commit, push, or tag.

## Branch And Working Tree

- Target branch: `feature/app-auth-row-history`.
- Production branch: `main`.
- Production deploy source: `main`.
- Working tree status during this gate showed docs-only changes.
- `dist/index.html` was modified by `npm.cmd run build` and restored.

Docs changed or added in this gate:

- `docs/release-candidate-gate-app-auth-row-history.md`

Pre-existing docs from the sign-off work remain modified in the working tree:

- `docs/app-auth-login-smoke-result.md`
- `docs/auth-permission-audit-minimum-scope.md`
- `docs/standard-effort-june-report-package.md`
- `docs/standard-effort-june-signoff.md`
- `docs/standard-effort-rollout.md`
- `docs/auth-permission-row-history-signoff.md`

## Secret And Env File Check

`git status --short` did not show `.env`, `.env.local`, `.env*`, package files,
or source/API/DB files as modified or untracked.

No real password, password hash, cookie, session secret, service-role key, DB
password, or Supabase key is recorded in this document.

## Test And Build Result

Commands executed:

```powershell
npm.cmd run test:run
npm.cmd run build
git -c safe.directory=C:/dev/effort_estimator restore -- dist/index.html
```

Results:

- `npm.cmd run test:run`: `PASS`
  - 55 files passed.
  - 787 tests passed.
- `npm.cmd run build`: `PASS`
  - Vite build completed.
  - Large chunk warning only.
- `dist/index.html`: restored after build.

Non-blocking warnings:

- Vite React/Babel deprecation warning for `esbuild` options.
- Vite large chunk warning.
- npm version notice.

## Local Vercel Dev Smoke

Command used for local runtime smoke:

```powershell
npx vercel dev --listen 127.0.0.1:3000
```

Required smoke checklist:

- `admin01` login.
- `admin01` can access Standard Effort meta.
- `sales01` login.
- `sales01` is blocked from Standard Effort meta.
- `sales01` can save item checkbox.
- `sales01` sees `actual_effort_mm` as read-only.
- `viewer01` login.
- `viewer01` cannot save.
- Excel download follows the current viewer/read policy.

Gate status:

- `PASS`

Confirmed result:

- `admin01` login succeeded.
- `admin01` can access Standard Effort meta.
- `sales01` login succeeded.
- `sales01` is blocked from Standard Effort meta.
- `sales01` can use the Standard Effort estimation screen.
- `sales01` can save item checkbox selections.
- `sales01` cannot edit `actual_effort_mm`.
- `viewer01` login succeeded.
- `viewer01` is blocked from Standard Effort meta.
- `viewer01` cannot save.
- No broken screen was observed.
- Email-free ID/password login remains in use.
- `app_login_users` based session/role connection works.

Note:

- Excel download behavior was not separately re-documented in the Phase 12-B-R
  local auth smoke result. Keep it in the Production release smoke checklist.

## Permission Smoke Status

Current documented status from Phase 11-F:

- `admin01`: `PASS`
  - Standard Effort meta access/edit.
  - Estimation screen use.
  - `actual_effort_mm` edit.
- `sales01`: `PASS`
  - Estimation screen use.
  - Solution toggle.
  - Item checkbox save.
  - `actual_effort_mm` read-only.
  - Standard Effort meta blocked.
- `viewer01`: `PASS`
  - Read-only.
  - Save actions unavailable.
  - Standard Effort meta blocked.

Release gate note:

- Local Vercel dev role smoke passed. Re-run the same smoke after Production
  deploy as part of the scheduled release gate.

## Row History Smoke Status

Current documented row history status:

| Path | Result | Operator |
| --- | --- | --- |
| `actual_effort_mm` save | `PASS` | `admin01` |
| Solution toggle save | `PASS` | `admin01` |
| Item checkbox save | `PASS` | `sales01` |
| Meta coefficient save/restore | `PASS` | `admin01` |
| Meta base effort save/restore | `PENDING` | Not confirmed |
| Meta active toggle save/restore | `SKIP` | Optional safe-restore smoke |

Policy:

- Detailed `app_audit_logs` event history remains out of scope.
- No `before_json` / `after_json`.
- `updated_by` remains the UUID `user_id`.
- Human-readable checks use joins to `app_login_users`.

## Pending Or Skipped Items

`PENDING`:

- Meta base effort row history smoke.

`SKIP`:

- Meta active toggle row history smoke, unless a safe restore path is prepared.

Deferred beyond this release candidate:

- Internal PostgreSQL / Tomcat API production cutover.
- Backend authoritative audit.
- Detailed event audit log.
- Full user/password administration beyond the admin-only role/active MVP.
- Server-side recalculation.

Implemented after the original RC gate:

- Logged-in user password change is implemented in Phase 13-B.
- Phase 13-B-R local API validation smoke and Phase 13-B-R-Manual-2 browser
  smoke are recorded in
  [Password Change Smoke Result](./password-change-smoke-result.md).
- Password change smoke is `PASS`: `viewer01` changed the password, returned to
  LoginPage, re-logged in with the changed password, confirmed the old password
  no longer worked, retained viewer permissions, restored the original
  password, and re-logged in successfully.
- No plaintext password, password hash, cookie, session secret, or service-role
  key is recorded.
- Admin-only user management MVP is implemented in Phase 13-C-1. Manual browser
  smoke is recorded in
  [User Management Smoke Result](./user-management-smoke-result.md).
- User management smoke is `PASS`: admin access, safe field display,
  self-lock/self-role-change guards, `viewer01` role update/restore,
  `viewer01` active lock/unlock with restore, and sales/viewer access blocking
  are confirmed.
- Admin-only codebook management MVP is implemented in Phase 13-D-1. Manual
  browser smoke is recorded in
  [Codebook Management Smoke Result](./codebook-management-smoke-result.md).
- Codebook management smoke is `PASS`: admin access, compact UI, active-state
  search select, code type/code active-state selects, left-aligned name columns,
  center-aligned number/ID/active columns, active-state save, password/hash/email
  non-exposure, hard-delete wording absence, sales/viewer access blocking, and
  hard-coded auth resolver retention are confirmed.
- The `common_code` physical schema remains unchanged. The codebook screen
  simplifies only the UI and payload surface for the June MVP.
- Phase 14-A is a low-risk UI polish pass only: menu labels, login/account
  wording, access-denied wording, user/codebook/project management text, and
  visible empty/loading states are normalized without changing save payloads,
  auth policy, row history, or standard effort calculation behavior.
- Phase 14-A-R-Manual UI polish smoke is recorded in
  [UI Polish Smoke Result](./ui-polish-smoke-result.md). The local HTTP entry
  check and manual browser checks are `PASS` for LoginPage, `admin01`,
  `sales01`, `viewer01`, user management, codebook management, project
  management, Standard Effort meta, AccessDenied, and screen breakage /
  horizontal-scroll review.
- Phase 14-B separates project lifecycle responsibility from the estimation
  screen. Manual browser smoke is recorded in
  [Project Management Responsibility Smoke Result](./project-management-responsibility-smoke-result.md).
  The Phase 14-B-Fix-4-R smoke is `PASS`: the Project Management updater
  column is visible, updater display-name / login-id fallback works, admin can
  archive/restore own, other-owned, and owner-unknown projects, sales can
  archive/restore only projects registered by the current sales user, sales
  non-owner archive/restore is disabled, admin can edit Standard Effort values
  on all projects, sales can save solution/item only on own projects,
  `actual_effort_mm` remains read-only for sales, viewer remains read-only, and
  hard-delete wording is absent.

## Release Candidate Decision

Decision: `PASS`

Rationale:

- Frontend test/build passed.
- Working tree is docs-only for this gate.
- Secret/env files are not shown in `git status --short`.
- Login, permission, and row history sign-off has been documented.
- Local Vercel dev browser smoke passed for `admin01`, `sales01`, and
  `viewer01`.
- Remaining row history `PENDING` / `SKIP` items are documented and do not block
  this release candidate.
- Phase 14-B-Fix-4-R confirms the admin all-project / sales own-project
  archive/restore and estimation edit policy as `PASS`.

Release condition:

- This branch can be treated as the next scheduled release candidate.
- Do not merge to `main` or deploy to Vercel Production outside the scheduled
  release path or an approved hotfix.
- Re-run the Production smoke checklist after deployment.

## No Release Action

This gate does not perform:

- `git commit`
- `git push`
- `git tag`
- `main` merge
- Vercel deploy
