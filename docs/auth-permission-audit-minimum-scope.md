# Auth, Permission, And Audit Actor Minimum Scope

## 1. Purpose

This document fixes the minimum login, permission, and row history
responsibility scope needed to protect the end-of-June delivery schedule.

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
- Add minimum login, role permissions, and row-level responsibility tracking.

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
- Admin actual effort updates write row history with the session `user_id` when
  available.

Row history policy:

- Admin `actual_effort_mm` saves update
  `estimation_project_solution_selection.updated_by` and `updated_at` when a
  session `user_id` is available.
- `created_by` remains the first creator and must not be overwritten by update
  saves.
- Email, `login_id`, and `display_name` are not written to business table row
  history columns.

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

Phase 11-PW-0 password reset policy:

- Email-based password recovery is not used.
- Users request password reset from an admin operator.
- Admin operators generate a new temporary password, create a PBKDF2 hash with
  `scripts/generateAppUserPasswordHash.mjs`, and update
  `app_login_users.password_hash` manually in Supabase SQL Editor.
- Account locking is handled by setting `app_login_users.active=false`.
- Real passwords, password hashes, session secrets, service-role keys, and
  cookie values must not be recorded.
- See [App Auth Password Reset Policy](./app-auth-password-reset-policy.md).

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
- Release timing, hotfix exceptions, and Production gates follow
  [Development And Release Policy](./development-release-policy.md).

Phase 11-BR-3 smoke tracking:

- [App Auth Login E2E Smoke Result](./app-auth-login-smoke-result.md) records
  the Supabase `app_login_users`, Vercel env, login UI, and role smoke
  checklist.
- Production Daily Release smoke remains pending until the target environment
  has `app_login_users` rows, server-only Vercel env values, and a scheduled
  deployment.
- Actual password values, password hashes, session secrets, and service-role
  keys remain excluded from source-controlled docs.

Phase 11-BR-2-Fix table separation:

- `public.app_users`: existing auth/profile table. Not used for app auth.
- `public.app_login_users`: dedicated ID/password app-auth table.
- App auth must not use email or pseudo email identifiers.

Phase 11-D-Fix-2 permission bridge:

- With `VITE_AUTH_LOGIN_MODE=app` and `VITE_AUTH_PERMISSION_MODE=enabled`,
  the frontend permission layer derives permissions from the app session
  `role_code` / `role_codes`.
- `admin` can access Standard Effort meta routes and meta write permissions.
- `sales` can save Standard Effort solution/item selections but cannot access
  Standard Effort meta or edit `actual_effort_mm`.
- `viewer` remains read-only.

Phase 11-D-Fix-3 Standard Effort write guard split:

- Standard Effort solution selection, item selection, and `actual_effort_mm`
  write guards are handled separately.
- `sales` can trigger solution toggle and item checkbox saves while
  `actual_effort_mm` remains read-only.
- `viewer` cannot trigger solution, item, or actual effort writes.
- `admin` keeps all Standard Effort write paths.
- Permission-disabled mode preserves the previous unrestricted development
  behavior.

## 7. Row History Responsibility Policy

Phase 11-E narrows the June responsibility tracking scope to business table
row history only. Detailed event audit logging is explicitly out of scope for
this phase.

Target save paths:

- Standard Effort solution selection saves.
- Standard Effort item checkbox saves.
- Standard Effort `actual_effort_mm` saves.
- Standard Effort meta base effort saves.
- Standard Effort meta coefficient saves.
- Standard Effort meta active toggles.

June policy:

- Insert-only paths may set `created_by` and `updated_by` from the current
  session `user_id`.
- Update paths set `updated_by` and `updated_at` only.
- Upsert paths do not write `created_by`, because conflict updates could
  overwrite the first creator. Preserving `created_by` across upsert conflicts
  remains a future DB/service refinement.
- If no session `user_id` is available, row history fields are omitted and the
  existing save behavior is preserved.
- Email, `login_id`, and `display_name` are not written to row history.
- `app_audit_logs`, `before_json`, `after_json`, and audit metadata actor
  enrichment are not implemented in Phase 11-E.
- Project table row history is deferred until `estimation_projects` history
  columns are confirmed or added by a future migration.

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

- Add business table row history fields for Supabase-mode Standard Effort and
  Standard Effort meta saves.
- Verify `created_by`, `created_at`, `updated_by`, and `updated_at` semantics
  where columns exist.
- Keep detailed `app_audit_logs` event history out of scope.

Status: implemented for Standard Effort and Standard Effort meta Supabase save
paths.

### Phase 11-E-R

- Row history smoke documentation is in progress.
- `actual_effort_mm` save is confirmed as `PASS` for `project_id=7` and WFM
  `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`; SQL join
  verification showed `updated_by_login_id=admin01`.
- Solution toggle save is confirmed as `PASS`; manual SQL join verification
  showed `updated_by_login_id=admin01`, and the toggled value was restored.
  Exact row timestamp/id evidence was not captured.
- Item checkbox save is confirmed as `PASS` for `project_id=7`, WFM
  `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`, and
  `item_id=ffcd0c35-4c8f-4040-9942-0ec1f7e9fb5c`; SQL join verification
  showed `updated_by_login_id=sales01`,
  `updated_by_display_name=영업대표`, `checked=true`, and
  `updated_at=2026-06-14 08:18:00.148+00`. Restore status remains
  `restore confirmation needed` unless separately confirmed.
- Meta coefficient save/restore is confirmed as `PASS`; manual browser smoke
  changed and saved a coefficient while logged in as `admin01`, SQL join
  verification showed `updated_by_login_id=admin01`, and the value was
  restored. Exact row timestamp/id evidence was not captured.
- Meta base effort row history smoke remains `PENDING` until a real browser
  save/restore action and SQL join confirm the expected updater.
- Meta active toggle row history smoke is optional and remains `SKIP` unless a
  safe restore check is performed.
- `updated_by` remains a UUID `user_id`. Operator-readable checks should use a
  join to `app_login_users` or a future read-only view; do not denormalize
  `login_id` into business tables in this phase.
- No password, password hash, session secret, service-role key, cookie value,
  or detailed audit event payload is documented.

Future improvement candidates:

- Add read-only row history views such as
  `v_standard_effort_solution_selection_history`.
- Revisit whether a sequence/int user identifier is needed for operator
  readability.
- Consider a denormalized `updated_by_login_id` only after DB ownership and
  reporting requirements are explicit.
- Add or confirm project table `created_by` / `updated_by` columns in a future
  migration before applying project row history.

### Phase 11-F

- Run browser smoke for `admin`, `sales`, and `viewer`.
- Update June sign-off/report documents.

Status: documented in
[Auth, Permission, Row History Sign-Off](./auth-permission-row-history-signoff.md).
The June sign-off includes ID/password app login, role-based frontend UI
permissions, minimum row history responsibility tracking, admin-manual password
reset operation, and the feature-branch/main release policy.

### Phase 11-PW-1

- Add logged-in user password change.
- Verify the current password.
- Accept new password and confirm-new-password inputs.
- Add `/api/auth/change-password`.
- Update `password_hash` server-side only.

### Phase 11-PW-2

- Add admin user/password management UI.
- Support account creation, lock/unlock, password reset, and role changes.

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
- ID/password app login without email included.
- `admin` / `sales` / `viewer` frontend UI permissions included.
- Minimum row history responsibility support included.
- Admin-manual password reset operation included.
- Feature branch, scheduled release, hotfix, rollback, and secret handling
  policy included.
- Internal DB conversion excluded.
- Tomcat API production cutover excluded.
- Serverless conversion excluded.
- Internal framework replacement excluded.
