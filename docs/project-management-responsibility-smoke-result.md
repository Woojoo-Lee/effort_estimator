# Project Management Responsibility Smoke Result

## Purpose

This document records the Phase 14-B-R and Phase 14-B-Fix-4-R manual smoke
result for separating project lifecycle responsibility from the Standard
Effort estimation screen.

Phase 14-B keeps the estimation screen focused on existing project selection
and Standard Effort work. Project creation, project basic-info editing, and
project archive/restore responsibility are handled by the Project Management
screen.

This smoke result is documentation-only. It does not commit, push, merge to
`main`, tag, or trigger Vercel Production deployment.

## Overall Result

Result: `PASS`

Confirmed as `PASS`:

- Login progress/loading state.
- Estimation screen project creation/edit/save controls are hidden or blocked.
- Existing project selection remains available.
- Standard Effort explicit save path remains available through `공수 저장`.
- Solution toggle, item checkbox, and `actual_effort_mm` edits are draft-only
  until `공수 저장` is clicked.
- Project Management screen owns project creation/editing.
- Project Management screen shows the updater column.
- Admin can archive/restore all projects, including ownerless legacy projects.
- Sales can archive/restore only projects registered by the current sales user.
- Sales non-owner project archive/restore actions are disabled.
- Estimation-screen Standard Effort editability follows the same admin
  override / sales own-only / viewer read-only policy.
- Hard-delete wording is not exposed.
- `sales01` / `viewer01` permission regression checks passed.

No real password, password hash, cookie, session secret, service-role key, DB
password, or Supabase key is recorded in this document.

## Environment

- Branch: `feature/app-auth-row-history`.
- Runtime checked by user: local Vercel dev.
- Production deploy: not performed.
- Git commit/push/tag/main merge: not performed.

## Login Progress Smoke

Status: `PASS`

Confirmed:

- Login progress state is visible after submitting credentials.
- Login button is disabled while login is pending.
- Login inputs are disabled while login is pending.
- Failed login re-enables the button and inputs.

## Estimation Screen Project Lifecycle Controls

Status: `PASS`

Confirmed:

- New project creation CTA is not exposed from the estimation screen.
- Project name cannot be directly edited from the estimation screen.
- Project payload save controls are not exposed from the estimation screen.
- Project Management link/button was not visible in the manually checked
  estimation header.
- Print button was not visible in the manually checked estimation header.
- Excel download remains visible.
- Standard Effort refresh remains visible.
- Existing project selection remains available.

Policy:

- The estimation screen is treated as an existing-project selection and
  Standard Effort draft/save surface.
- Project creation and project basic-info editing belong to Project Management.

## Standard Effort Save Path Regression

Status: `PASS`

Confirmed:

- Solution toggle remains available according to the current role policy.
- Item checkbox draft changes remain available according to the current role
  policy.
- `actual_effort_mm` draft changes remain available according to the current
  role policy.
- `공수 저장` is the only Standard Effort persistence action from the
  estimation screen.
- Excel download remains available.

Unchanged:

- Standard Effort calculation logic.
- Standard Effort save payloads.
- Row history logic.
- Auth role policy.

## Project Management Screen Responsibility

Status: `PASS`

Confirmed:

- Project creation UI is visible in Project Management.
- Project editing is possible in Project Management.
- Project lifecycle responsibility is separated from the estimation screen.
- The updater column is visible.
- The updater value follows display-name / login-id fallback behavior.

Metadata policy:

- Project create/update/archive/restore writes an updater snapshot in project
  payload metadata when the current app-auth user is available.
- The recorded snapshot is limited to updater identifiers suitable for
  operational review.
- No password, password hash, cookie, session secret, or service-role key is
  recorded.

## Archive / Restore Owner Policy

Status: `PASS`

Confirmed:

- `admin01` can archive/restore own projects.
- `admin01` can archive/restore projects owned by another user.
- `admin01` can archive/restore owner-unknown projects.
- `sales01` can archive/restore projects registered by `sales01`.
- `sales01` cannot archive/restore projects registered by another user.
- Owner-unknown projects are editable for admin but not treated as owned by
  sales users.
- Hard-delete behavior is not exposed.
- Hard-delete-looking copy is not visible.

Policy:

- Admin has an all-project override.
- Sales remains own-project only.
- Viewer remains read-only.
- Current selected status does not by itself block archive/restore.

## Estimation Screen Owner Policy

Status: `PASS`

Confirmed:

- `admin01` can edit solution toggle, item checkbox, and `actual_effort_mm` on
  all checked projects.
- `sales01` can save solution toggle and item checkbox on projects registered
  by `sales01`.
- `sales01` sees solution toggle and item checkbox read-only on projects owned
  by another user.
- `sales01` still sees `actual_effort_mm` as read-only.
- `viewer01` remains read-only and cannot save.

## Sales / Viewer Regression

Status: `PASS`

Confirmed:

- `sales01` permission regression check passed.
- `viewer01` permission regression check passed.
- Existing role policy remains unchanged.
- Hard-delete or delete-looking wording remains absent.

## Security Notes

- Passwords are not recorded.
- Password hashes are not recorded.
- Cookie values are not recorded.
- `APP_AUTH_SESSION_SECRET` is not recorded.
- `SUPABASE_SERVICE_ROLE_KEY` is not recorded.
- Service-role key remains server-only and must not use a `VITE_` prefix.

## Test / Build

Phase 14-B-Fix-4-R is docs-only, so automated test/build was not re-run in this
turn.

Latest automated gate before this manual smoke:

- Targeted tests: `PASS`, 7 files / 253 tests.
- Full tests: `PASS`, 58 files / 884 tests.
- Build: `PASS`, Vite large chunk warning only.
- `dist/index.html`: restored after build.

## Next Smoke Candidate

Before the next RC gate or scheduled Production release, spot-check:

1. A newly created admin project still records updater metadata after update.
2. A newly created sales project still records updater metadata after update.
3. `sales01` cannot edit another user's Standard Effort selections.
4. `viewer01` cannot save.
5. No hard-delete wording appears.
