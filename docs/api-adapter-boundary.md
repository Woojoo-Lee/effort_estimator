# API Adapter Boundary

## Purpose

This boundary prepares the estimator frontend to move from direct Supabase
repositories to a Tomcat API backed by PostgreSQL. The transition should be
incremental: UI, hooks, and stores keep using domain repository functions while
the repository internals can later delegate to either Supabase adapters or API
adapters.

## Environment

- `VITE_DATA_BACKEND=supabase|api`
- `VITE_API_BASE_URL=https://example.internal/api`

The current default backend is `supabase`. API mode is reserved for later
phases and should not be treated as implemented by this skeleton.

## Adapter Structure

Keep the existing domain repository facade names:

- `projectService`
- `standardEffortRepository`
- `standardEffortMetaRepository`
- `authPermissionRepository`
- `auditLogRepository`

Future phases can split each facade internally:

- `supabaseAdapter`: current direct Supabase implementation
- `apiAdapter`: Tomcat API implementation
- facade resolver: chooses adapter using `VITE_DATA_BACKEND`

## Data Shape

DB, API, and frontend domain objects should keep snake_case fields to minimize
conversion risk:

- `project_id`
- `solution_variant_id`
- `actual_effort_mm`
- `standard_effort_mm`
- `gap_mm`

Existing mappers remain responsible for number, boolean, null, and fallback
normalization. No M/D to M/M conversion is allowed.

## Authority

Frontend route guards are UX controls only. In the final operating model,
Tomcat API middleware must enforce permission checks and write authoritative
audit logs. The database should be accessed by the API service account, not by
the browser.

## Phase Plan

- Phase 7-B-1: add backend resolver and repository contract skeleton.
- Phase 7-B-2: convert a repository facade to delegate without changing behavior.
- Phase 7-C: add API client skeleton and normalized API error shape.
- Phase 7-D: implement standard effort read API adapter.
- Phase 7-E: implement write and meta admin API adapters.

## Phase 7-B-2 Status

`standardEffortRepository` now acts as the first repository facade. The default
adapter remains Supabase, so store, hook, and UI imports do not change. The API
adapter currently exposes the same method names but throws a clear
not-implemented error until the Tomcat API client is added in a later phase.

## Phase 7-C Status

A common API client skeleton now exists for later API adapters. It is not wired
to any domain repository yet.

The recommended Tomcat response wrapper is:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "request-id"
  }
}
```

Error responses should use:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access is denied.",
    "details": {},
    "request_id": "request-id"
  }
}
```

The client skeleton provides request id propagation through `X-Request-Id` and
an auth header placeholder through `Authorization: Bearer <token>`. It keeps
snake_case request and response payloads untouched. `VITE_API_BASE_URL` is
resolved by later adapter/factory phases, not by the API client itself.

Permission checks and authoritative audit logging remain Tomcat API
responsibilities in the final operating model.

## Phase 7-D Status

`standardEffortApiAdapter` now implements read-only API paths:

- `GET /api/standard-effort/meta`
- `GET /api/projects/{projectId}/standard-effort`

The project standard effort endpoint may return either the full standard effort
input shape or only project selections. When it returns only selections, the
adapter also calls the meta endpoint and combines the result with
`buildStandardEffortInput`.

The write methods remain explicit not-implemented stubs:

- `upsertProjectSolutionSelections`
- `upsertProjectItemSelections`
- `updateProjectActualEffort`

`VITE_API_BASE_URL` is required only when the API adapter read function is
called. The default data backend remains Supabase, and injected clients still
force the Supabase adapter for existing test compatibility.

## Phase 7-E-1 Status

`standardEffortApiAdapter` now implements the solution selection write path:

- `PUT /api/projects/{projectId}/standard-effort/solutions`

The request body keeps snake_case fields and bigint-compatible project ids:

```json
{
  "project_id": "42",
  "selections": [
    {
      "project_id": "42",
      "solution_variant_id": "variant-pbx",
      "enabled": true,
      "actual_effort_mm": 3.5
    }
  ]
}
```

The adapter accepts several response shapes (`projectSolutionSelections`,
`selections`, `rows`, or an array) and normalizes the result back to the existing
repository shape. If the API returns no rows, it falls back to the normalized
input selections. `actual_effort_mm` remains the output field; `actual_effort_md`
is only accepted as a fallback input name and no M/D to M/M conversion is
performed.

The remaining standard effort write paths are still explicit stubs:

- `upsertProjectItemSelections`
- `updateProjectActualEffort`

When Tomcat API becomes authoritative, frontend safe audit logs can duplicate
backend audit logs. A follow-up phase should choose one policy before API mode
is used operationally: disable frontend audit in API mode, mark it as
`frontend_shadow` metadata, or let the backend fully own audit logging.

