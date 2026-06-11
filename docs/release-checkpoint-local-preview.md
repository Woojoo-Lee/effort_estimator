# Release Checkpoint And Local Preview Smoke

## 1. Purpose

This checkpoint records the current deployable frontend state for restricted
internal validation in Supabase mode. It is not a full production cutover
sign-off.

The current deployment target is:

- React/Vite frontend.
- Supabase data backend.
- Standard Effort first-completion workflow.

Tomcat backend production deployment, internal PostgreSQL API mode, permission
enforcement, and audit actor hardening are excluded from this checkpoint.

## 2. Commit And Tag State

Local git verification:

- Branch: `main`.
- Latest commit:
  - `c616138 feat: complete standard effort supabase interim release`
- Tag:
  - `standard-effort-supabase-v1`
- `origin/main`: points to the same commit in local `git log`.
- Working tree before this documentation update: clean.

Phase 11-B note:

- Git log currently shows the latest checkpoint commit above.
- A separate Phase 11-B commit is not visible from the latest local git log
  output.
- This document records the current release checkpoint; create a new commit if
  Phase 11-B documentation or code changes need to be captured after this note.

## 3. Build And Test Result

Latest known frontend gate:

- `npm.cmd run test:run`: PASS after rerun.
  - `49 files / 731 tests passed`.
- `npm.cmd run build`: PASS.
- Vite large chunk warning: non-blocking.

Previous failed run:

- Failure type: Vitest worker startup timeout.
- Representative message: `Failed to start forks worker`.
- Partial result observed before rerun:
  - `41 files / 623 tests passed`.
  - `8 worker errors`.

Interpretation:

- The previous failure is recorded as a worker startup timeout, not a feature
  assertion failure.
- After stopping the dev server and clearing node processes, rerun passed.

## 4. Deployment Mode

Included in this checkpoint:

- React/Vite frontend.
- Supabase mode.
- Standard Effort estimator and meta admin flow.
- Standard Effort Excel export in Supabase mode.
- Supabase Auth login/session skeleton is present in code, but disabled by
  default.

Excluded from this checkpoint:

- Tomcat backend production deployment.
- Internal PostgreSQL API mode.
- `admin` / `sales` / `viewer` permission enforcement.
- Audit actor hardening.
- Internal framework replacement.
- Serverless conversion.

## 5. Environment Matrix

### Stable Restricted Preview

Recommended for the current restricted/internal preview:

```env
VITE_DATA_BACKEND=supabase
VITE_FEATURE_STANDARD_EFFORT=true
VITE_STANDARD_EFFORT_MODE=standard
VITE_FEATURE_STANDARD_EFFORT_META=true
VITE_FRONTEND_AUDIT_MODE=auto
VITE_AUTH_LOGIN_MODE=disabled
VITE_AUTH_PERMISSION_MODE=disabled
```

### Login Skeleton Verification

Use only when manually managed Supabase Auth users are ready:

```env
VITE_AUTH_LOGIN_MODE=supabase
```

Notes:

- `VITE_AUTH_LOGIN_MODE=supabase` verifies the login/session skeleton only.
- Role enforcement is not implemented yet.
- Do not open the app broadly to all sales users before Phase 11-C/D/E.
- Do not document real Supabase URL/key values.
- Do not commit `.env`, `.env.local`, service-role keys, DB passwords, or other
  secrets.

## 6. Local Preview Smoke

Build and preview commands:

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Preview URL:

- `http://127.0.0.1:4173`

Expected initial state:

- With no project selected, Standard Effort data may not be visible.
- Select a project from the project dropdown before checking Standard Effort
  data.

Smoke checklist:

- App enters without runtime error.
- Project list is visible.
- A project can be selected.
- Standard Effort section loads after project selection.
- Solution toggle is visible and can be checked in preview smoke.
- Item checkbox is visible and can be checked in preview smoke.
- `actual_effort_mm` is displayed.
- Refresh action works.
- Excel download works in `standard + supabase` mode.
- Standard Effort meta page opens.
- Feature item/coefficient tab shows the top horizontal scrollbar.
- WFM/right-side coefficient columns are reachable.

## 7. Deployment Procedure

The actual production deployment path is not configured in this checkpoint.

Current deployment reference is local preview only. For a static frontend
deployment, use the generated `dist` folder as the web root artifact.

After running local build for verification, restore generated build files in git
if they are not meant to be committed:

```powershell
git restore -- dist\index.html
```

## 8. Rollback

Frontend rollback options:

- Return to the previous static `dist` backup.
- Check out the previous known-good tag or commit.
- Rebuild and redeploy the previous static frontend artifact.

Backend rollback is outside this checkpoint because Tomcat backend production
deployment is excluded.

## 9. Known Limitations

- Permission enforcement is not implemented.
- `admin` / `sales` / `viewer` role resolver is not implemented.
- Sales `actual_effort_mm` read-only behavior is not implemented.
- Audit actor hardening is not implemented.
- Backend authoritative audit is not implemented.
- Tomcat API DB smoke is deferred.
- Backend DbHealthControllerTest issue must be handled before backend
  deployment work resumes.
- This checkpoint is frontend Supabase mode only.

## 10. Next Phases

- Phase 11-C: `admin` / `sales` / `viewer` role resolver.
- Phase 11-D: screen and action-level permission application.
- Phase 11-E: audit actor hardening.
- Phase 11-DB-0: internal PostgreSQL connection smoke.
