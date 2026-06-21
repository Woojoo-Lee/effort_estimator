# User Management Smoke Result

## Purpose

This document records the Phase 13-C-R manual browser smoke for the
admin-only user management MVP.

The MVP is limited to app login users stored in `app_login_users`. It manages
safe account metadata only:

- `display_name`
- `role_code`
- `active`

It does not expose or manage plaintext passwords, password hashes, cookies,
session secrets, service-role keys, or email.

## Scope

Included:

- Admin-only `/users` route.
- Admin-only sidebar menu item: `사용자 관리`.
- User list rendering for app login users.
- Safe user fields only.
- Role change save and restore smoke.
- Self-lock and self-role-change guard smoke.
- Sales/viewer route and menu block smoke.

Excluded:

- Password reset UI.
- User creation UI.
- Password hash display.
- Email display or email-based login/reset.
- Detailed `app_audit_logs`.
- DB schema, RLS, or migration changes.
- Vercel Production deploy.

## Overall Result

Result: `PASS`

Reason:

- Core browser smoke for admin access, safe field display, self-change guards,
  role update/restore, and sales/viewer blocking is `PASS`.
- `viewer01` active lock/unlock smoke was confirmed in Phase 13-C-R-2 and the
  account was restored to the active state.

This `PASS` result is based on the manual browser checks recorded in Phase
13-C-R and Phase 13-C-R-2.

## Manual Smoke Environment

- Branch: `feature/app-auth-row-history`.
- App auth mode: app-managed ID/password login.
- Login identifier: `login_id`.
- Email login: not used.
- Production deployment: not performed.
- Git commit/push/tag/main merge: not performed.

No real password, password hash, cookie, session secret, service-role key, or
DB password is recorded in this document.

## Admin Access Smoke

Result: `PASS`

Confirmed:

- `admin01` can see the `사용자 관리` sidebar menu item.
- `admin01` can access `/#/users`.
- User list renders successfully.
- `admin01`, `sales01`, and `viewer01` are visible in the list.
- `password_hash` is not visible.
- Email is not visible.

Safe fields observed:

- User ID / login ID.
- Display name.
- Role code / role label.
- Active/locked status.
- Updated timestamp.

## Self-Protection Smoke

Result: `PASS`

Confirmed for `admin01`:

- Self `active=false` action is blocked.
- Self role change is blocked.

Policy:

- Admin operators cannot lock their own account from the MVP screen.
- Admin operators cannot demote/change their own role from the MVP screen.

## Role Change Smoke

Result: `PASS`

Confirmed:

- `viewer01` `role_code` was changed and saved.
- `viewer01` `role_code` was restored after the smoke.

Recorded values:

- Account: `viewer01`.
- Field: `role_code`.
- Restore: completed.

No password, password hash, cookie, or secret value was used as evidence.

## Active Lock/Unlock Smoke

Result: `PASS`

Confirmed:

- `admin01` changed `viewer01` from `active=true` to `active=false` and saved.
- `viewer01` login failed while locked.
- `admin01` changed `viewer01` from `active=false` to `active=true` and saved.
- `viewer01` login succeeded after reactivation.
- `viewer01` kept viewer permissions after reactivation.
- `viewer01` remained blocked from user management.
- `viewer01` remained unable to save.

Restore:

- Completed. `viewer01` was restored to `active=true`.

## Non-Admin Access Smoke

Result: `PASS`

Confirmed:

- `sales01` does not see the `사용자 관리` menu item.
- `sales01` direct URL access to `/#/users` is blocked.
- `viewer01` does not see the `사용자 관리` menu item.
- `viewer01` direct URL access to `/#/users` is blocked.

Policy:

- User management is admin-only.
- Sales/viewer users cannot access the page through menu navigation or direct
  hash route entry.

## Security Notes

- `password_hash` is not displayed in the API response or UI.
- Email is not displayed or used.
- Plaintext passwords are never recorded.
- Cookie values are never recorded.
- `APP_AUTH_SESSION_SECRET` is never recorded.
- `SUPABASE_SERVICE_ROLE_KEY` is never recorded.
- Service-role key remains server-only and must not use a `VITE_` prefix.

## Current Status

| Item | Result | Notes |
| --- | --- | --- |
| Admin menu visible | `PASS` | `admin01` |
| Admin `/#/users` access | `PASS` | `admin01` |
| User list visible | `PASS` | `admin01`, `sales01`, `viewer01` |
| `password_hash` hidden | `PASS` | No hash displayed |
| Email hidden | `PASS` | No email displayed |
| Self active lock blocked | `PASS` | `admin01` |
| Self role change blocked | `PASS` | `admin01` |
| Role change and restore | `PASS` | `viewer01` |
| Active lock/unlock | `PASS` | `viewer01`, restored to active |
| Sales access blocked | `PASS` | Menu and direct URL |
| Viewer access blocked | `PASS` | Menu and direct URL |

## Next Smoke Candidate

- Optional: repeat role change smoke for `sales01` with immediate restore.
- Optional: verify user management remains admin-only after the next Production
  deployment.