## Phase 7-E-2 Status

`standardEffortApiAdapter` now implements the item check write path:

- `PUT /api/projects/{projectId}/standard-effort/items`

The request body keeps project ids and logical references unchanged:

```json
{
  "project_id": "42",
  "selections": [
    {
      "project_id": "42",
      "solution_variant_id": "variant-pbx",
      "item_id": "item-a",
      "checked": true
    }
  ]
}
```

The adapter normalizes `checked` to a boolean and requires both
`solution_variant_id` and `item_id` before calling the API. It accepts
`projectItemSelections`, `project_item_selections`, `selections`, `rows`, or an
array response and normalizes the output to the existing repository shape. If
the API returns no rows, it falls back to the normalized input selections.

The actual effort write path is still an explicit stub:

- `updateProjectActualEffort`

Frontend safe audit logging remains unchanged. API mode can still duplicate
backend authoritative audit once Tomcat writes audit logs, so the same follow-up
policy from Phase 7-E-1 is required before operational use.

## Phase 7-E-3 Status

`standardEffortApiAdapter` now implements the actual effort write path:

- `PUT /api/projects/{projectId}/standard-effort/actual-effort`

The request body intentionally updates only the M/M actual effort value:

```json
{
  "project_id": "42",
  "solution_variant_id": "variant-pbx",
  "actual_effort_mm": 4.5
}
```

`solution_variant_id` is required. Empty, null, or undefined actual effort
values are normalized to `0`. `actual_effort_md` is accepted only as a fallback
input name when a caller provides an object; the outgoing request and returned
repository shape remain `actual_effort_mm`, with no M/D to M/M conversion.

The adapter accepts `projectSolutionSelection`, `project_solution_selection`,
`row`, `rows[0]`, `selection`, a direct object, or `array[0]` response and
normalizes the output to the existing single project solution selection shape.
If the API returns no row, it falls back to:

```json
{
  "project_id": "42",
  "solution_variant_id": "variant-pbx",
  "enabled": true,
  "actual_effort_mm": 4.5
}
```

At this point the `standardEffortApiAdapter` contract methods are implemented
for read, solution write, item write, and actual effort write. The default data
backend remains Supabase, and API mode still depends on future Tomcat endpoint
implementation before operational use.

Frontend safe audit logging remains unchanged. API mode can duplicate backend
authoritative audit once Tomcat writes audit logs, so a follow-up phase must
still choose whether to disable frontend audit in API mode, mark it as
`frontend_shadow`, or make backend audit the only authoritative path.

## Phase 7-F-1 Status

`standardEffortMetaRepository` is now prepared as the meta admin repository
facade. Store, hook, page, and component imports continue to use the same
repository path.

The current structure is:

- facade: `src/services/standardEffortMetaRepository.js`
- default adapter: `src/services/adapters/supabase/standardEffortMetaSupabaseAdapter.js`
- API stub: `src/services/adapters/api/standardEffortMetaApiAdapter.js`
- factory: `src/services/adapters/standardEffortMetaAdapterFactory.js`

The Supabase adapter remains the default and preserves the existing admin
metadata behavior, including inactive rows. The API adapter exposes the same
contract surface but throws clear not-implemented errors until the Tomcat API
paths are implemented in later phases.

`buildStandardEffortMetaSummary` remains a pure synchronous export from the
facade surface. It is currently re-exported from the Supabase adapter module to
avoid a broader helper-file refactor in this phase.

Meta admin frontend audit remains `createAuditLogSafe` based. Before API mode
is used operationally, choose the same duplicate-audit policy noted above:
disable frontend audit in API mode, mark it as `frontend_shadow`, or make
backend audit fully authoritative.

## Phase 7-F-2 Status

`standardEffortMetaApiAdapter` now implements the meta admin read path:

- `GET /api/standard-effort/admin/meta`

The endpoint is for admin metadata and must include inactive rows. It is
separate from the standard effort calculation read endpoints, which may filter
to active rows.

The accepted response data shape is either direct arrays:

```json
{
  "solutions": [],
  "solutionVariants": [],
  "baseEffortRows": [],
  "itemRows": [],
  "coefficientRows": [],
  "summary": {}
}
```

or arrays nested under `meta`, and snake_case keys are also accepted:

- `solution_variants`
- `base_effort_rows`
- `item_rows`
- `coefficient_rows`

The repository return shape remains unchanged and does not include `summary`.
The frontend continues to compute validation data with
`buildStandardEffortMetaSummary(meta)` as a fallback. `effort_mm` remains the
output field, with `effort_md` accepted only as a fallback input name and no
M/D to M/M conversion. Coefficients remain unitless.

