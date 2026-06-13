# Auth, Permission, And Audit Actor Minimum Scope

## 1. Purpose

This document fixes the minimum login, permission, and audit actor scope needed
to protect the end-of-June delivery schedule.

Internal framework replacement, serverless conversion, production SSO, and full
Tomcat API cutover are separated into later development. The June target is a
small operating layer on top of the current app and Supabase-mode Standard
Effort workflow.

## 2. Current Decision

Plan A is selected for the June delivery:

- Keep the current React/Vite app.
- Keep `VITE_DATA_BACKEND=supabase`.
- Do not implement SSO for the June delivery.
- Do not replace the internal framework in the June delivery.
- Treat internal PostgreSQL DB conversion as a smoke/stretch track.
- Exclude user and permission management screens from the required June scope.
- Use a small set of manually managed users.
- Add minimum login, role permissions, and audit actor tracking.

## 3. Role Model

The June role model has three roles:

- `admin`
  - Full access for Standard Effort operation, meta management, project work,
    export, and audit review.
- `sales`
  - Sales-facing project and Standard Effort selection work.
  - Can create and edit projects.
  - Can save Standard Effort solution/item selections.
  - Cannot edit `actual_effort_mm`.
  - Cannot access Standard Effort meta admin.
- `viewer`
  - Read-only access.
  - Cannot save project, Standard Effort, meta, or active-state changes.

## 4. Permission Matrix

| Screen or action | admin | sales | viewer |
| --- | --- | --- | --- |
| Project list read | Yes | Yes | Yes |
| Project create | Yes | Yes | No |
| Project save/update | Yes | Yes | No |
| Project archive/restore | Yes | No by default | No |
| Standard Effort section read | Yes | Yes | Yes |
| Solution toggle save | Yes | Yes | No |
| Item checkbox save | Yes | Yes | No |
| `actual_effort_mm` edit | Yes | No | No |
| Standard Effort refresh | Yes | Yes | Yes |
| Excel export | Yes | Yes by default | Yes by read policy |
| Standard Effort meta page access | Yes | No | No |
| Base effort edit | Yes | No | No |
| Coefficient edit | Yes | No | No |
| Active toggle edit | Yes | No | No |
| Audit log read | Yes | No by default | No by default |

Policy notes:

- Sales can save the commercial/scope selections needed during estimation.
- `actual_effort_mm` belongs to the implementation lead/admin management area.
- Viewer can inspect data but cannot mutate it.
- Frontend guards are UX controls in Supabase mode, not a production security
  boundary.

## 5. `actual_effort_mm` Policy

`actual_effort_mm` is managed by the implementation lead or admin role.

- `admin`: can edit and save.
- `sales`: read-only.
- `viewer`: read-only.

UI policy:

- Sales and viewer users see the actual effort value but the input is disabled
  or read-only.
- Save handlers must not run for sales/viewer actual effort edits.
- Admin actual effort updates write audit events with actor information.

Audit event:

- `standard_effort.actual_effort.update`

Required actor fields:

- `actor_user_id`
- `actor_email`

## 6. Login Method

SSO is not part of the June required scope. The login method is the app-managed
ID/password flow.

Selected model:

- `VITE_AUTH_LOGIN_MODE=app`
- Full-screen login page.
- Login form uses `login_id` and password only.
- No email or pseudo-email login identifiers.
- Password verification happens only in server-side Vercel Functions.
- User creation remains manual SQL work for June.
- User and permission management screens are excluded from the required June
  scope.

Server endpoints:

- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`

Server-only env:

```env
APP_AUTH_SESSION_SECRET=<random-long-secret>
SUPABASE_URL=<server-only-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

Do not use a `VITE_` prefix for service-role secrets. Real secret values must
not be committed or documented.

`app_login_users` table proposal:

