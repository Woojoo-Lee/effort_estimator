# Development And Release Policy

## Purpose

This document defines the branch, verification, and release policy for the
Standard Effort app. The goal is to keep development fast while keeping
Production stable.

`main` is connected to Vercel Production. Feature work should happen on feature
branches, and Production deploys should be collected into regular release
windows instead of being pushed after every phase.

## Branch Policy

### `main`

- Production deployment baseline.
- Do not use for direct feature development.
- Accept changes only through a scheduled release or an operational hotfix.
- Keep as the stable version that can be rolled back or compared against.

### `feature/*`

- Feature development and verification branch.
- Current feature branch: `feature/app-auth-row-history`.
- Local development, `vercel dev`, frontend tests/builds, and Supabase smoke
  checks happen here.
- Remote push is allowed for backup/review.
- Vercel Preview deployments may be created, but they must not affect
  Production.

## Release Cadence

Scheduled Production releases should happen one or two times per week.

Recommended windows:

- Wednesday evening, after a stable release candidate is verified.
- End of weekend work, after test/build and smoke checks pass.

Operational hotfixes are the exception. They may be merged to `main` and
deployed immediately when they address a Production-blocking problem.

## Hotfix Criteria

Immediate Production deployment is allowed for:

- Login unavailable.
- Admin access unavailable.
- `sales` / `viewer` permissions working in the opposite direction from policy.
- Save actions unavailable.
- Excel export unavailable.
- Production white screen.
- Vercel env misconfiguration blocking an operating feature.

Do not use the hotfix path for:

- Documentation updates.
- UX improvements.
- Additional row history smoke documentation.
- Password policy documentation.
- Meta base effort follow-up smoke.
- Convenience features.

## Feature Branch Gate

Before merging a feature branch into `main`, verify the relevant gate:

```powershell
npm.cmd run test:run
npm.cmd run build
```

Required checks:

- Local app smoke or `vercel dev` smoke for the changed area.
- Login/permission smoke when auth or permission behavior changed.
- Supabase SQL smoke when persistence, row history, or export behavior changed.
- `dist/index.html` restored after build if it is modified only as a build
  artifact.
- `.env`, `.env.local`, `.env*`, passwords, password hashes, cookies, service
  role keys, and DB passwords are not staged.
- `git status --short` is reviewed before the release commit.

## Main Merge Gate

Before updating `main`:

- Confirm the feature branch gate is complete.
- Confirm known limitations are documented.
- Confirm no secret-bearing files are included.
- Confirm the release candidate scope is intentional.
- Confirm any manual SQL smoke evidence is documented honestly, including
  `PENDING`, `SKIP`, `WAIVED`, or "exact row evidence not captured" cases.
- Confirm the release is scheduled or qualifies as a hotfix.

## Vercel Production Deploy Gate

After `main` is pushed and Vercel Production deploys:

- Confirm the latest Vercel deployment is `Ready`.
- Confirm the deployed commit hash.
- Open the Production URL with Ctrl+F5 or in a private browser window.
- Confirm the login screen.
- Log in as `admin01`.
- Smoke `sales01` and `viewer01` core permissions when permission behavior
  changed.
- Confirm the Standard Effort estimation screen.
- Confirm Excel download.
- Confirm Standard Effort meta is admin-only.
- Run row history SQL join checks when the release includes row history changes.

## Rollback Policy

Preferred rollback options:

- Roll back to the previous Vercel deployment.
- Roll back to a previous Git tag or known stable commit.
- If the issue is an env mismatch, fix Vercel env and redeploy.

Database rollback policy:

- Prefer forward-fix over destructive rollback.
- Do not run destructive DB rollback during a release unless the impact and
  restore path are explicitly reviewed.

## Env And Secret Policy

- `VITE_*` values are frontend build-time env values.
- Server-only values must not use a `VITE_` prefix.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- `.env`, `.env.local`, and `.env*` must not be committed.
- Local `vercel dev` can differ from Vite dev because it may load a different
  env set. Recheck env assumptions before smoke.
- Never document or commit real passwords, password hashes, cookies, session
  secrets, service role keys, or DB passwords.

## Current Project State

- Current Production branch: `main`.
- Current Production baseline noted for Phase 12-A: `53b23cf`.
- Current feature branch: `feature/app-auth-row-history`.
- Row history and password reset policy changes are being prepared on the
  feature branch.
- Production inclusion should be decided during the next scheduled release
  window.

## Next Work Candidates

- Phase 11-E remaining row history smoke.
- Phase 11-F login, permission, and row history sign-off.
- Release Candidate gate for `feature/app-auth-row-history`:
  [Release Candidate Gate: App Auth Row History](./release-candidate-gate-app-auth-row-history.md).
- Phase 11-PW-1 logged-in user password change.
- Release candidate creation for the next scheduled Production release.