The meta admin write paths are still explicit API stubs:

- `upsertStandardBaseEffortRows`
- `upsertStandardCoefficientRows`
- `updateStandardSolutionVariantActive`
- `updateStandardItemActive`

Frontend safe audit logging remains unchanged. Before API mode is used
operationally, the duplicate-audit policy must still be settled.

## Phase 7-F-3 Status

`standardEffortMetaApiAdapter` now implements the base effort write path:

- `PUT /api/standard-effort/admin/base-effort/{solutionVariantId}`

The request body keeps the solution variant logical reference unchanged:

```json
{
  "solution_variant_id": "variant-pbx",
  "phase_rows": [
    {
      "phase_code": "analysis",
      "phase_name": "Analysis",
      "effort_mm": 1.5,
      "display_order": 10,
      "active": true
    }
  ]
}
```

The adapter validates `solution_variant_id`, `phase_rows`, allowed
`phase_code` values, `phase_name`, and non-negative numeric `effort_mm` before
calling the API. Empty, null, or undefined effort values are normalized to `0`.
`effort_md` is accepted only as a fallback input name; outgoing request and
repository output remain `effort_mm`, with no M/D to M/M conversion.

Accepted response data keys are `baseEffortRows`, `base_effort_rows`,
`phaseRows`, `phase_rows`, `rows`, or an array. If the API returns no rows, the
adapter falls back to the normalized request rows. The coefficient and active
write paths remain explicit stubs:

- `upsertStandardCoefficientRows`
- `updateStandardSolutionVariantActive`
- `updateStandardItemActive`

Frontend safe audit logging remains unchanged. API mode can still duplicate
backend authoritative audit once Tomcat writes audit logs, so the follow-up
duplicate-audit policy remains required before operational use.

## Phase 7-F-4 Status

`standardEffortMetaApiAdapter` now implements the coefficient write path:

- `PUT /api/standard-effort/admin/coefficients/{itemId}`

The request body keeps the item logical reference unchanged and does not include
any effort fields:

```json
{
  "item_id": "item-a",
  "coefficient_rows": [
    {
      "solution_variant_id": "variant-pbx",
      "coefficient": 1.75,
      "active": true
    }
  ]
}
```

The adapter validates `item_id`, `coefficient_rows`, `solution_variant_id`, and
non-negative numeric `coefficient` before calling the API. Empty, null, or
undefined coefficients are normalized to `0`; coefficients are unitless and no
M/D to M/M conversion is performed.

Accepted response data keys are `coefficientRows`, `coefficient_rows`, `rows`,
`coefficients`, or an array. If the API returns no rows, the adapter falls back
to the normalized request rows. The active write paths remain explicit stubs:

- `updateStandardSolutionVariantActive`
- `updateStandardItemActive`

Frontend safe audit logging remains unchanged. API mode can still duplicate
backend authoritative audit once Tomcat writes audit logs, so the follow-up
duplicate-audit policy remains required before operational use.

## Phase 7-F-5 Status

`standardEffortMetaApiAdapter` now implements the active write paths:

- `PUT /api/standard-effort/admin/solution-variants/{solutionVariantId}/active`
- `PUT /api/standard-effort/admin/items/{itemId}/active`

The request bodies intentionally contain only the logical target id and the
boolean active flag:

```json
{
  "solution_variant_id": "variant-pbx",
  "active": false
}
```

```json
{
  "item_id": "item-a",
  "active": false
}
```

The adapter requires `active` to be a boolean and does not coerce string values
such as `"true"` or `"false"`. It also keeps active writes separate from
`effort_mm`, `coefficient`, and `actual_effort_mm` payloads. `active=false` is
preserved so inactive admin rows remain visible in meta management responses.

Accepted variant response keys are `solutionVariant`, `solution_variant`,
`row`, `rows[0]`, `variant`, a direct object, or `array[0]`. Accepted item
response keys are `item`, `standardItem`, `standard_item`, `row`, `rows[0]`, a
direct object, or `array[0]`. If the API returns no row, the adapter falls back
to the input id and active value.

At this point the `standardEffortMetaApiAdapter` main CRUD paths are
implemented for admin read, base effort write, coefficient write, solution
variant active write, and item active write. A dedicated validation summary
endpoint is still not implemented.

Frontend safe audit logging remains unchanged. API mode can still duplicate
backend authoritative audit once Tomcat writes audit logs, so the follow-up
duplicate-audit policy remains required before operational use.

## Phase 7-G-1 Status

Frontend audit policy helpers are introduced to prevent duplicate audit rows
when API mode eventually writes authoritative backend audit logs.

The new environment variable is:

- `VITE_FRONTEND_AUDIT_MODE=auto|enabled|disabled|shadow`

