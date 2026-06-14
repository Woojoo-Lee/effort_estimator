# App Auth Password Reset Policy

## Purpose

This document defines the June operating procedure for forgotten passwords in
the ID/password app-auth flow.

The June policy does not use email, SMS, SSO, Supabase Auth email/password, or
self-service password reset. Password reset is handled manually by an admin
operator through a new temporary password and an `app_login_users.password_hash`
update.

Do not record real passwords, generated password hashes, cookies,
`APP_AUTH_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or any other secret in
docs, code, chat, tickets, commit messages, or screenshots.

## Policy

When a user forgets a password:

1. The user asks an admin operator for a password reset.
2. The admin operator creates a new temporary password.
3. The admin operator generates a PBKDF2 password hash with the repository
   helper.
4. The admin operator updates `public.app_login_users.password_hash` in
   Supabase SQL Editor.
5. The user logs in with the new password.
6. The admin operator records only the operational result, never the password
   or hash.

Email reset links are not implemented for the June delivery. User-management
and permission-management screens are also out of scope for June.

## Generate Password Hash

Run the helper locally from the repository root:

```powershell
cd C:\dev\effort_estimator
node .\scripts\generateAppUserPasswordHash.mjs
```

Operational rules:

- Type or paste the temporary password only into the helper prompt.
- Do not write the plaintext password in chat, docs, source files, or tickets.
- Do not write the generated hash in chat, docs, source files, or tickets.
- Paste the generated hash only into Supabase SQL Editor.
- Remove temporary notes after use if a local scratchpad was needed.
- Do not pass the password as a CLI argument.

## Password Reset SQL Template

Replace placeholders only inside Supabase SQL Editor.

```sql
update public.app_login_users
set
  password_hash = '<NEW_PASSWORD_HASH_FROM_SCRIPT>',
  updated_at = now()
where login_id = '<LOGIN_ID>'
  and active = true;
```

Notes:

- `<NEW_PASSWORD_HASH_FROM_SCRIPT>` is a placeholder. Do not commit or document
  the real value.
- `<LOGIN_ID>` is the target user ID, such as `admin01`, `sales01`, or
  `viewer01`.
- If the update affects `0` rows, check whether the account is inactive, the
  `login_id` is wrong, or the row does not exist.

## Reset Verification SQL

Do not select `password_hash`.

```sql
select
  login_id,
  display_name,
  role_code,
  active,
  updated_at
from public.app_login_users
where login_id = '<LOGIN_ID>';
```

Expected:

- One row is returned.
- `active = true`.
- `role_code` is still the intended role.
- `updated_at` reflects the reset time.

## Account Lock And Unlock

Lock an account:

```sql
update public.app_login_users
set
  active = false,
  updated_at = now()
where login_id = '<LOGIN_ID>';
```

Unlock an account:

```sql
update public.app_login_users
set
  active = true,
  updated_at = now()
where login_id = '<LOGIN_ID>';
```

After unlock, run the verification SQL above. Do not inspect or record
`password_hash`.

## Post-Reset Smoke

Use a private/incognito browser window.

1. Open the operating URL.
2. Confirm the full-screen user ID/password login page appears if no session is
   present.
3. Login with the target `login_id` and the new password.
4. Confirm login succeeds.
5. Confirm role behavior:
   - `admin`: Standard Effort meta access and admin edit paths are available.
   - `sales`: solution/item save paths are available, but `actual_effort_mm` is
     read-only and Standard Effort meta is blocked.
   - `viewer`: read-only behavior is preserved.
6. Logout.
7. If login fails, check only:
   - `login_id`
   - `active`
   - `role_code`
   - whether the password hash update affected one row

Do not inspect `APP_AUTH_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, cookies,
plaintext password, or password hash during the smoke.

## Security Rules

- Email is not used for app auth or password reset.
- Plaintext passwords must not be recorded.
- Password hashes must not be recorded.
- `APP_AUTH_SESSION_SECRET` must not be recorded.
- `SUPABASE_SERVICE_ROLE_KEY` must not be recorded.
- Service-role keys must never use a `VITE_` prefix.
- `password_hash` should not be selected in verification SQL.
- Password reset work is admin-only.
- User management UI and permission management UI remain later-phase work.

## Follow-Up Phases

### Phase 11-PW-1

- Add logged-in user password change.
- Require current password verification.
- Require new password and confirm-new-password inputs.
- Add `/api/auth/change-password`.
- Update `password_hash` server-side only.

### Phase 11-PW-2

- Add admin user/password management UI.
- Support account creation, locking, reset, and role changes.
- Keep permission changes auditable through the future backend authoritative
  audit path.
