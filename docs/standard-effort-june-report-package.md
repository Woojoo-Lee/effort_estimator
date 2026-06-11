# Standard Effort June Report Package

## 1. Executive Summary

The first Standard Effort completion scope is ready for Supabase-mode
operation and sharing as of the end of June.

Completed and verified areas include estimator calculation and save paths,
project-level Standard Effort state, meta admin save/restore flows, Standard
Effort Excel export in `standard + supabase` mode, and coefficient grid UX
improvements.

Internal DB integration and Tomcat API production cutover are intentionally
separated into the July-and-later transition track.

The June scope also includes minimum login, `admin` / `sales` / `viewer`
permissions, and audit actor tracking. See
[Auth, Permission, And Audit Actor Minimum Scope](./auth-permission-audit-minimum-scope.md).

## 2. Completed Functionality

- Standard mode estimator screen.
- Solution toggle save.
- Item checkbox save.
- `actual_effort_mm` save.
- Standard Effort refresh.
- Meta admin base effort edit/save/restore.
- Meta admin coefficient edit/save/restore.
- Meta admin active toggle/save/restore.
- Standard Effort Excel export in Supabase mode.
- Coefficient grid top scrollbar and wide layout UX improvement.
- Project archive and restore UX.
- Auth and read-only skeleton.
- Supabase Auth login/session skeleton with default disabled mode.
- Frontend audit policy.
- Minimum login, role permission, and audit actor scope.
- Tomcat backend scaffold and API contract preparation.

## 3. Verification Summary

- Supabase-mode interim smoke: mostly PASS for the first-completion scope.
- Standard Effort estimator save paths: PASS.
- Meta admin save/restore smoke: PASS.
- Standard Effort Excel export smoke: PASS.
- Coefficient grid UX targeted test, full test, and build: PASS.
- `npm.cmd run test:run`: PASS.
- `npm.cmd run build`: PASS.
- Known build note: Vite large chunk warning only.

Reference documents:

- [Supabase Mode Interim Smoke Result](./supabase-mode-interim-smoke-result.md)
- [Standard Effort June Sign-Off](./standard-effort-june-signoff.md)
- [Supabase Standard Effort Export Design](./supabase-standard-effort-export-design.md)
- [Standard Effort API Smoke Result](./standard-effort-api-smoke-result.md)

## 4. Demo Checklist

Use `VITE_DATA_BACKEND=supabase` for the June demo path.

1. Select a project.
2. Confirm the Standard Effort section is shown.
3. Toggle a solution selection and confirm save.
4. Check or uncheck an item and confirm save.
5. Edit `actual_effort_mm` and confirm save.
6. Refresh Standard Effort data and confirm saved values remain.
7. Run Standard Effort Excel export.
8. Open Standard Effort meta admin.
9. Edit and restore a base effort row.
10. Edit and restore a coefficient row.
11. Toggle and restore active state.
12. Open the coefficient tab and confirm the top horizontal scrollbar and wide
    layout improve access to right-side WFM columns.

## 5. Current Limitations

- `VITE_DATA_BACKEND=supabase` remains the active path.
- API DB smoke is deferred.
- Tomcat API production cutover is deferred.
- Backend authoritative audit remains to be verified in API mode.
- SSO, JWT, OIDC, and SAML are not implemented.
- Jenkins deployment is not implemented.
- Server-side recalculation is not implemented.
- Coefficient grid sticky left column is not implemented.
- User and permission management screens are excluded from the June required
  scope.
- SSO and internal framework replacement are excluded from the June required
  scope.
- `actual_effort_mm` Enter-specific smoke remains SKIP where direct evidence
  was not captured.
- `updated_at` re-smoke is WAIVED or DEFERRED where it does not block the
  business workflow.

## 6. July-And-Later Follow-Up Work

- Resume API DB smoke after the internal DB is ready.
- Move toward Tomcat API production operation.
- Complete production auth, permission, and audit cutover.
- Add Jenkins deployment pipeline.
- Design server-side recalculation.
- Add coefficient grid sticky left column or WFM quick navigation UX.
- Verify backend authoritative export/download audit.

## 7. Decisions

- The end-of-June completion scope is fixed as Supabase-mode first completion.
- Internal DB and Tomcat API production transition move to July or later.
- API mode remains scaffolded and contract-ready, but not production-ready.
- API DB smoke is required before production operation.

## 8. One-Page Team Lead Summary

### Completed

The Standard Effort first completion scope is complete in Supabase mode:
estimation, project save paths, meta admin management, export, and key UX
improvements are available.

### Verified

Smoke checks, Standard Effort Excel export, meta admin save/restore, targeted
coefficient grid tests, full frontend tests, and build have passed.

### Remaining

Remaining work is mostly production transition work: internal DB setup, Tomcat
API DB smoke, production auth/permission/audit enforcement, Jenkins deployment,
and optional server-side recalculation.

### Risks

The current path still uses Supabase direct access. Frontend audit is not
authoritative. Production transition must verify API DB behavior, logical
reference checks, permissions, and backend audit.

### Schedule Direction

June can close as Supabase-mode first completion. July should focus on internal
DB readiness, API smoke, backend enforcement, deployment automation, and
targeted admin-grid UX polish.