The default mode is `auto`:

- `VITE_DATA_BACKEND=supabase` -> frontend audit enabled
- `VITE_DATA_BACKEND=api` -> frontend audit disabled

Explicit modes are:

- `enabled`: always write frontend audit rows
- `disabled`: never write frontend audit rows
- `shadow`: write frontend audit rows as non-authoritative shadow audit

Shadow mode decorates `metadata_json` with:

```json
{
  "audit_source": "frontend",
  "data_backend": "api",
  "frontend_shadow": true
}
```

Operational API deployments should use:

```env
VITE_DATA_BACKEND=api
VITE_FRONTEND_AUDIT_MODE=disabled
```

API proof-of-concept environments may use `shadow` to compare frontend audit
events against Tomcat/backend audit events, but shadow mode should not be left
enabled for normal operation.

Tomcat API remains the authoritative audit owner in the final operating model.
This phase only adds the policy helper and documentation; existing
`createAuditLogSafe` call sites are not wired to the policy yet.

## Phase 8-B Status

`projectService` is now prepared as a facade for the project repository
boundary. Existing UI, hook, and store imports continue to use
`src/services/projectService.js`; the internal implementation can now select a
Supabase or API adapter by `VITE_DATA_BACKEND`.

- facade: `src/services/projectService.js`
- default adapter: `src/services/adapters/supabase/projectSupabaseAdapter.js`
- API stub: `src/services/adapters/api/projectApiAdapter.js`
- selector: `src/services/adapters/projectAdapterFactory.js`

The Supabase adapter preserves the existing `{ data, error }` surface, table
names, ordering, project payload shape, and legacy estimator behavior. The API
adapter is intentionally a stub in this phase and returns not implemented
results without using `fetch`, `createApiClient`, or `VITE_API_BASE_URL`.

Project payloads remain legacy estimator payloads only. Standard effort
solution selections, item selections, and `actual_effort_mm` stay owned by
`standardEffortRepository`. `project_id` remains bigint/int8 compatible and is
not converted to UUID. `dbReady` still depends on `isSupabaseReady`; a later
phase should align readiness messaging with `VITE_DATA_BACKEND=api` before API
mode is treated as operational.

## Phase 8-C Status

`projectApiAdapter` now implements the project read path while keeping the
existing Supabase-style `{ data, error }` repository surface:

- `fetchProjects` -> `GET /api/projects`
- `fetchProjectById(projectId)` -> `GET /api/projects/{projectId}`

`VITE_API_BASE_URL` is read only when a project API adapter function is called.
If it is missing, the adapter returns `{ data: null, error }` instead of
throwing through the project service surface. API client errors are handled the
same way.

The read adapter accepts project list responses from `projects`, `rows`,
`data`, or direct arrays. Single project responses may use `project`, `row`,
`rows[0]`, or a direct project object. Project `id` values remain bigint/int8
compatible numbers or numeric strings; no UUID conversion is performed.

Project payloads remain legacy estimator payloads. Standard effort solution
selections, item selections, and `actual_effort_mm` are not added to project
payloads and remain owned by `standardEffortRepository`.

Project write, delete, version, codebook, and legacy estimator meta methods are
still API stubs in this phase. Supabase remains the default backend.

## Phase 8-D Status

`projectApiAdapter` now implements the project save path while keeping the
existing Supabase-style `{ data, error }` repository surface:

- new project save -> `POST /api/projects`
- existing project save -> `PUT /api/projects/{projectId}`

The create request body contains the legacy project payload only:

```json
{
  "project_name": "Project A",
  "payload": {}
}
```

The update request body also includes the bigint-compatible project id:

```json
{
  "project_id": "42",
  "project_name": "Project A",
  "payload": {}
}
```

Project ids remain numbers or numeric strings and are only URL encoded for the
path; they are not converted to UUIDs. API errors and missing
`VITE_API_BASE_URL` are returned as `{ data: null, error }`.

The save response accepts `project`, `row`, `rows[0]`, `data`, or a direct
project object and normalizes it back to the existing project service surface.
Project payloads remain legacy estimator payloads. Standard effort selections,
items, and `actual_effort_mm` remain owned by `standardEffortRepository` and are
not added to project save payloads.

Project delete, version, codebook, and legacy estimator meta methods are still
API stubs in this phase. Supabase remains the default backend.

## Phase 8-F-1 Status

`projectApiAdapter` now implements `deleteProjectById(projectId)` as an archive
operation in API mode:

- `PUT /api/projects/{projectId}/archive`

The adapter intentionally does not call the hard delete endpoint
`DELETE /api/projects/{projectId}`. The request body includes the
bigint-compatible project id:

```json
{
  "project_id": "42"
}
```

