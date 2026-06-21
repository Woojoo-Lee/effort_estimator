# Standard Effort June Sign-Off

## 1. Purpose

This document records the first completion scope for the Standard Effort
system as of the end of June. It summarizes completed functionality,
verification results, current limitations, follow-up work, and operating risks.

The sign-off target is the Supabase-mode Standard Effort workflow. Tomcat API
database smoke and production backend enforcement remain deferred until the
internal DB environment is ready.

For team lead sharing, demo flow, and one-page reporting, see
[Standard Effort June Report Package](./standard-effort-june-report-package.md).
The June completion gate also includes the minimum login, role permission, and
audit actor scope described in
[Auth, Permission, And Audit Actor Minimum Scope](./auth-permission-audit-minimum-scope.md).
For the final June login, permission, row history, password reset, and
development release policy sign-off, see
[Auth, Permission, Row History Sign-Off](./auth-permission-row-history-signoff.md).
For the remaining June delivery cutline and stabilization freeze, see
[June Delivery Cutline](./june-delivery-cutline.md).

## 2. First Completion Criteria

### Included Scope

- Standard Effort calculation and usage in Supabase mode.
- Project-level solution selection save.
- Project-level item checkbox save.
- `actual_effort_mm` save.
- Refresh after save keeps the stored Standard Effort values.
- Standard Effort meta admin load, save, and restore.
- Base effort save and restore.
- Coefficient save and restore.
- Solution variant and item active toggle save and restore.
- Standard Effort Excel export in `standard + supabase` mode.
- Coefficient grid usability improvement for right-side WFM columns.
- ID/password app login with no email login.
- `admin` / `sales` / `viewer` role-based frontend UI permission.
- Minimum row history responsibility tracking through business table
  `updated_by` / `updated_at`.
- Admin-manual password reset operating procedure.
- Development and release policy for feature branches, scheduled Production
  releases, hotfixes, rollback, and secret handling.

### Excluded Scope

- Internal PostgreSQL DB integration.
- Tomcat API production cutover.
- SSO, JWT, OIDC, or SAML integration.
- Jenkins deployment pipeline.
- Server-side Standard Effort recalculation.
- Production backend authoritative audit verification.
- SSO, internal framework replacement, serverless conversion, and user
  management screens.
- Detailed `app_audit_logs` event history.
- Logged-in user password change screen.
- Meta base effort row history smoke.
- Active toggle row history smoke.

## 3. Completed Functionality

- Standard mode estimator screen.
- Standard Effort result summary.
- Solution toggle save path.
- Item checkbox save path.
- `actual_effort_mm` save path.
- Standard Effort refresh path.
- Meta admin base effort editing.
- Meta admin coefficient editing.
- Meta admin active toggle editing.
- Supabase-mode Standard Effort export.
- Project archive and restore UX.
- Auth, read-only, route, sidebar, and header permission skeletons.
- ID/password app login with `admin01`, `sales01`, and `viewer01` smoke.
- Role-based frontend UI permissions for `admin`, `sales`, and `viewer`.
- Row history smoke PASS for `actual_effort_mm`, solution toggle, item
  checkbox, and meta coefficient.
- Admin-manual password reset policy.
- Development and release policy.
- Frontend audit policy:
  - `auto`
  - `enabled`
  - `disabled`
  - `shadow`
- Tomcat backend scaffold and API contract preparation.

## 4. Smoke Result Summary

Reference documents:

- [Supabase Mode Interim Smoke Result](./supabase-mode-interim-smoke-result.md)
- [Standard Effort API Smoke Result](./standard-effort-api-smoke-result.md)
- [Supabase Standard Effort Export Design](./supabase-standard-effort-export-design.md)

Current summary:

- Supabase-mode Standard Effort estimator save paths passed.
- Standard Effort meta admin save and restore smoke passed.
- Standard Effort Excel export in `standard + supabase` mode passed.
- Coefficient grid UX improvement passed targeted, full test, and build gates.
- Tomcat API DB smoke remains deferred until internal DB readiness.

## 5. Test And Build Results

Current frontend gate:

- `npm.cmd run test:run`: PASS.
- `npm.cmd run build`: PASS.
- Known build output: Vite large chunk warning only.

Backend status:

- Tomcat backend scaffold exists for the future API path.
- DB-backed domain endpoint smoke is not part of this June sign-off gate.
- API DB smoke remains deferred until DB credentials, seed data, and audit
  support tables are available.

## 6. Current Limitations

- `VITE_DATA_BACKEND=supabase` remains the active development path.
- Tomcat API DB integration is deferred.
- API DB smoke is deferred.
- Backend authoritative audit will be verified in API mode later.
- `actual_effort_mm` Enter-specific smoke remains skipped where direct manual
  evidence was not captured.
- `updated_at` re-smoke is waived or deferred where it does not block the
  business workflow.
- Coefficient grid sticky left column is not implemented.
- Server-side recalculation is not implemented.

## 7. Operating Risks And Controls

- Supabase direct mode is an interim development path.
  - Control: keep production cutover gated by Tomcat API DB smoke.
- Meta values can affect calculation output.
  - Control: use save and restore smoke when modifying base effort,
    coefficients, or active state.
- Frontend audit is not authoritative.
  - Control: use backend authoritative audit for production API mode.
- Internal DB cutover can expose permission, audit, or reference-integrity gaps.
  - Control: rerun API smoke after DB readiness.
- `project_id` is bigint/int8, while solution and item identifiers are UUID
  strings.
  - Control: do not convert `project_id` to UUID.
- All Standard Effort effort values are M/M.
  - Control: do not apply M/D to M/M numeric conversion.

## 8. Follow-Up Phase Candidates

Recommended order:

1. Resume Phase 9-I-10-R API DB smoke after the internal DB is ready.
2. Add Phase 10-C-2 coefficient grid usability follow-up:
   - sticky left column, or
   - WFM quick navigation/filter UX.
3. Design server-side recalculation.
4. Prepare Tomcat API deployment and Jenkins pipeline.
5. Complete production auth, permission, and audit cutover.

## 9. Team Lead Summary

### Completed

The first Standard Effort workflow is complete for Supabase mode. Users can
calculate Standard Effort, save project-level selections, manage actual effort
in M/M, refresh saved values, administer meta data, and export Standard Effort
Excel output.

### Verified

The main estimator save paths, meta admin save/restore paths, Supabase Standard
Effort export, coefficient grid UX improvement, frontend tests, and frontend
build have passed.

### Remaining

The remaining work is mainly production transition work: internal DB smoke,
Tomcat API DB integration, authoritative backend audit, production auth, Jenkins
deployment, and optional server-side recalculation.

### End-Of-June Judgment

The June first-completion scope is acceptable for Supabase-mode Standard Effort
operation and validation. It is not a production Tomcat API cutover sign-off.

### July And Later Transition Work

The July focus should be internal DB readiness, API DB smoke, backend
permission/audit enforcement, deployment automation, and targeted UX polish for
wide coefficient grids.
