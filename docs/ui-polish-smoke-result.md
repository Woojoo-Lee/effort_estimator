# UI Polish Smoke Result

## Purpose

This document records the Phase 14-A-R / Phase 14-A-R-Manual smoke status for
the UI polish pass.

Phase 14-A changed visible labels, spacing, account-bar wording, access-denied
wording, and management-screen copy only. It did not change save payloads, auth
policy, row history, password-change behavior, Standard Effort calculation, DB
schema, API contracts, or deployment state.

## Overall Result

Result: `PASS`

Reason:

- Local HTTP entry check for `http://127.0.0.1:3000` returned `200`.
- The user manually confirmed the Phase 14-A UI polish in the local browser for
  `admin01`, `sales01`, and `viewer01`.
- Phase 14-A targeted/full/build verification remains the latest completed
  automated gate.
- App auth, permission, password-change, user-management, codebook-management,
  and representative-report UI flows are confirmed enough for the current
  release candidate.

This `PASS` result is based only on manually confirmed browser evidence and
does not record real passwords or secret values.

## Environment

- Branch: `feature/app-auth-row-history`.
- Local URL checked: `http://127.0.0.1:3000`.
- HTTP entry result: `PASS`, status `200`.
- Manual browser smoke: `PASS`.
- Vercel Production deploy: not performed.
- Git commit/push/tag/main merge: not performed.

No real password, password hash, cookie, session secret, service-role key, DB
password, or Supabase key is recorded in this document.

## Latest Automated Gate

Latest completed Phase 14-A verification:

- Targeted tests: `PASS`, 7 files / 118 tests.
- Full tests: `PASS`, 58 files / 863 tests.
- Build: `PASS`.
- `dist/index.html`: restored after build.

Phase 14-A-R-Manual is docs-only, so test/build was not re-run in this turn.

## LoginPage Smoke

Status: `PASS`

Confirmed:

- Full-screen login layout remains.
- `사용자 ID`, `Password`, and `로그인` labels are visible and natural.
- Email wording is not visible.
- Sidebar/header/account bar/logout are not visible before login.

## Admin Report Flow

Status: `PASS`

Confirmed for `admin01`:

- Login succeeds.
- Global account bar is visible.
- `비밀번호 변경` and `로그아웃` buttons are visible.
- Estimation screen is accessible.
- Standard Effort meta is accessible.
- User management is accessible.
- Codebook management is accessible.
- Project management is accessible.

## Sales Permission Flow

Status: `PASS`

Confirmed for `sales01`:

- Login succeeds.
- Estimation screen is accessible.
- `actual_effort_mm` remains read-only.
- Standard Effort meta access is blocked.
- User management access is blocked.
- Codebook management access is blocked.

## Viewer Permission Flow

Status: `PASS`

Confirmed for `viewer01`:

- Login succeeds.
- Save actions remain unavailable.
- Standard Effort meta access is blocked.
- User management access is blocked.
- Codebook management access is blocked.

## AccessDenied Smoke

Status: `PASS`

Confirmed visible wording:

- `접근 권한이 없습니다.`
- `필요한 권한이 없거나 비활성화된 기능입니다.`

Confirmed behavior:

- No overly technical wording was observed.
- No broken layout was observed.

## User Management Smoke

Status: `PASS`

Confirmed:

- User management wording, status display, and buttons are acceptable for the
  report flow.
- `password_hash` is not visible.
- Email wording is not visible.

## Codebook Management Smoke

Status: `PASS`

Confirmed:

- Compact UI remains.
- Codebook management screen is suitable for the report flow.
- No `password_hash`, email, or secret wording was observed.
- Delete or hard-delete wording was not observed.

## Project Management Smoke

Status: `PASS`

Confirmed:

- Korean wording is not broken.
- Hard-delete wording is not visible.
- Screen layout is stable enough for the report flow.

## Standard Effort Meta Smoke

Status: `PASS`

Confirmed:

- Title wording is natural.
- Permission guidance is natural.
- Save wording is natural enough for reporting.
- Save logic remains unchanged.

## Screen Breakage And Horizontal Scroll

Status: `PASS`

Confirmed:

- No obvious broken layout was observed on the checked routes.
- No problematic horizontal-scroll issue was observed.

## Security Notes

- Passwords are not recorded.
- Password hashes are not recorded.
- Cookie values are not recorded.
- `APP_AUTH_SESSION_SECRET` is not recorded.
- `SUPABASE_SERVICE_ROLE_KEY` is not recorded.
- Service-role key remains server-only and must not use a `VITE_` prefix.

## Next Smoke Candidate

Before a scheduled Production release, re-run the same representative flow
against the deployed URL:

1. LoginPage full-screen and wording.
2. `admin01` report flow.
3. `sales01` blocked admin routes and `actual_effort_mm` read-only behavior.
4. `viewer01` read-only behavior.
5. User management, codebook management, project management, Standard Effort
   meta, and AccessDenied screens.

Record only PASS/PARTIAL/FAIL evidence. Do not record real passwords, password
hashes, cookies, session secrets, service-role keys, or DB passwords.

## Related Phase 14-B Smoke

Project lifecycle responsibility was checked separately after this UI polish
smoke.

- Document:
  [Project Management Responsibility Smoke Result](./project-management-responsibility-smoke-result.md)
- Status: `PASS`
- Confirmed: login progress, estimation-screen project lifecycle blocking,
  Standard Effort save paths, Project Management create/edit, updater column,
  admin all-project archive/restore, sales own-project archive/restore, sales
  non-owner restrictions, admin all-project Standard Effort edit, sales
  own-only Standard Effort edit, viewer read-only behavior, hard-delete wording
  absence, and sales/viewer regression.