This keeps the existing frontend function name and store/hook surface while
mapping operational API mode to safer soft delete behavior. Supabase mode is
unchanged and still uses the existing Supabase adapter hard delete behavior.

The archive response accepts `project`, `row`, `rows[0]`, `data`, or a direct
project/archive object and normalizes it back to the project service
`{ data, error }` surface. If the API returns no row, the adapter returns
`{ data: null, error: null }`.

Project ids remain bigint/int8-compatible numbers or numeric strings and are
not converted to UUIDs. Standard effort selections, items, and
`actual_effort_mm` are not included in the archive request body.

Hard delete is deferred as a future system-admin/admin-only capability because
physical FKs are intentionally absent and hard delete can leave orphan project
versions, standard effort selections, project members, or audit references.
Archive schema fields such as `status`, `archived_at`, and `archived_by` remain
Phase 8-F-2 candidates.

## Phase 8-F-4 Status

`projectApiAdapter.fetchProjects` now accepts optional query options while
preserving the existing zero-argument call:

```js
fetchProjects()
fetchProjects({ includeArchived: true })
fetchProjects({ status: "archived" })
```

The default call remains:

- `GET /api/projects`

Tomcat API is responsible for treating the default list as active-only, meaning
archived projects should be excluded unless explicitly requested.

Supported API query mappings are:

- `fetchProjects({ includeArchived: true })` -> `GET /api/projects?include_archived=true`
- `fetchProjects({ status: "active" })` -> `GET /api/projects?status=active`
- `fetchProjects({ status: "archived" })` -> `GET /api/projects?status=archived`

If `status` is provided, it takes precedence over `includeArchived` so the
adapter sends only the `status` query. Invalid status values return the existing
`{ data: null, error }` project service surface.

The adapter only passes query parameters. It does not enforce permissions for
`include_archived`; Tomcat API must validate that only authorized users can view
archived projects. The Supabase adapter is intentionally unchanged in this
phase, and UI support for archived toggles, badges, and restore actions remains
a later phase.

## Phase 8-F-9 Status

`projectService` now exposes `restoreProjectById(projectId, options?)` through
the same project repository facade boundary.

In API mode the project API adapter maps restore to:

- `PUT /api/projects/{projectId}/restore`

The request body always includes the bigint-compatible project id:

```json
{
  "project_id": "42"
}
```

When a restore reason is explicitly supplied by the caller, the adapter sends it
as `restore_reason`:

```json
{
  "project_id": "42",
  "restore_reason": "user request"
}
```

Empty, `null`, or `undefined` restore reasons are omitted. Project ids are URL
encoded for the path but are otherwise preserved in the body; they are not
converted to UUIDs. Standard effort selections, items, and `actual_effort_mm`
are not included in the restore request body.

The restore response accepts `project`, `row`, `rows[0]`, `data`, or a direct
project object and returns the existing `{ data, error }` project service
surface. If the API returns no row, the adapter returns
`{ data: null, error: null }`.

Supabase mode remains the default backend. Because Supabase mode still uses the
legacy hard delete behavior and does not expose the archive UI, the Supabase
project adapter provides an unsupported `restoreProjectById` result instead of
attempting a database update.

Restore UI, ProjectPage restore handlers, store restore actions, and frontend
audit wiring are intentionally deferred. Operational restore audit should be
authoritative in Tomcat as `project.restore`.

## Phase 8-G Status

`projectApiAdapter` now implements the project version API paths while keeping
the existing project service `{ data, error }` surface:

- `fetchProjectVersions(projectId)` -> `GET /api/projects/{projectId}/versions`
- `fetchLatestProjectVersionNo(projectId)` -> `GET /api/projects/{projectId}/versions/latest`
- `saveProjectVersion(input)` -> `POST /api/projects/{projectId}/versions`

The version create request body follows the existing `saveProjectVersion`
signature:

```json
{
  "project_id": "42",
  "version_no": 4,
  "saved_type": "manual",
  "project_name": "Project A",
  "payload": {}
}
```

Project ids remain bigint/int8-compatible numbers or numeric strings and are
only URL encoded for paths. The adapter accepts common response shapes such as
`versions`, `rows`, `data`, `version`, `row`, `rows[0]`, direct arrays, direct
objects, and latest-version numeric values. Latest version responses are
normalized so `data.version_no` remains available to existing store logic.

Project version payloads remain legacy project payloads only. Standard effort
solution selections, item selections, and `actual_effort_mm` are not added to
version request bodies or payloads. Tomcat should enforce project read/write
scope and write authoritative `project.version.create` audit for version
creation.

Codebook/common code and legacy estimator metadata API functions remain
explicit API adapter stubs in this phase. Version restore is also deferred.

