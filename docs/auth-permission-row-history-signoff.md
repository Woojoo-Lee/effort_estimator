# Auth, Permission, Row History Sign-Off

## Purpose

This document records the June sign-off scope for minimum ID/password login,
`admin` / `sales` / `viewer` role-based UI permissions, row-level responsibility
tracking, password reset operation, and development/release policy.

It is scoped to the Supabase-mode June delivery. It does not promote the Tomcat
API, internal PostgreSQL API mode, backend authoritative audit, or internal
framework replacement into the June completion gate.

## Login Completion Scope

Completed:

- App-managed ID/password auth.
- No email login and no pseudo-email identifiers.
- `app_login_users` based `login_id` / `password_hash` / `role_code` structure.
- Full-screen login page for app mode when no session is present.
- `admin01`, `sales01`, and `viewer01` login smoke passed.
- Session payloads exclude plaintext passwords and `password_hash`.

Operating conditions:

- `VITE_AUTH_LOGIN_MODE=app` enables the app login path.
- `VITE_AUTH_LOGIN_MODE=disabled` preserves the existing no-login entry path.
- Server-only env such as `APP_AUTH_SESSION_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_URL` must stay out of frontend env
  and source control.

## Permission Completion Scope

### `admin`

- Can access and edit Standard Effort meta.
- Can use Standard Effort estimation.
- Can edit `actual_effort_mm`.
- Can perform solution toggle and item checkbox saves.

### `sales`

- Can use Standard Effort estimation.
- Can save solution toggle.
- Can save item checkbox selections.
- Cannot edit `actual_effort_mm`.
- Cannot access Standard Effort meta.

### `viewer`

- Read-only operating role.
- Cannot save Standard Effort changes.
- Cannot access Standard Effort meta.

These are frontend UX guards for the June Supabase path. Backend/API permission
enforcement remains a later operating target.

## Row History Smoke Result

Row history uses business table columns such as `updated_by` and `updated_at`.
Detailed event audit is intentionally excluded from this phase:

- No `app_audit_logs` event implementation in this sign-off scope.
- No `before_json` / `after_json`.
- `updated_by` remains the UUID `user_id`.
- Human-readable operator checks use joins to `app_login_users` for `login_id`
  and `display_name`.
- Email, `login_id`, and `display_name` are not denormalized into business row
  history columns.

Current smoke status:

| Path | Result | Confirmed operator |
| --- | --- | --- |
| `actual_effort_mm` save | `PASS` | `admin01` |
| Solution toggle save | `PASS` | `admin01` |
| Item checkbox save | `PASS` | `sales01` |
| Meta coefficient save/restore | `PASS` | `admin01` |
| Meta base effort save/restore | `PENDING` | Not yet confirmed |
| Meta active toggle save/restore | `SKIP` | Optional safe-restore smoke only |

Evidence notes:

- Solution toggle and meta coefficient were confirmed by manual SQL joins.
- Exact row timestamp/id evidence was not captured for those manual checks.
- Item checkbox restore confirmation remains needed if the checked state must
  return to the pre-smoke value.

## Password Reset Policy

June operation uses admin-manual password reset:

- No email password reset.
- No SMS reset.
- Users request a reset from an admin operator.
- Admin operators generate a temporary password and create a PBKDF2 hash with
  the approved helper.
- Admin operators update `app_login_users.password_hash` manually through
  Supabase SQL Editor.
- Account lock/unlock uses `app_login_users.active=false/true`.
- Real passwords, password hashes, cookies, session secrets, service-role keys,
  and DB passwords must never be recorded in docs, chat, commits, or frontend
  env.

Follow-up:

- Phase 11-PW-1: logged-in user password change.
- Phase 11-PW-2: admin user/password management UI.

## Development And Release Policy

June delivery follows the branch/release policy in
[Development And Release Policy](./development-release-policy.md):

- `main` is the Vercel Production baseline.
- Feature work happens on `feature/*`; current branch:
  `feature/app-auth-row-history`.
- Production releases are scheduled one or two times per week.
- Operational hotfixes are the only immediate main/Production exception.
- Commit, push, tag, and Vercel deploy are not part of this sign-off phase.

Main merge candidate gate:

```powershell
npm.cmd run test:run
npm.cmd run build
```

Additional release candidate checks:

- Local `vercel dev` smoke.
- `admin01` / `sales01` / `viewer01` role smoke.
- Row history SQL spot checks.
- Secret/env file exclusion check.
- `dist/index.html` restore if build output changes it.

## June Completion Scope

Included in the June completion gate:

- Supabase-mode Standard Effort estimation and saves.
- Standard Effort meta management.
- Standard Effort Excel export.
- ID/password login.
- Role-based frontend UI permission.
- Minimum row history responsibility tracking.
- Admin-manual password reset operating procedure.
- Development and release policy.

Excluded or deferred:

- Internal framework integration.
- Internal PostgreSQL / Tomcat API operating cutover.
- Backend authoritative audit.
- Detailed change log events.
- User and permission management screens.
- Logged-in user password change screen.
- Meta base effort row history smoke.
- Active toggle row history smoke.
- Server-side recalculate.

## Next Release Candidate

`feature/app-auth-row-history` is the next scheduled release candidate. The
release candidate gate is `PASS` after local Vercel dev smoke, but it should
not be pushed to `main` or Vercel Production outside the scheduled release path
unless a hotfix criterion is met. The current gate is tracked in
[Release Candidate Gate: App Auth Row History](./release-candidate-gate-app-auth-row-history.md).
