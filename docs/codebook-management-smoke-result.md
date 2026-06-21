# Codebook Management Smoke Result

## Purpose

This document records the latest manual browser smoke for the admin-only
codebook management MVP after the Phase 13-D-Fix-11 UI polish.

The screen manages `common_code` values for the June MVP. The physical
`common_code` schema is kept as-is, while the UI and save payload are simplified
around the fields users need to see:

- Code type ID.
- Code ID.
- Code name.
- Active state.

Auth role resolution is still not connected to codebook data. Runtime
admin/sales/viewer permission behavior remains the existing hard-coded policy.

## Scope

Included:

- Admin-only `/codebooks` route.
- Admin-only sidebar menu item.
- Compact codebook management UI.
- Search condition active-state select.
- Code type list and code list display.
- Code type detail active-state select.
- Code detail active-state select.
- Code type and code active-state save.
- Sales/viewer route and menu block smoke.

Excluded:

- Codebook row hard delete.
- Auth permission resolver migration to codebook data.
- User/permission management changes.
- Password change changes.
- DB schema, RLS, or migration changes.
- Vercel Production deploy.

## Overall Result

Result: `PASS`

Confirmed:

- `admin01` can access codebook management.
- The compact UI is displayed.
- The old large top description card is removed.
- Lower explanatory helper text is removed.
- The search condition active-state select is visible.
- Code type detail active state uses a select.
- Code detail active state uses a select.
- Code type name values are left-aligned.
- Code name values are left-aligned.
- Number, ID, and active-state columns remain center-aligned.
- Code type active-state save works.
- Code active-state save works.
- Delete or hard-delete wording is not visible.
- Password/hash/secret-related wording is not visible.
- Sales/viewer users cannot access the screen.
- Auth resolver remains disconnected from codebook data.

## Manual Smoke Environment

- Branch: `feature/app-auth-row-history`.
- App auth mode: app-managed ID/password login.
- Login identifier: `login_id`.
- Production deployment: not performed.
- Git commit/push/tag/main merge: not performed.

No real password, password hash, cookie, session secret, service-role key, or
DB password is recorded in this document.

## Admin Access Smoke

Result: `PASS`

Confirmed:

- `admin01` can see the codebook management sidebar menu item.
- `admin01` can access `/#/codebooks`.
- The codebook management screen renders successfully.
- The screen uses the compact 2-by-2 management layout.
- The large top description card is not shown.
- The lower explanatory helper text is not shown.

## Search And Layout Smoke

Result: `PASS`

Confirmed:

- The search condition active-state select is visible.
- Code type list is visible.
- Code list is visible.
- Code type detail panel is visible.
- Code detail panel is visible.
- Code type name values are left-aligned.
- Code name values are left-aligned.
- Number columns are center-aligned.
- Code type ID and code ID columns are center-aligned.
- Active-state columns are center-aligned.

## Active-State Select Smoke

Result: `PASS`

Confirmed:

- Code type detail active state is a `Use / Not use` select in the UI.
- Code detail active state is a `Use / Not use` select in the UI.
- The internal payload remains boolean `is_active`.
- Code type active-state save was confirmed.
- Code active-state save was confirmed.

Policy retained:

- The `code = '00'` metadata-row policy remains unchanged.
- The `code_value` auto-save policy remains unchanged.
- `common_code` physical schema remains unchanged.

## Non-Admin Access Smoke

Result: `PASS`

Confirmed:

- `sales01` does not see the codebook management menu item.
- `sales01` direct URL access to `/#/codebooks` is blocked.
- `viewer01` does not see the codebook management menu item.
- `viewer01` direct URL access to `/#/codebooks` is blocked.

Policy:

- Codebook management is admin-only.
- Sales/viewer users cannot access the page through menu navigation or direct
  hash route entry.

## Security And Wording Smoke

Result: `PASS`

Confirmed:

- Delete or hard-delete wording is not visible.
- `password_hash` text is not visible.
- Email text is not visible.
- Secret-related text is not visible.

Security notes:

- Plaintext passwords are never recorded.
- Password hashes are never recorded.
- Cookie values are never recorded.
- `APP_AUTH_SESSION_SECRET` is never recorded.
- `SUPABASE_SERVICE_ROLE_KEY` is never recorded.
- Service-role key remains server-only and must not use a `VITE_` prefix.

## Auth Resolver Policy

Result: `PASS`

Confirmed policy:

- The auth role/permission resolver remains hard-coded for the June MVP.
- Codebook data is not connected as the source of truth for admin/sales/viewer
  permission evaluation in this phase.
- Codebook values may be managed for reference and future operational use, but
  they do not drive runtime auth decisions yet.

## Current Status

| Item | Result | Notes |
| --- | --- | --- |
| Admin menu visible | `PASS` | `admin01` |
| Admin `/#/codebooks` access | `PASS` | `admin01` |
| Compact UI | `PASS` | Manual browser smoke |
| Large top description card removed | `PASS` | Manual browser smoke |
| Lower helper text removed | `PASS` | Manual browser smoke |
| Search active-state select | `PASS` | Manual browser smoke |
| Code type detail active-state select | `PASS` | Manual browser smoke |
| Code detail active-state select | `PASS` | Manual browser smoke |
| Code type name left-aligned | `PASS` | Manual browser smoke |
| Code name left-aligned | `PASS` | Manual browser smoke |
| Number/ID/active columns center-aligned | `PASS` | Manual browser smoke |
| Code type active-state save | `PASS` | Manual browser smoke |
| Code active-state save | `PASS` | Manual browser smoke |
| Delete/hard-delete wording hidden | `PASS` | No delete wording displayed |
| `password_hash` hidden | `PASS` | No hash text displayed |
| Email hidden | `PASS` | No email text displayed |
| Secret wording hidden | `PASS` | No secret text displayed |
| Sales access blocked | `PASS` | Menu and direct URL |
| Viewer access blocked | `PASS` | Menu and direct URL |
| Auth resolver not linked to codebook | `PASS` | Hard-coded policy retained |
| `common_code` physical schema unchanged | `PASS` | UI/payload simplification only |

## Next Smoke Candidate

- Optional Production smoke after the next scheduled release.
- Optional repeat of code type/code active-state save on a non-critical row.
- Optional verification that codebook management remains admin-only after
  deployment.