## Phase 8-H Status

`projectApiAdapter` now implements the codebook/common code API paths while
keeping the existing project service `{ data, error }` surface:

- `fetchCommonCodes()` -> `GET /api/codebooks`
- `fetchCommonCodeRows()` -> `GET /api/codebooks/rows`
- `createCommonCodeRow(row)` -> `POST /api/codebooks`
- `updateCommonCodeRow(id, patch)` -> `PUT /api/codebooks/{id}`
- `updateCommonCodeActive(id, isActive)` -> `PUT /api/codebooks/{id}/active`

`fetchCommonCodeRows` keeps the existing no-argument Supabase signature, so the
API adapter uses `/codebooks/rows` for the full row list instead of accepting a
new `groupCode` argument.

Create request bodies keep common-code fields only:

```json
{
  "group_code": "solution",
  "code": "PBX",
  "code_name": "PBX",
  "code_value": "pbx",
  "description": "PBX solution",
  "sort_order": 0,
  "is_active": true
}
```

Update requests include the path id and normalized patch fields:

```json
{
  "id": "1",
  "code_name": "PBX updated",
  "sort_order": 10,
  "is_active": false
}
```

Active updates intentionally send only the logical id and boolean active state:

```json
{
  "id": "1",
  "is_active": false
}
```

The adapter accepts response rows from `codebooks`, `commonCodes`,
`common_codes`, `commonCodeRows`, `common_code_rows`, `codes`, `rows`, `data`,
direct arrays, `row`, `commonCode`, `common_code`, and direct objects. If an API
row uses `active`, the adapter exposes `is_active` as a fallback while
preserving snake_case output. Create requests default missing `sort_order` to
`0` and missing `is_active` to `true`.

Common code request payloads do not include standard effort fields such as
`effort_mm`, `actual_effort_mm`, `standard_effort_mm`, or `gap_mm`.

Legacy estimator metadata API functions remain explicit stubs in this phase:

- `fetchEstimationItemMeta`
- `fetchEstimationItemMetaRows`
- `fetchEstimationBaseEffortMeta`
- `fetchEstimationItemFieldMeta`
- `fetchEstimationEnvVarMeta`
- `fetchEstimationCalculationMeta`
- `fetchEstimationPolicy`

Tomcat should enforce codebook read/write permissions and write authoritative
audit for codebook create, update, and active changes. A dedicated codebook
write permission is still a future schema/seed decision.

## Phase 8-I Status

`projectApiAdapter` now implements the legacy estimator metadata read API paths
while keeping the existing project service `{ data, error }` surface:

- `fetchEstimationItemMeta()` -> `GET /api/legacy-estimator/item-meta`
- `fetchEstimationItemMetaRows()` -> `GET /api/legacy-estimator/item-meta/rows`
- `fetchEstimationBaseEffortMeta()` -> `GET /api/legacy-estimator/base-effort-meta`
- `fetchEstimationItemFieldMeta()` -> `GET /api/legacy-estimator/item-field-meta`
- `fetchEstimationEnvVarMeta()` -> `GET /api/legacy-estimator/env-var-meta`
- `fetchEstimationCalculationMeta()` -> `GET /api/legacy-estimator/calculation-meta`
- `fetchEstimationPolicy()` -> `GET /api/legacy-estimator/policy`

The adapter accepts common list response shapes such as `rows`, `items`,
`data`, direct arrays, and domain-specific keys like `itemMeta`,
`item_meta`, `baseEffortMeta`, `base_effort_meta`, `fieldMeta`,
`field_meta`, `envVarMeta`, `env_var_meta`, `calculationMeta`, and
`calculation_meta`.

`fetchEstimationPolicy` keeps the existing Supabase-style array return surface.
If the API returns a single `policy`, `row`, `data`, or direct object, the
adapter wraps it as a one-row array instead of changing the project service
contract.

Legacy estimator metadata fields are preserved as-is, including md/md-like
columns such as `default_base_md`, `base_md`, and `effort_md`. The adapter does
not add standard effort fields such as `effort_mm`, `actual_effort_mm`,
`standard_effort_mm`, or `gap_mm`, and it does not perform M/D <-> M/M
conversion.

The project API adapter now covers the existing project service contract for
project read/save/archive/restore, project versions, codebook/common code, and
legacy estimator metadata read paths. Export/report APIs remain a separate
future phase.

## Phase 8-J-1 Status

An export repository boundary has been added without connecting it to the UI:

- `src/services/exportRepository.js`
- `src/services/adapters/local/exportLocalAdapter.js`
- `src/services/adapters/api/exportApiAdapter.js`
- `src/services/adapters/exportAdapterFactory.js`
- `src/services/export/exportTypes.js`