```sql
create table public.app_login_users (
  user_id uuid primary key default gen_random_uuid(),
  login_id text unique not null,
  display_name text not null,
  role_code text not null check (role_code in ('admin', 'sales', 'viewer')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

The existing `public.app_users` table is the auth/profile table with an email
column. It is not used for ID/password app auth. Do not alter, drop, rename, or
populate it with pseudo email values for this flow.

The executable migration and setup guide are:

- `db/migrations/20260613002000_add_app_login_users.sql`
- [App Auth User Setup](./app-auth-user-setup.md)

Password hash policy:

- Use server-side Node `crypto` PBKDF2 hash strings.
- Current format: `pbkdf2$sha256$<iterations>$<salt>$<hash>`.
- Do not expose plaintext passwords or password hashes to the frontend.
- Invalid user, inactive user, and password mismatch return the same generic
  login error.

Phase 11-BR-1-Gate local checks:

- `VITE_AUTH_LOGIN_MODE=disabled` or an unset login mode must keep the existing
  app entry path available without login.
- `VITE_AUTH_LOGIN_MODE=app` without a valid session must show only the
  full-screen login page.
- The app-mode login screen must not show the sidebar, menu, or header.
- The login form must use user ID and password inputs. It must not show email
  wording, and the input type must not be `email`.
- When an app session is present, the main application layout is shown and the
  session `role_code` / `role_codes` values feed the existing
  `admin` / `sales` / `viewer` permission resolver.
- Session payloads must not expose plaintext passwords or `password_hash`.

Vercel Function smoke status:

- Unit tests cover the app-auth repository and `/api/auth/login`,
  `/api/auth/session`, and `/api/auth/logout` handler behavior.
- End-to-end Vercel Function smoke can be `BLOCKED` or `SKIP` until the
  `app_login_users` table, manually created `admin` / `sales` / `viewer`
  accounts, `APP_AUTH_SESSION_SECRET`, `SUPABASE_URL`, and
  `SUPABASE_SERVICE_ROLE_KEY` are present in the target environment.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must be stored only in Vercel
  Environment Variables and must never use a `VITE_` prefix.

Phase 11-BR-2 preparation:

- Adds the `app_login_users` schema migration with RLS enabled and no public
  frontend read policy.
- Adds `scripts/generateAppUserPasswordHash.mjs` for PBKDF2 hash generation.
- Documents manual `admin01` / `sales01` / `viewer01` setup with placeholders
  only.
- Keeps login E2E smoke as a Daily Release/runtime step after Vercel env and
  `app_login_users` rows are ready.

Phase 11-BR-3 smoke tracking:

- [App Auth Login E2E Smoke Result](./app-auth-login-smoke-result.md) records
  the Supabase `app_login_users`, Vercel env, login UI, and role smoke
  checklist.
- Current result is `BLOCKED` until the target environment has
  `app_login_users` rows, server-only Vercel env values, and a Daily Release
  deployment.
- Actual password values, password hashes, session secrets, and service-role
  keys remain excluded from source-controlled docs.

Phase 11-BR-2-Fix table separation:

- `public.app_users`: existing auth/profile table. Not used for app auth.
- `public.app_login_users`: dedicated ID/password app-auth table.
- App auth must not use email or pseudo email identifiers.

## 7. Audit Actor Policy

All save events should include actor identity where available.

Target events:

- `project.create`
- `project.update`
- `standard_effort.solution.toggle`
- `standard_effort.item.check`
- `standard_effort.actual_effort.update`
- `standard_effort_meta.base_effort.update`
- `standard_effort_meta.coefficient.update`
- `standard_effort_meta.active.update`

June policy:

- Frontend/Supabase mode records actor metadata through existing non-blocking
  audit paths.
- Audit failure must not block business save success.
- Actor-less legacy audit rows may remain in the database.
- New rows should include actor identity after the minimum auth implementation.

Post-June policy:

- Tomcat API/backend becomes authoritative for audit.
- Frontend audit is disabled or shadowed in API mode according to
  `VITE_FRONTEND_AUDIT_MODE`.

## 8. Implementation Order

### Phase 11-B

- Define auth user/session model.
- Add login page skeleton.
- Add current user provider.

Status: replaced by the ID/password app-auth flow in Phase 11-BR-1.
`VITE_AUTH_LOGIN_MODE` defaults to `disabled`, so the existing app remains
available without login unless `VITE_AUTH_LOGIN_MODE=app` is explicitly set.
`VITE_AUTH_LOGIN_MODE=supabase` is deprecated and maps to app login rather than
Supabase Auth email login.

### Phase 11-C

- Add role and permission mapping.
- Add `admin` / `sales` / `viewer` permission resolver.
- Apply route, menu, and button guards.

Status: role and permission mapping plus pure resolver utilities are
implemented. Route, menu, button, and read-only application is handled in
Phase 11-D.

### Phase 11-D

- Make Standard Effort meta admin editable only by `admin`.
- Make `actual_effort_mm` read-only for `sales`.
- Make the app globally read-only for `viewer`.

Status: implemented as frontend UX guards for the Supabase-mode June path.
The Standard Effort meta route/sidebar entry is role-filtered, sales can keep
solution/item selection workflows while `actual_effort_mm` is read-only, and
viewer write actions are disabled. These guards are not a production security
boundary; backend/API permission enforcement remains a later operating target.

### Phase 11-E

- Add audit actor fields to save audit payloads.
- Verify `actor_email` and `actor_user_id` in SQL smoke.

### Phase 11-F

- Run browser smoke for `admin`, `sales`, and `viewer`.
- Update June sign-off/report documents.

### Separate Stretch Track: Phase 11-DB-0

- Run internal PostgreSQL DB health and schema smoke.
- Keep this separate from the June minimum delivery gate.

## 9. Internal DB, Serverless, And Apache/Tomcat Decision

- Apache + Tomcat is not required for the June completion gate.
- Spring Boot standalone execution remains possible for backend smoke.
- Serverless conversion is excluded from the June scope.
- Internal DB conversion is a smoke/stretch track, not a delivery blocker.
- Internal framework replacement is second-phase development.

## 10. Risks And Controls

- Risk: frontend guards are mistaken for production security enforcement.
  - Control: document them as Supabase-mode UX controls only.
- Risk: actor-less legacy audit rows mix with new actor-bearing rows.
  - Control: record the transition date and include actor fields for new saves.
- Risk: sales can edit `actual_effort_mm` by mistake.
  - Control: centralize permission checks and smoke sales read-only behavior.
- Risk: direct meta admin route access bypasses menu hiding.
  - Control: enforce route-level admin checks.
- Risk: adding user management screens expands June scope.
  - Control: keep user creation manual for June.
- Risk: making internal DB cutover a completion condition threatens schedule.
  - Control: keep DB smoke as a separate stretch track.

## 11. Updated June Completion Criteria

The updated June completion criteria are:

- Supabase-mode Standard Effort functionality complete.
- Minimum login, role permission, and audit actor support included.
- Internal DB conversion excluded.
- Tomcat API production cutover excluded.
- Serverless conversion excluded.
- Internal framework replacement excluded.
