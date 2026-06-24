# Production Smoke Checklist

## Purpose

This checklist is the repeatable Production smoke path for the June first
Standard Effort operation app.

Use it after Vercel Production deploy, env correction/redeploy, or a hotfix.
Record only PASS/FAIL/PARTIAL/SKIP outcomes. Do not record passwords, password
hashes, cookies, session secrets, service role keys, or private env values.

## Preflight

- Confirm Vercel Production deployment is `Ready`.
- Confirm the expected Production URL.
- Use Ctrl+F5 or a private browser window.
- Confirm no `.env`, `.env.local`, `.env*`, `.vercel`, or `dist/index.html`
  file is being staged for release.
- Confirm the latest local release gate had:
  - `npm.cmd run test:run`: `PASS`.
  - `npm.cmd run build`: `PASS`.
  - `dist/index.html` restored.

## Login Smoke

| Check | Expected |
| --- | --- |
| Login page opens | `PASS` |
| User ID / password login is shown | `PASS` |
| Email wording is absent | `PASS` |
| `admin01` login | `PASS` |
| `sales01` login | `PASS` |
| `viewer01` login | `PASS` |
| Logout returns to login page | `PASS` |

## Admin Smoke

Login as `admin01`.

- Global account bar is visible.
- Logout is visible.
- Password change entry is visible.
- `공수 산정` is accessible.
- Project can be selected.
- `공수 저장` button is visible.
- Refresh button is visible.
- Excel download button is visible.
- Standard Effort solution toggle is editable as a local draft change.
- Standard Effort item checkbox is editable as a local draft change.
- `actual_effort_mm` is editable as a local draft change.
- `저장되지 않은 변경사항이 있습니다.` appears before explicit save.
- `공수 저장` persists the draft and clears the dirty state.
- Standard Effort last updated time/updater is visible when data exists.
- `표준공수 메타` is accessible.
- `사용자 관리` is accessible.
- `코드북 관리` is accessible.
- `프로젝트 관리` is accessible.
- Admin can archive/restore own, other-owned, and owner-unknown projects.

## Sales Smoke

Login as `sales01`.

- `공수 산정` is accessible.
- Sales-owned project solution/item selection is editable.
- Sales-owned project solution/item selection requires `공수 저장` to persist.
- Non-owned project solution/item selection is read-only.
- `actual_effort_mm` is read-only.
- `표준공수 메타` is hidden or blocked.
- `사용자 관리` is hidden or blocked.
- `코드북 관리` is hidden or blocked.
- Sales can archive/restore only projects registered by the current sales user.
- Sales cannot archive/restore other-owned projects.

## Viewer Smoke

Login as `viewer01`.

- `공수 산정` is accessible for viewing.
- Save actions are unavailable or disabled.
- Standard Effort meta is hidden or blocked.
- User management is hidden or blocked.
- Codebook management is hidden or blocked.
- Project lifecycle edits are unavailable.

## Standard Effort Smoke

- Select an existing project.
- Confirm Standard Effort section loads.
- Confirm result summary is visible.
- Confirm solution selection area is visible.
- Confirm item checkbox table is visible.
- Confirm `standard_effort_mm`, `actual_effort_mm`, and `gap_mm` are visible
  where expected.
- Make a safe solution/item draft change only when a restore path is ready.
- Confirm the dirty message appears before save.
- Click `공수 저장`.
- Confirm saved values persist and the dirty message clears.
- Confirm `공수 산정 내용을 저장했습니다.` is shown without the dirty message
  after a successful save.
- Confirm refresh keeps saved values.
- Confirm Excel download works.

## Management Smoke

### User Management

- Admin can open the page.
- Sales/viewer cannot open the page.
- User list displays `admin01`, `sales01`, and `viewer01`.
- Password hash is not visible.
- Email is not visible.
- Admin self-lock is blocked.
- Admin self-role demotion is blocked.
- Role/active changes are restored after smoke.

### Codebook Management

- Admin can open the page.
- Sales/viewer cannot open the page.
- Code type list displays.
- Code list displays.
- Use-state select works.
- Delete/hard-delete wording is absent.
- Password/hash/email/secret wording is absent.
- Any changed row is restored after smoke.

### Project Management

- Project list displays.
- Project create/edit area displays.
- Updater column displays.
- Soft archive/restore works according to admin/sales policy.
- Hard-delete wording is absent.

## Visual Smoke

- Sidebar brand displays `표준 공수 운영 관리`.
- Broken footer text is absent.
- `Contact Center Estimation Workspace` footer text is absent.
- `Internal Planning Use` footer text is absent.
- `unknown` footer fallback is absent.
- No severe page-level horizontal scroll is observed on representative desktop
  width.
- Access denied text is user-facing and non-technical.

## Non-Blocking Items To Leave As Documented

- Meta base effort row history smoke: `PENDING`.
- Active toggle row history smoke: `SKIP`.
- Vite large chunk warning.
- Existing non-blocking React/Vitest warning noise when tests pass.
- Backend Maven test issue before Tomcat/Jenkins backend deployment.

## Fail Criteria

Treat the smoke as failed and consider rollback/hotfix if any of these occur:

- Login unavailable.
- Role permissions are reversed or unsafe.
- Save actions unavailable for expected users.
- Viewer can write data.
- Sales can edit `actual_effort_mm`.
- Excel download unavailable.
- Blank page or unrecoverable runtime error.
- Secret/password/hash/cookie value appears in UI or document output.