The export repository currently exposes these contract methods:

- `fetchStandardEffortExportData(projectId, options?)`
- `fetchLegacyExportData(projectId, options?)`
- `downloadStandardEffortExport(projectId, options?)`
- `downloadLegacyExport(projectId, options?)`

`VITE_DATA_BACKEND=api` selects the API adapter stub. The default and Supabase
backend modes select the local adapter skeleton. The local adapter represents
the future boundary for existing frontend-local export behavior, but it does
not import `useExportManager`, `xlsx`, Blob helpers, or current export utils in
this phase.

At Phase 8-J-1, both local and API adapters returned `{ data: null, error }`
stub results. The API adapter did not call `createApiClient`, did not read
`VITE_API_BASE_URL`, and did not fetch from Tomcat yet. Existing
Header/useExportManager export behavior remained frontend-local.

The first recommended implementation target remains standard effort export data
through `GET /api/projects/{projectId}/standard-effort/export-data`, followed
by frontend Excel generation. A later phase may add Tomcat file stream export
through `GET /api/projects/{projectId}/standard-effort/export`.

Frontend export audit remains unconnected. Tomcat should own authoritative
`export.download` audit when API export endpoints are implemented.

## Phase 8-J-2 Status

`exportApiAdapter.fetchStandardEffortExportData(projectId, options?)` now
implements the standard effort export-data read path:

- `GET /api/projects/{projectId}/standard-effort/export-data`
- API-root path: `/projects/{projectId}/standard-effort/export-data`
- `options.includeCheckedItems === false` sends
  `include_checked_items=false`

The adapter keeps the export repository `{ data, error }` surface. Missing
`VITE_API_BASE_URL`, missing `projectId`, and API failures return
`{ data: null, error }`. Import/build time remains safe because API client
creation is delayed until the function call.

The standard effort export payload normalizer accepts direct payloads,
`exportData`, `export_data`, `standardEffort`, `results`, `totals`, `rows`,
`checked_items`, and `checkedItems`. It returns a normalized shape with:

- `project`
- `standard_effort.results`
- `standard_effort.totals`
- `selections.projectSolutionSelections`
- `selections.projectItemSelections`
- `checked_items`

Standard effort M/M fields are preserved and normalized as numbers:
`base_total_mm`, `standard_effort_mm`, `actual_effort_mm`, and `gap_mm`.
`coefficient_total` is preserved as a unitless numeric total. `checked_items`
normalizes `coefficient` to a number and `checked` to boolean.

Legacy md/md-like fields such as `default_base_md`, `base_md`, and `effort_md`
are not added to standard effort export rows. The adapter does not perform
M/D <-> M/M conversion.

The following export functions remain API stubs:

- `fetchLegacyExportData`
- `downloadStandardEffortExport`
- `downloadLegacyExport`

The local export adapter is unchanged. Header/useExportManager are still not
connected to `exportRepository`, so existing frontend-local Excel/JSON export
behavior is unchanged. Frontend export audit remains unconnected; Tomcat owns
authoritative `export.download` audit for API export endpoints.

## Phase 8-J-3 Status

`src/utils/export/standardEffortExportMapper.js` has been added as a pure
mapper from standard effort export-data payloads to workbook-ready sheet row
models. It does not call APIs, does not import `xlsx`, does not create Blob
objects, and does not touch `window` or `document`.

The mapper normalizes export-data into:

- `project`
- `standard_effort.results`
- `standard_effort.totals`
- `selections.projectSolutionSelections`
- `selections.projectItemSelections`
- `checked_items`

It then builds three sheet models:

- `요약`
- `솔루션별 공수`
- `체크 항목`

Summary/result labels keep M/M markers only for M/M effort fields such as
`base_total_mm`, `standard_effort_mm`, `actual_effort_mm`, and `gap_mm`.
`coefficient_total` and checked item `coefficient` remain unitless. Legacy
md/md-like fields are not added to standard effort export rows, and no
M/D <-> M/M conversion is performed.

Header/useExportManager remain unconnected in this phase. Actual XLSX workbook
creation and download behavior remain future work.

## Phase 8-J-4 Status

`src/utils/export/standardEffortWorkbook.js` has been added to convert the
standard effort sheet row model into an XLSX workbook object.

The helper covers:

- sheet model to `xlsx` workbook conversion
- Excel sheet name sanitization and duplicate name handling
- workbook serialization with `xlsx.write({ type: "array", bookType: "xlsx" })`
- workbook output assembly with `{ workbook, buffer, filename, sheets }`

This remains an unconnected utility. Header actions, `useExportManager`,
`exportRepository`, and download behavior are unchanged. The helper does not
create Blob objects, does not access DOM APIs, and does not perform file
downloads. It is intended for the first standard effort export strategy:
Tomcat returns export-data JSON and the frontend creates the workbook.

