# Release Candidate Gate: App Auth Row History

## Purpose

This document records the release candidate gate for
`feature/app-auth-row-history`. It checks whether the branch can be promoted as
the next scheduled Production release candidate.

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

Command to run before `main` merge:

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

- `PENDING`

Reason:

- This phase documented the gate and ran frontend test/build.
- Manual browser login smoke through local Vercel runtime was not executed in
  this phase.

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

- Re-run the role smoke in local Vercel dev or Preview/Production target before
  merging to `main`.

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

- Local Vercel dev manual browser smoke for this release candidate.
- Meta base effort row history smoke.

`SKIP`:

- Meta active toggle row history smoke, unless a safe restore path is prepared.

Deferred beyond this release candidate:

- Internal PostgreSQL / Tomcat API production cutover.
- Backend authoritative audit.
- Detailed event audit log.
- User and permission management screens.
- Logged-in user password change.
- Server-side recalculation.

## Release Candidate Decision

Decision: `PARTIAL`

Rationale:

- Frontend test/build passed.
- Working tree is docs-only for this gate.
- Secret/env files are not shown in `git status --short`.
- Login, permission, and row history sign-off has been documented.
- Local Vercel dev browser smoke is still pending and must be completed before
  merge to `main` / Vercel Production deployment.

Promotion condition:

- Move from `PARTIAL` to `PASS` after local Vercel dev or target Preview smoke
  confirms `admin01`, `sales01`, `viewer01`, Standard Effort meta access rules,
  save restrictions, and Excel download behavior.

## No Release Action

This gate does not perform:

- `git commit`
- `git push`
- `git tag`
- `main` merge
- Vercel deploy
