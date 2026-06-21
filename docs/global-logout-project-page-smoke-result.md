# Global Logout And Project Page Smoke Result

## Purpose

This document records the Phase 13-A-R local app-mode smoke attempt for the
global account/logout UX and the Project Management page wording cleanup.

This phase does not commit, push, tag, merge to `main`, or trigger Vercel
Production deployment.

## Scope

Included:

- Local Vercel dev startup check.
- LoginPage unauthenticated smoke target.
- Global account/logout bar smoke target.
- `admin01` / `sales01` / `viewer01` regression smoke target.
- Project Management page wording and hard-delete exposure smoke target.
- Logout return-to-login smoke target.

Excluded:

- New feature implementation.
- Auth API changes.
- Standard Effort calculation/save changes.
- Row history changes.
- DB migration changes.
- Package changes.
- Secret, password, hash, cookie, or service-role key recording.

## Local Runtime

Command requested for runtime smoke:

```powershell
npx vercel dev --listen 127.0.0.1:3000
```

Windows execution note:

- `npx.ps1` was blocked by PowerShell execution policy.
- `npx.cmd` was used instead.

Vercel CLI check:

- `npx.cmd --yes vercel --version`: `54.14.0`

Local runtime result:

- `http://127.0.0.1:3000`: `HTTP 200 OK`
- Local dev process was stopped after the smoke attempt.

## Smoke Status

Overall result: `PASS`

Reason:

- Local Vercel dev started and served the frontend.
- Phase 13-A automated tests already verify LoginPage, global account/logout
  shell behavior, and Project Management wording.
- The initial local login failure was traced to a mismatch between `.env` and
  `.env.local` for the server-only Supabase service-role key configuration.
- After aligning the local env files, the user completed a real browser smoke
  with `admin01`, `sales01`, and `viewer01`.
- No secret, password, password hash, cookie, app session secret, or service-role
  key value is recorded in this document.

## Checklist

| Item | Result | Evidence |
| --- | --- | --- |
| Local Vercel dev startup | `PASS` | `http://127.0.0.1:3000` returned `HTTP 200 OK`. |
| LoginPage full-screen | `PASS` | User confirmed in a real browser. |
| LoginPage hides sidebar/header/logout | `PASS` | User confirmed no sidebar, header, or logout control appears before login. |
| LoginPage has no email wording | `PASS` | User confirmed ID/password login UI with no email wording. |
| `admin01` global account/logout bar | `PASS` | User confirmed the global account/logout bar on Estimator, Standard Effort meta, and Project Management routes. |
| `admin01` Standard Effort meta access | `PASS` | User confirmed successful access. |
| `sales01` meta blocked / estimator usable | `PASS` | User confirmed Standard Effort meta access is blocked and the Estimator screen is usable. |
| `sales01` `actual_effort_mm` read-only | `PASS` | User confirmed `actual_effort_mm` is read-only. |
| `viewer01` read-only regression | `PASS` | User confirmed login succeeds and save actions are unavailable. |
| Project Management Korean wording | `PASS` | User confirmed no broken Korean wording is visible. |
| Project Management hard-delete wording hidden | `PASS` | User confirmed no hard-delete-like `삭제` wording is visible. |
| Logout returns to LoginPage | `PASS` | User confirmed logout returns to the full-screen LoginPage. |

## Phase 13-A Verification Already Completed

Phase 13-A automated verification:

- Targeted tests: `PASS`
  - 5 files passed.
  - 60 tests passed.
- Full tests: `PASS`
  - 55 files passed.
  - 791 tests passed.
- Build: `PASS`
  - Vite large chunk warning only.
- `dist/index.html` was restored after build.

The relevant automated coverage includes:

- App-mode authenticated routes show the global account/logout bar.
- `display_name` is preferred; `login_id` is used as fallback.
- LoginPage remains full-screen without sidebar/header/logout.
- Logout calls `signOut` and returns to LoginPage.
- Standard Effort meta route also shows the global logout control.
- HeaderBar no longer owns account/logout controls.
- Project Management support-screen copy is visible.
- Supabase-mode ProjectPage does not expose hard-delete wording.

## Notes

- Do not record real passwords, password hashes, session cookies, service-role
  keys, or app session secrets in smoke documents.
- The local login issue was an env mismatch, not an app-auth UI or permission
  regression.
- The user completed the post-cleanup manual smoke with real test account
  credentials without sharing or recording those credentials.
- The prior Release Candidate document records the broader account-role smoke;
  this document records the post-Phase 13-A global logout and Project Management
  cleanup smoke as `PASS`.

## Release Action

Not performed:

- `git commit`
- `git push`
- `git tag`
- `main` merge
- Vercel Production deploy