The second strategy, Tomcat file stream export through
`GET /api/projects/{projectId}/standard-effort/export`, remains future work.

## Phase 8-J-5 Status

`src/services/export/standardEffortExportWorkflow.js` has been added as an
unconnected orchestration helper for the first standard effort export strategy.

The workflow is:

1. call `exportRepository.fetchStandardEffortExportData(projectId, options?)`
2. pass the returned export-data JSON to `buildStandardEffortWorkbookOutput`
3. return `{ data, error }` with `{ exportData, workbook, buffer, filename, sheets }`

The helper preserves bigint-compatible `projectId` values by passing them
through unchanged and forwards export options, including
`includeCheckedItems=false`, to both the fetch and workbook helper layers.

This phase still does not connect Header actions, `useExportManager`, or
download behavior. It does not create Blob objects, does not access DOM APIs,
and does not write frontend audit rows.

## Phase 8-J-6 Status

`src/utils/export/browserDownload.js` has been added as a generic browser
download helper for future export wiring.

The helper covers:

- `ArrayBuffer`, typed array, string, or Blob to downloadable Blob conversion
- object URL creation and revocation through injected or browser `URL`
- hidden anchor download triggering through injected or browser `document`
- workbook output download using `{ buffer, filename }`

High-level download helpers return `{ ok: true, filename }` or
`{ ok: false, error }`. Lower-level helpers throw clear errors for missing
data, missing object URL support, or missing document support.

This phase still does not connect Header actions, `useExportManager`,
`exportRepository`, or the standard effort export workflow. It also does not
import `xlsx`, create workbooks, call APIs, or write frontend audit rows.

## Phase 8-J-7 Status

`src/services/export/standardEffortExportDownload.js` has been added as the
standard effort export execution helper.

The execution flow is:

1. call `prepareStandardEffortWorkbookExport(projectId, options?)`
2. pass the prepared workbook output to `downloadWorkbookOutput`
3. return `{ data, error }` with minimal completion data:
   `{ filename, exportData, sheets }`

The helper preserves bigint-compatible `projectId` values by passing them
through unchanged and forwards export options to both preparation and download
layers. It intentionally does not return the large `workbook` and `buffer`
objects after a successful download.

This phase still does not connect Header actions or `useExportManager`.
Browser download support now exists as helpers, but the app export action is
not wired to this standard effort path yet. The helper does not directly create
Blob objects, does not access DOM APIs, does not call APIs except through the
prepare workflow, and does not write frontend audit rows.

## Phase 8-J-8 Status

`useExportManager.downloadExcel` is now mode-aware while keeping the existing
Header action boundary. `HeaderBar` still calls `actions.downloadExcel`.

- Legacy mode keeps the existing frontend-local legacy XLSX export.
- Parallel mode keeps the existing frontend-local legacy XLSX export.
- Standard mode with `VITE_DATA_BACKEND=api` calls
  `downloadStandardEffortWorkbookExport(projectId, { includeCheckedItems: true })`.
- Standard mode with Supabase backend returns an unsupported export error and
  does not fall back to the legacy export.

`useAppPageModel` now passes the current bigint-compatible `projectId` through
`projectState` so the standard export helper can target the selected project.
Project ids are passed through unchanged and are not converted to UUIDs.
Standard export remains M/M based through `effort_mm`, `actual_effort_mm`,
`standard_effort_mm`, and `gap_mm`; no M/D to M/M conversion is performed.

Frontend export audit remains unconnected. Tomcat should own authoritative
`export.download` audit when API export endpoints are used operationally.

## Phase 8-J-9 Status

The standard mode export guidance now reflects the connected standard effort
export path:

- Standard mode with `VITE_DATA_BACKEND=api` tells users that the Header Excel
  download button can export standard effort results.
- Standard mode with Supabase backend tells users that standard effort export
  is provided in API mode.
- Legacy and parallel modes keep the existing frontend-local legacy Excel
  export behavior.

No export dropdown or export type selector was added. Parallel mode still uses
the legacy export path from the Header Excel action. A future phase may add an
explicit legacy/standard export selection UX for parallel mode.

Frontend export audit remains unconnected. Tomcat should enforce
`export.read`, `export.standard_effort`, project read scope, and authoritative
`export.download` audit for API export endpoints.

## Risks

- Keep the Supabase/API dual-write period short.
- Avoid duplicate audit logs when backend audit becomes authoritative.
- Keep `project_id` as bigint-compatible number or numeric string.
- Preserve M/M field names and avoid unit conversion.
- Remember that Vite environment variables are applied at build time.
