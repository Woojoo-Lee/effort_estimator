# Auth, Permission, And Audit Actor Minimum Scope

## 1. Purpose

This document fixes the minimum login, permission, and audit actor scope needed
to protect the end-of-June delivery schedule.

Internal framework replacement, serverless conversion, production SSO, and full
Tomcat API cutover are separated into later development. The June target is a
small operating layer on top of the current app and Supabase-mode Standard
Effort workflow.

## 2. Current Decision

Plan A is selected for the June delivery:

- Keep the current React/Vite app.
- Keep `VITE_DATA_BACKEND=supabase`.
- Do not implement SSO for the June delivery.
- Do not replace the internal framework in the June delivery.
- Treat internal PostgreSQL DB conversion as a smoke/stretch track.
- Exclude user and permission management screens from the required June scope.
- Use a small set of manually managed users.
- Add minimum login, role permissions, and audit actor tracking.

## 3. Role Model

The June role model has three roles:

- `admin`
  - Full access for Standard Effort operation, meta management, project work,
    export, and audit review.
- `sales`
  - Sales-facing project and Standard Effort selection work.
  - Can create and edit projects.
  - Can save Standard Effort solution/item selections.
  - Cannot edit `actual_effort_mm`.
  - Cannot access Standard Effort meta admin.
- `viewer`
  - Read-only access.
  - Cannot save project, Standard Effort, meta, or active-state changes.

## 4. Permission Matrix

| Screen or action | admin | sales | viewer |
| --- | --- | --- | --- |
| Project list read | Yes | Yes | Yes |
| Project create | Yes | Yes | No |
| Project save/update | Yes | Yes | No |
| Project archive/restore | Yes | No by default | No |
| Standard Effort section read | Yes | Yes | Yes |
| Solution toggle save | Yes | Yes | No |
| Item checkbox save | Yes | Yes | No |
| `actual_effort_mm` edit | Yes | No | No |
| Standard Effort refresh | Yes | Yes | Yes |
| Excel export | Yes | Yes by default | Yes by read policy |
| Standard Effort meta page access | Yes | No | No |
| Base effort edit | Yes | No | No |
| Coefficient edit | Yes | No | No |
| Active toggle edit | Yes | No | No |
| Audit log read | Yes | No by default | No by default |

Policy notes:

- Sales can save the commercial/scope selections needed during estimation.
- `actual_effort_mm` belongs to the implementation lead/admin management area.
- Viewer can inspect data but cannot mutate it.
- Frontend guards are UX controls in Supabase mode, not a production security
  boundary.

## 5. `actual_effort_mm` Policy

`actual_effort_mm` is managed by the implementation lead or admin role.

- `admin`: can edit and save.
- `sales`: read-only.
- `viewer`: read-only.

UI policy:

- Sales and viewer users see the actual effort value but the input is disabled
  or read-only.
- Save handlers must not run for sales/viewer actual effort edits.
- Admin actual effort updates write audit events with actor information.

Audit event:

- `standard_effort.actual_effort.update`

Required actor fields:

- `actor_user_id`
- `actor_email`

## 6. Login Method

SSO is not part of the June required scope.

Candidate login models:

- Supabase Auth email/password.
- A simple login screen backed by manually managed users.

Required constraints:

- Do not hardcode passwords in frontend source.
- Do not store service-role secrets in frontend env.
- User creation can be manual for June.
- User and permission management screens are excluded from the required June
  scope.

Recommended June direction:

- Prefer Supabase Auth email/password if available quickly.
- Keep the user set small and manually managed.
- Map authenticated users to one of `admin`, `sales`, or `viewer`.

## 7. Audit Actor Policy

All save events should include actor identity where available.

Target events:

- `project.create`
- `project.update`
- `standard_effort.solution.toggle`
- `standard_effort.item.check`
- `standard_effort.actual_effort.update`
- `standard_effort_meta.base_effort.update`
- `standard_effort_meta.coefficient.update`
- `standard_effort_meta.active.update`

June policy:

- Frontend/Supabase mode records actor metadata through existing non-blocking
  audit paths.
- Audit failure must not block business save success.
- Actor-less legacy audit rows may remain in the database.
- New rows should include actor identity after the minimum auth implementation.

Post-June policy:

- Tomcat API/backend becomes authoritative for audit.
- Frontend audit is disabled or shadowed in API mode according to
  `VITE_FRONTEND_AUDIT_MODE`.

## 8. Implementation Order

### Phase 11-B

- Define auth user/session model.
- Add login page skeleton.
- Add current user provider.

Status: implemented as a Supabase Auth email/password login/session skeleton.
`VITE_AUTH_LOGIN_MODE` defaults to `disabled`, so the existing app remains
available without login unless `VITE_AUTH_LOGIN_MODE=supabase` is explicitly
set. Role and permission application is still deferred to Phase 11-C/D.

### Phase 11-C

- Add role and permission mapping.
- Add `admin` / `sales` / `viewer` permission resolver.
- Apply route, menu, and button guards.

### Phase 11-D

- Make Standard Effort meta admin editable only by `admin`.
- Make `actual_effort_mm` read-only for `sales`.
- Make the app globally read-only for `viewer`.

### Phase 11-E

- Add audit actor fields to save audit payloads.
- Verify `actor_email` and `actor_user_id` in SQL smoke.

### Phase 11-F

- Run browser smoke for `admin`, `sales`, and `viewer`.
- Update June sign-off/report documents.

### Separate Stretch Track: Phase 11-DB-0

- Run internal PostgreSQL DB health and schema smoke.
- Keep this separate from the June minimum delivery gate.

## 9. Internal DB, Serverless, And Apache/Tomcat Decision

- Apache + Tomcat is not required for the June completion gate.
- Spring Boot standalone execution remains possible for backend smoke.
- Serverless conversion is excluded from the June scope.
- Internal DB conversion is a smoke/stretch track, not a delivery blocker.
- Internal framework replacement is second-phase development.

## 10. Risks And Controls

- Risk: frontend guards are mistaken for production security enforcement.
  - Control: document them as Supabase-mode UX controls only.
- Risk: actor-less legacy audit rows mix with new actor-bearing rows.
  - Control: record the transition date and include actor fields for new saves.
- Risk: sales can edit `actual_effort_mm` by mistake.
  - Control: centralize permission checks and smoke sales read-only behavior.
- Risk: direct meta admin route access bypasses menu hiding.
  - Control: enforce route-level admin checks.
- Risk: adding user management screens expands June scope.
  - Control: keep user creation manual for June.
- Risk: making internal DB cutover a completion condition threatens schedule.
  - Control: keep DB smoke as a separate stretch track.

## 11. Updated June Completion Criteria

The updated June completion criteria are:

- Supabase-mode Standard Effort functionality complete.
- Minimum login, role permission, and audit actor support included.
- Internal DB conversion excluded.
- Tomcat API production cutover excluded.
- Serverless conversion excluded.
- Internal framework replacement excluded.
