# Release Closure: Standard Effort June v1.1

## Purpose

This document closes the June first Standard Effort operating release and the
v1.1 hotfix. It records the final Production state, smoke result, monitoring
checklist, executive rehearsal checklist, and July follow-up backlog.

Do not record real passwords, password hashes, cookies, session secrets,
service role keys, private env values, or DB credentials in this document.

## Release State

Final closure status: `PASS`

- `standard-effort-june-v1`: June first Production operating baseline tag.
- `standard-effort-june-v1.1`: explicit Standard Effort save hotfix tag.
- Production deployment completed.
- Production smoke completed.
- No additional code development is included in this closure phase.
- Codex did not commit, push, tag, merge to `main`, or deploy to Vercel during
  this closure documentation phase.

## v1.1 Hotfix Summary

Original Production issue:

- Solution toggle, item checkbox, and `actual_effort_mm` changes were persisted
  immediately.
- This made it easy for users to save accidental clicks or intermediate input
  states before they intended to commit the estimate.

v1.1 behavior:

- Solution toggle, item checkbox, and `actual_effort_mm` changes remain local
  draft changes.
- `공수 저장` is the only Standard Effort commit action.
- A successful `공수 저장` clears the dirty warning and leaves the success
  message.
- A failed save keeps the draft dirty so the user can retry.
- Row history is updated at the `공수 저장` click time, not at individual
  checkbox/input change time.
- Standard Effort calculation, save payload shape, auth policy, project owner
  policy, and row history schema remain unchanged.

## Final Production Smoke

Final Production smoke result: `PASS`

Admin smoke:

- `admin01` login: `PASS`.
- Standard Effort edit and `공수 저장`: `PASS`.
- Excel download: `PASS`.
- User management: `PASS`.
- Codebook management: `PASS`.
- Project management: `PASS`.

Sales smoke:

- `sales01` login: `PASS`.
- Own-project solution/item save: `PASS`.
- Other-owned project read-only behavior: `PASS`.
- `actual_effort_mm` read-only behavior: `PASS`.

Viewer smoke:

- `viewer01` login: `PASS`.
- Read-only estimation view: `PASS`.
- Save actions unavailable: `PASS`.
- Management screens blocked: `PASS`.

Common checks:

- Broken footer text absent: `PASS`.
- Secret/password/hash/cookie/service-role-key exposure absent: `PASS`.
- Hard-delete UX absent: `PASS`.

Post-closure UI smoke:

- Standard Effort Meta coefficient grid compact UI smoke: `PASS`.
- 1366 x 768 and 1920 x 1080 viewport checks: `PASS`.
- WFM column accessibility: `PASS`.
- Coefficient save/restore and base effort regression checks: `PASS`.
- Details are tracked in
  [Standard Effort Meta Grid Smoke Result](./standard-effort-meta-grid-smoke-result.md).

## Known Non-Blocking Items

- Backend Maven `DbHealthControllerTest` failure:
  - Non-blocking for current Vercel frontend/API functions operation.
  - Requires a separate Backend-Test-Fix before internal Tomcat/Jenkins backend
    deployment.
- Vite large chunk warning:
  - Non-blocking.
  - Candidate for July performance or chunk-splitting work.
- Some React/Vitest act warning noise:
  - Non-blocking when final tests pass.
- Meta base effort row history smoke:
  - `PENDING`, non-blocking.
- Active toggle row history smoke:
  - `SKIP`, non-blocking.

## 24-Hour Operation Monitoring Checklist

Run spot checks during the first 24 hours after v1.1 Production operation:

- Production login works for the expected roles.
- `공수 저장` button appears and remains disabled until a draft change exists.
- Draft changes show `저장되지 않은 변경사항이 있습니다.`.
- Successful `공수 저장` persists values and clears the dirty warning.
- Failed save, if encountered, leaves the draft dirty and retryable.
- Standard Effort last updated time/updater refreshes after save.
- Excel download works.
- `sales01` own-project write and non-owner read-only rules hold.
- `viewer01` remains read-only.
- User management is admin-only.
- Codebook management is admin-only.
- Project archive/restore follows admin all-project and sales own-project
  rules.
- Vercel latest Production deployment remains `Ready`.
- Supabase row history spot checks show expected `updated_by` / `updated_at`
  changes after explicit save.

## Executive Demo Rehearsal Checklist

Before the representative executive demo:

- Open Production in a private browser window or after Ctrl+F5.
- Log in as `admin01`.
- Select a prepared project from `공수 산정`.
- Make a safe solution/item draft change only when a restore path is ready.
- Click `공수 저장` and confirm the dirty warning clears.
- Show standard effort, actual effort, and gap values.
- Download Excel.
- Open `사용자 관리` and explain role/active controls without exposing secrets.
- Open `코드북 관리` and show value management without delete/hard-delete.
- Open `표준공수 메타` and show the compact coefficient grid, WFM access, and
  readable left-side columns.
- Open `프로젝트 관리` and explain create/edit/soft archive responsibility.
- Log in as `sales01` and explain own-project editing plus
  `actual_effort_mm` read-only behavior.
- Log in as `viewer01` and explain read-only review.

## July Backlog

- Backend Maven `DbHealthControllerTest` fix.
- Internal Tomcat/API transition.
- Backend authoritative audit.
- Codebook code category, parent-code, and ETC expansion.
- Meta base effort row history smoke.
- Active toggle smoke with safe restore.
- Server-side recalculation design.
- User management hardening and extended administration flows.
- Performance and chunk-splitting improvement.

## Closure Decision

Decision: `CLOSED`

The June first operating release and v1.1 Standard Effort explicit-save hotfix
are closed for controlled operation. Further work should move to July backlog
or an approved operating hotfix path.
