# Password Change Smoke Result

## Purpose

This document records the Phase 13-B-R and Phase 13-B-R-Manual-2 local app-mode
smoke result for the logged-in user password change feature.

The feature is implemented in Phase 13-B, but this smoke document records only
what was actually checked during this run. Real passwords, password hashes,
session secrets, service-role keys, and cookie values are intentionally not
recorded.

## Scope

Included:

- Local Vercel dev runtime startup.
- `/api/auth/change-password` validation smoke that does not require a real
  account password.
- Password change UI and actual password-change checklist status.
- Permission regression checklist status.

Excluded:

- Email reset.
- SMS reset.
- Admin user-management screen.
- Permission-management screen.
- `app_login_users` schema changes.
- Vercel env changes.
- Git commit, push, tag, `main` merge, or Vercel Production deploy.

## Runtime

- Branch: `feature/app-auth-row-history`
- Runtime command: `npx vercel dev --listen 127.0.0.1:3000`
- Local URL: `http://127.0.0.1:3000`
- Runtime status: `PASS`
- HTTP entry check: `PASS` (`200`)

## Overall Smoke Status

Status: `PASS`

Reason:

- The local Vercel dev runtime and no-session API validation paths were
  checked.
- The user performed the real browser smoke with `viewer01`.
- Password change, session expiry, re-login with the changed password, old
  password failure, permission regression, and restore were confirmed.
- Password values, password hashes, session secrets, service-role keys, and
  cookies were not recorded.

## API Validation Smoke

Endpoint:

```http
POST /api/auth/change-password
```

Confirmed results:

| Case | Expected | Result |
| --- | --- | --- |
| Missing current password | `400 VALIDATION_ERROR` | `PASS` |
| New password shorter than 4 characters | `400 VALIDATION_ERROR` | `PASS` |
| New password confirmation mismatch | `400 VALIDATION_ERROR` | `PASS` |
| New password same as current password | `400 VALIDATION_ERROR` | `PASS` |
| Valid-shaped request without session | `401 INVALID_CREDENTIALS` | `PASS` |

Notes:

- The smoke used placeholder values only.
- No real password, password hash, cookie value, session secret, or service-role
  key was recorded.
- The success path was not executed because it requires a real authenticated
  session and current password.

## Password Change UI Smoke

Status: `PASS`

Manual checks confirmed:

- `viewer01` login succeeded.
- The global account area showed the password-change action.
- The password-change panel opened.
- The fields were present:
  - Current password.
  - New password.
  - New password confirmation.
- A 3-character new password showed the validation message.
- After validation failure, the panel remained open and the session remained
  active.
- No email wording appeared in the password-change flow.

Automated coverage from Phase 13-B:

- Auth repository tests passed.
- Auth provider tests passed.
- Login page tests passed.
- App auth function tests passed.
- Full frontend test/build passed before this manual smoke phase.

## Actual Change Smoke

Status: `PASS`

Executed manually by the user with `viewer01`.

Confirmed result:

| Item | Result |
| --- | --- |
| Account used for actual change | `viewer01` |
| 3-character validation message | `PASS` |
| Validation failure keeps panel open | `PASS` |
| Validation failure keeps session active | `PASS` |
| 4+ character password change | `PASS` |
| Success response and LoginPage return | `PASS` |
| Re-login notice | `PASS` |
| Re-login with changed password | `PASS` |
| Old password rejected after change | `PASS` |
| Restore to original password | `PASS` |
| Re-login with restored password | `PASS` |

Note:

- The document records only that `viewer01` password was changed and restored by
  the user.
- The actual old password, new password, restored password, password hash,
  cookie, and secret values are not recorded.

## Permission Regression Checklist

Status: `PASS`

Confirmed after the `viewer01` password change and restore:

- `viewer01` still cannot access Standard Effort meta.
- `viewer01` save actions remain unavailable.

## Security Notes

- Email is not used.
- Password reset by email is not implemented.
- Password reset by SMS is not implemented.
- Plaintext passwords must not be recorded.
- Password hashes must not be recorded.
- Cookie values must not be recorded.
- `APP_AUTH_SESSION_SECRET` must not be recorded.
- `SUPABASE_SERVICE_ROLE_KEY` must not be recorded.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only and must not use a
  `VITE_` prefix.

## Release Action

No release action was performed in this phase:

- No commit.
- No push.
- No tag.
- No `main` merge.
- No Vercel Production deploy.
