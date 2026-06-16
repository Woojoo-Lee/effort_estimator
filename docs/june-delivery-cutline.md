# June Delivery Cutline

## Purpose

This document fixes the remaining June delivery cutline after the
`feature/app-auth-row-history` release candidate reached `PASS`.

The goal is to protect the current stable release candidate, avoid extra churn,
and decide what can still be added before the end-of-June sign-off.

This phase does not change source code, commit, push, merge to `main`, tag, or
deploy to Vercel Production.

## Current Completed State

Completed and verified for the June Supabase-mode path:

- Supabase-mode Standard Effort calculation, read, and save paths.
- Project-level solution selection.
- Project-level item checkbox save.
- `actual_effort_mm` save and read.
- Standard Effort refresh.
- Standard Effort meta management.
- Base effort and coefficient meta save/restore flows.
- Standard Effort Excel export.
- ID/password app login with no email login.
- `admin` / `sales` / `viewer` role-based frontend UI permissions.
- `sales` cannot edit `actual_effort_mm`.
- `viewer` is read-only.
- Minimum row history responsibility tracking with business table
  `updated_by` / `updated_at`.
- Admin-manual password reset policy.
- `feature/app-auth-row-history` Release Candidate gate: `PASS`.
- Local Vercel dev smoke: `PASS`.

## Required For End Of June

The June must-have scope is now limited to stabilizing and releasing the current
release candidate:

1. Keep the current release candidate stable.
2. Merge `feature/app-auth-row-history` to `main` only during the scheduled
   release window.
3. Run Production smoke after Vercel deploy:
   - Login screen.
   - `admin01` login and Standard Effort meta access.
   - `sales01` login, Standard Effort use, item checkbox save, and
     `actual_effort_mm` read-only behavior.
   - `viewer01` login and read-only behavior.
   - Standard Effort save/read smoke.
   - Standard Effort Excel export smoke.
4. Confirm no real secret, password, password hash, cookie, service-role key, or
   DB password is committed or documented.
5. Keep sign-off documents aligned with the deployed release.

## Optional Before End Of June

Do only if time remains and the release candidate is not destabilized:

- Meta base effort row history smoke.
- Logged-in user password change design only.
- Operator guide / demo checklist for users.
- Read-only `updated_by` join SQL or view candidate documentation.

Optional work should not block release if the current release candidate remains
healthy.

## Excluded From June

The following are explicitly out of the June delivery cutline:

- Logged-in user password change implementation.
- User and permission management screens.
- Detailed `app_audit_logs` event history.
- `before_json` / `after_json` change payloads.
- Backend authoritative audit.
- Internal PostgreSQL / Tomcat API production cutover.
- Internal framework integration.
- Server-side recalculation.
- Active toggle row history smoke.
- UUID to sequence/int user ID redesign.

## Stabilization Freeze

Avoid touching these areas unless a blocking bug is found:

- Standard Effort calculation logic.
- Standard Effort Excel export.
- Role permission policy.
- App auth login/session behavior.
- Row history save paths.
- Vercel env structure.
- Supabase mode repository behavior.

The release candidate is already good enough for the scheduled release path.
Additional changes should be documentation, smoke evidence, or truly blocking
fixes.

## Commit And Deploy Batching

Operating policy:

- Feature branch commits should happen once per day or by meaningful work
  bundle.
- `main` merge should happen one or two times per week.
- Vercel Production deploy should happen with `main` merge only.
- Hotfix exceptions are limited to operating breakages:
  - Login unavailable.
  - Permission behavior reversed or unsafe.
  - Save actions unavailable.
  - Excel export unavailable.
  - Production deployment/runtime failure.

Do not use the hotfix path for documentation, optional smoke, UX polish, or
convenience features.

## Recommended Next Work

Priority order:

1. Prepare the scheduled release for `feature/app-auth-row-history`.
2. Finalize the operator guide and demo checklist.
3. Run meta base effort row history smoke if it can be done safely.
4. Keep Phase 11-PW-1 logged-in user password change behind the release line.

## Current Release Candidate Status

- Branch: `feature/app-auth-row-history`.
- RC gate: `PASS`.
- Local Vercel dev smoke: `PASS`.
- `meta base effort` row history smoke: `PENDING`, not release-blocking.
- Active toggle row history smoke: `SKIP`, not release-blocking.
- `main` / Vercel Production deployment: not performed in this phase.
