import { createApiClient } from "../../api";
import { getApiBaseUrl } from "../../dataBackend";
import { FILE_VERSION } from "../../../shared/constants/constants";

const API_BASE_URL_REQUIRED_ERROR =
  "VITE_API_BASE_URL is required when using project API adapter.";
const PROJECT_LIST_STATUSES = new Set(["active", "archived"]);
const LEGACY_ESTIMATOR_PATHS = {
  itemMeta: "/legacy-estimator/item-meta",
  itemMetaRows: "/legacy-estimator/item-meta/rows",
  baseEffortMeta: "/legacy-estimator/base-effort-meta",
  itemFieldMeta: "/legacy-estimator/item-field-meta",
  envVarMeta: "/legacy-estimator/env-var-meta",
  calculationMeta: "/legacy-estimator/calculation-meta",
  policy: "/legacy-estimator/policy",
};

function createErrorResult(error) {
  return {
    data: null,
    error,
  };
}

async function toRepositoryResult(resolveData) {
  try {
    return {
      data: await resolveData(),
      error: null,
    };
  } catch (error) {
    return createErrorResult(error);
  }
}

function normalizeProjectRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  return { ...row };
}

function isProjectLikeRow(row = {}) {
  return (
    Object.prototype.hasOwnProperty.call(row, "id") ||
    Object.prototype.hasOwnProperty.call(row, "project_id") ||
    Object.prototype.hasOwnProperty.call(row, "project_name") ||
    Object.prototype.hasOwnProperty.call(row, "payload") ||
    Object.prototype.hasOwnProperty.call(row, "status") ||
    Object.prototype.hasOwnProperty.call(row, "archived_at") ||
    Object.prototype.hasOwnProperty.call(row, "updated_at")
  );
}

function readProjectRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const rows = data.projects || data.rows || data.data;

  return Array.isArray(rows) ? rows : [];
}

function readProjectRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  return (
    data.project ||
    data.row ||
    (Array.isArray(data.rows) ? data.rows[0] : null) ||
    (data.data && !Array.isArray(data.data) ? data.data : null) ||
    (isProjectLikeRow(data) ? data : null)
  );
}

function normalizeProjectRows(data) {
  return readProjectRows(data).map(normalizeProjectRow).filter(Boolean);
}

function normalizeProject(data) {
  return normalizeProjectRow(readProjectRow(data));
}

function normalizeVersionRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  return { ...row };
}

function isVersionLikeRow(row = {}) {
  return (
    Object.prototype.hasOwnProperty.call(row, "id") ||
    Object.prototype.hasOwnProperty.call(row, "project_id") ||
    Object.prototype.hasOwnProperty.call(row, "version_no") ||
    Object.prototype.hasOwnProperty.call(row, "saved_type") ||
    Object.prototype.hasOwnProperty.call(row, "project_name") ||
    Object.prototype.hasOwnProperty.call(row, "payload") ||
    Object.prototype.hasOwnProperty.call(row, "created_at")
  );
}

function readVersionRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const rows = data.versions || data.rows || data.data;

  return Array.isArray(rows) ? rows : [];
}

function readVersionRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  return (
    data.version ||
    data.row ||
    (Array.isArray(data.rows) ? data.rows[0] : null) ||
    (data.data && !Array.isArray(data.data) ? data.data : null) ||
    (isVersionLikeRow(data) ? data : null)
  );
}

function normalizeVersionRows(data) {
  return readVersionRows(data).map(normalizeVersionRow).filter(Boolean);
}

function normalizeVersion(data) {
  return normalizeVersionRow(readVersionRow(data));
}

function normalizeLatestVersionNo(data) {
  if (data === null || data === undefined || data === "") {
    return null;
  }

  if (typeof data === "number" || typeof data === "string") {
    return {
      version_no: data,
    };
  }

  if (typeof data !== "object") {
    return null;
  }

  const row = data.row || data.version || data.latest || data.data || data;
  const versionNo =
    row.version_no ?? row.latest_version_no ?? row.versionNo ?? null;

  if (versionNo === null || versionNo === undefined || versionNo === "") {
    return null;
  }

  return {
    ...normalizeVersionRow(row),
    version_no: versionNo,
  };
}

function normalizeCommonCodeRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const normalized = { ...row };

  if (
    (normalized.sort_order === null ||
      normalized.sort_order === undefined ||
      normalized.sort_order === "") &&
    Object.prototype.hasOwnProperty.call(normalized, "sort_order")
  ) {
    normalized.sort_order = 0;
  }

  if (
    normalized.is_active === undefined &&
    Object.prototype.hasOwnProperty.call(normalized, "active")
  ) {
    normalized.is_active = normalized.active;
  }

  return normalized;
}

function isCommonCodeLikeRow(row = {}) {
  return (
    Object.prototype.hasOwnProperty.call(row, "id") ||
    Object.prototype.hasOwnProperty.call(row, "group_code") ||
    Object.prototype.hasOwnProperty.call(row, "code") ||
    Object.prototype.hasOwnProperty.call(row, "code_name") ||
    Object.prototype.hasOwnProperty.call(row, "code_value") ||
    Object.prototype.hasOwnProperty.call(row, "is_active") ||
    Object.prototype.hasOwnProperty.call(row, "active") ||
    Object.prototype.hasOwnProperty.call(row, "sort_order")
  );
}

function readCommonCodeRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const rows =
    data.codebooks ||
    data.commonCodes ||
    data.common_codes ||
    data.commonCodeRows ||
    data.common_code_rows ||
    data.codes ||
    data.rows ||
    data.data;

  return Array.isArray(rows) ? rows : [];
}

function readCommonCodeRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  return (
    data.row ||
    data.commonCode ||
    data.common_code ||
    (Array.isArray(data.rows) ? data.rows[0] : null) ||
    (data.data && !Array.isArray(data.data) ? data.data : null) ||
    (isCommonCodeLikeRow(data) ? data : null)
  );
}

function normalizeCommonCodeRows(data) {
  return readCommonCodeRows(data).map(normalizeCommonCodeRow).filter(Boolean);
}

function normalizeCommonCode(data) {
  return normalizeCommonCodeRow(readCommonCodeRow(data));
}

function normalizeLegacyMetaRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  return { ...row };
}

function readLegacyMetaRows(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  if (data.data && data.data !== data) {
    return readLegacyMetaRows(data.data, keys);
  }

  return [];
}

function normalizeLegacyMetaRows(data, keys) {
  return readLegacyMetaRows(data, keys)
    .map(normalizeLegacyMetaRow)
    .filter(Boolean);
}

function normalizeLegacyPolicyRows(data) {
  const rows = readLegacyMetaRows(data, [
    "policies",
    "policy",
    "rows",
    "row",
    "data",
  ]);

  if (rows.length > 0) {
    return rows.map(normalizeLegacyMetaRow).filter(Boolean);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return [];
  }

  for (const key of ["policy", "row", "data"]) {
    const value = data[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const row = normalizeLegacyMetaRow(value);
      return row ? [row] : [];
    }
  }

  const row = normalizeLegacyMetaRow(data);
  return row ? [row] : [];
}

function normalizeSortOrder(value) {
  return value === null || value === undefined || value === "" ? 0 : value;
}

function createCommonCodeBody(row = {}, options = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("project API adapter createCommonCodeRow requires a row.");
  }

  const {
    includeId = false,
    id,
    defaultIsActive = true,
    defaultSortOrder = true,
  } = options;
  const body = {};

  if (includeId) {
    body.id = id ?? row.id;
  }

  for (const key of [
    "group_code",
    "code",
    "code_name",
    "code_value",
    "description",
  ]) {
    if (row[key] !== undefined) {
      body[key] = row[key];
    }
  }

  if (row.sort_order !== undefined || defaultSortOrder) {
    body.sort_order = normalizeSortOrder(row.sort_order);
  }

  if (row.is_active !== undefined) {
    body.is_active = row.is_active;
  } else if (row.active !== undefined) {
    body.is_active = row.active;
  } else if (defaultIsActive) {
    body.is_active = true;
  }

  return body;
}

function buildProjectListQuery(options = {}) {
  if (!options || typeof options !== "object") {
    return {};
  }

  if (options.status !== undefined && options.status !== null) {
    if (!PROJECT_LIST_STATUSES.has(options.status)) {
      throw new Error(
        "project API adapter fetchProjects received an invalid status."
      );
    }

    return {
      status: options.status,
    };
  }

  if (options.includeArchived === true) {
    return {
      include_archived: true,
    };
  }

  return {};
}

function assertProjectId(projectId, methodName = "fetchProjectById") {
  if (!projectId) {
    throw new Error(`project API adapter ${methodName} requires projectId.`);
  }
}

function getProjectPath(projectId) {
  return `/projects/${encodeURIComponent(String(projectId))}`;
}

function getProjectArchivePath(projectId) {
  return `${getProjectPath(projectId)}/archive`;
}

function getProjectRestorePath(projectId) {
  return `${getProjectPath(projectId)}/restore`;
}

function getProjectVersionsPath(projectId) {
  return `${getProjectPath(projectId)}/versions`;
}

function getProjectLatestVersionPath(projectId) {
  return `${getProjectVersionsPath(projectId)}/latest`;
}

function getCodebookPath(id) {
  return `/codebooks/${encodeURIComponent(String(id))}`;
}

function getCodebookRowsPath() {
  return "/codebooks/rows";
}

function getCodebookActivePath(id) {
  return `${getCodebookPath(id)}/active`;
}

function createProjectSaveBody({ projectId, projectName, payload }) {
  const body = {
    project_name: projectName,
    payload,
  };

  if (projectId) {
    body.project_id = projectId;
  }

  return body;
}

function createProjectActorMetadata(options = {}) {
  const currentUser = options.currentUser || options.user || {};
  const updatedBy =
    currentUser.user_id ||
    currentUser.userId ||
    currentUser.id ||
    currentUser.sub ||
    options.updated_by ||
    options.updatedBy ||
    null;
  const updatedByLoginId =
    currentUser.login_id ||
    currentUser.loginId ||
    options.updated_by_login_id ||
    options.updatedByLoginId ||
    null;
  const updatedByDisplayName =
    currentUser.display_name ||
    currentUser.displayName ||
    options.updated_by_display_name ||
    options.updatedByDisplayName ||
    null;

  return {
    ...(updatedBy ? { updated_by: updatedBy } : {}),
    ...(updatedByLoginId ? { updated_by_login_id: updatedByLoginId } : {}),
    ...(updatedByDisplayName
      ? { updated_by_display_name: updatedByDisplayName }
      : {}),
  };
}

function createProjectArchiveBody(projectId, options = {}) {
  return {
    project_id: projectId,
    ...createProjectActorMetadata(options),
  };
}

function createProjectRestoreBody(projectId, options = {}) {
  const restoreReason = options.restoreReason ?? options.restore_reason;
  const body = {
    project_id: projectId,
    ...createProjectActorMetadata(options),
  };

  if (restoreReason !== undefined && restoreReason !== null && restoreReason !== "") {
    body.restore_reason = restoreReason;
  }

  return body;
}

function createProjectVersionBody({
  projectId,
  versionNo,
  savedType = "manual",
  projectName,
  payload,
} = {}) {
  assertProjectId(projectId, "saveProjectVersion");

  return {
    project_id: projectId,
    version_no: versionNo,
    saved_type: savedType,
    project_name: projectName,
    payload,
  };
}

function assertCodebookId(id, methodName) {
  if (!id) {
    throw new Error(`project API adapter ${methodName} requires id.`);
  }
}

function createCommonCodeActiveBody(id, isActive) {
  assertCodebookId(id, "updateCommonCodeActive");

  if (typeof isActive !== "boolean") {
    throw new Error(
      "project API adapter updateCommonCodeActive requires a boolean active value."
    );
  }

  return {
    id,
    is_active: isActive,
  };
}

function createClientResolver(options = {}) {
  return () => {
    if (options.apiClient) {
      return options.apiClient;
    }

    const baseUrl = getApiBaseUrl(options.env);

    if (!baseUrl) {
      throw new Error(API_BASE_URL_REQUIRED_ERROR);
    }

    return createApiClient({
      baseUrl,
      getAuthToken: options.getAuthToken,
      fetchImpl: options.fetchImpl,
      defaultHeaders: options.defaultHeaders,
      onRequest: options.onRequest,
      onResponse: options.onResponse,
      onError: options.onError,
    });
  };
}

export function toPayload({
  activeTab,
  projectName,
  itemsBySolution,
  scaleFactor,
  riskFactor,
  mgmtRate,
  savedAt,
}) {
  return {
    fileVersion: FILE_VERSION,
    activeTab,
    projectName,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
  };
}

export function createProjectApiAdapter(options = {}) {
  const getClient = createClientResolver(options);

  return {
    toPayload,
    fetchProjects(options) {
      return toRepositoryResult(async () => {
        const data = await getClient().get("/projects", {
          query: buildProjectListQuery(options),
        });

        return normalizeProjectRows(data);
      });
    },
    fetchProjectById(projectId) {
      return toRepositoryResult(async () => {
        assertProjectId(projectId);
        const data = await getClient().get(getProjectPath(projectId));

        return normalizeProject(data);
      });
    },
    saveProject({ projectId, projectName, payload } = {}) {
      return toRepositoryResult(async () => {
        const body = createProjectSaveBody({ projectId, projectName, payload });
        const data = projectId
          ? await getClient().put(getProjectPath(projectId), { body })
          : await getClient().post("/projects", { body });

        return normalizeProject(data);
      });
    },
    deleteProjectById(projectId, options) {
      return toRepositoryResult(async () => {
        assertProjectId(projectId, "deleteProjectById");
        const data = await getClient().put(getProjectArchivePath(projectId), {
          body: createProjectArchiveBody(projectId, options),
        });

        return normalizeProject(data);
      });
    },
    restoreProjectById(projectId, options) {
      return toRepositoryResult(async () => {
        assertProjectId(projectId, "restoreProjectById");
        const data = await getClient().put(getProjectRestorePath(projectId), {
          body: createProjectRestoreBody(projectId, options),
        });

        return normalizeProject(data);
      });
    },
    saveProjectVersion(input = {}) {
      return toRepositoryResult(async () => {
        const body = createProjectVersionBody(input);
        const data = await getClient().post(
          getProjectVersionsPath(input.projectId),
          { body }
        );

        return normalizeVersion(data);
      });
    },
    fetchProjectVersions(projectId) {
      return toRepositoryResult(async () => {
        assertProjectId(projectId, "fetchProjectVersions");
        const data = await getClient().get(getProjectVersionsPath(projectId));

        return normalizeVersionRows(data);
      });
    },
    fetchLatestProjectVersionNo(projectId) {
      return toRepositoryResult(async () => {
        assertProjectId(projectId, "fetchLatestProjectVersionNo");
        const data = await getClient().get(
          getProjectLatestVersionPath(projectId)
        );

        return normalizeLatestVersionNo(data);
      });
    },
    fetchCommonCodes() {
      return toRepositoryResult(async () => {
        const data = await getClient().get("/codebooks");

        return normalizeCommonCodeRows(data);
      });
    },
    fetchEstimationItemMeta() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(LEGACY_ESTIMATOR_PATHS.itemMeta);

        return normalizeLegacyMetaRows(data, [
          "itemMeta",
          "item_meta",
          "rows",
          "items",
          "data",
        ]);
      });
    },
    fetchEstimationItemMetaRows() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(LEGACY_ESTIMATOR_PATHS.itemMetaRows);

        return normalizeLegacyMetaRows(data, [
          "itemMetaRows",
          "item_meta_rows",
          "itemMeta",
          "item_meta",
          "rows",
          "items",
          "data",
        ]);
      });
    },
    fetchEstimationBaseEffortMeta() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(LEGACY_ESTIMATOR_PATHS.baseEffortMeta);

        return normalizeLegacyMetaRows(data, [
          "baseEffortMeta",
          "base_effort_meta",
          "rows",
          "data",
        ]);
      });
    },
    fetchEstimationItemFieldMeta() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(LEGACY_ESTIMATOR_PATHS.itemFieldMeta);

        return normalizeLegacyMetaRows(data, [
          "itemFieldMeta",
          "item_field_meta",
          "fieldMeta",
          "field_meta",
          "rows",
          "data",
        ]);
      });
    },
    fetchEstimationEnvVarMeta() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(LEGACY_ESTIMATOR_PATHS.envVarMeta);

        return normalizeLegacyMetaRows(data, [
          "envVarMeta",
          "env_var_meta",
          "rows",
          "data",
        ]);
      });
    },
    fetchEstimationCalculationMeta() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(LEGACY_ESTIMATOR_PATHS.calculationMeta);

        return normalizeLegacyMetaRows(data, [
          "calculationMeta",
          "calculation_meta",
          "rows",
          "data",
        ]);
      });
    },
    fetchEstimationPolicy() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(LEGACY_ESTIMATOR_PATHS.policy);

        return normalizeLegacyPolicyRows(data);
      });
    },
    fetchCommonCodeRows() {
      return toRepositoryResult(async () => {
        const data = await getClient().get(getCodebookRowsPath());

        return normalizeCommonCodeRows(data);
      });
    },
    createCommonCodeRow(row) {
      return toRepositoryResult(async () => {
        const body = createCommonCodeBody(row);
        const data = await getClient().post("/codebooks", { body });

        return normalizeCommonCode(data);
      });
    },
    updateCommonCodeRow(id, payload = {}) {
      return toRepositoryResult(async () => {
        assertCodebookId(id, "updateCommonCodeRow");
        const body = createCommonCodeBody(payload, {
          includeId: true,
          id,
          defaultIsActive: false,
          defaultSortOrder: false,
        });
        const data = await getClient().put(getCodebookPath(id), { body });

        return normalizeCommonCode(data);
      });
    },
    updateCommonCodeActive(id, isActive) {
      return toRepositoryResult(async () => {
        const body = createCommonCodeActiveBody(id, isActive);
        const data = await getClient().put(getCodebookActivePath(id), {
          body,
        });

        return normalizeCommonCode(data);
      });
    },
  };
}

const defaultAdapter = createProjectApiAdapter();

export async function fetchProjects(options) {
  return defaultAdapter.fetchProjects(options);
}

export async function fetchProjectById(projectId) {
  return defaultAdapter.fetchProjectById(projectId);
}

export async function saveProject(input) {
  return defaultAdapter.saveProject(input);
}

export async function deleteProjectById(projectId, options) {
  return defaultAdapter.deleteProjectById(projectId, options);
}

export async function restoreProjectById(projectId, options) {
  return defaultAdapter.restoreProjectById(projectId, options);
}

export async function saveProjectVersion(input) {
  return defaultAdapter.saveProjectVersion(input);
}

export async function fetchProjectVersions(projectId) {
  return defaultAdapter.fetchProjectVersions(projectId);
}

export async function fetchLatestProjectVersionNo(projectId) {
  return defaultAdapter.fetchLatestProjectVersionNo(projectId);
}

export async function fetchCommonCodes() {
  return defaultAdapter.fetchCommonCodes();
}

export async function fetchEstimationItemMeta() {
  return defaultAdapter.fetchEstimationItemMeta();
}

export async function fetchEstimationItemMetaRows() {
  return defaultAdapter.fetchEstimationItemMetaRows();
}

export async function fetchEstimationBaseEffortMeta() {
  return defaultAdapter.fetchEstimationBaseEffortMeta();
}

export async function fetchEstimationItemFieldMeta() {
  return defaultAdapter.fetchEstimationItemFieldMeta();
}

export async function fetchEstimationEnvVarMeta() {
  return defaultAdapter.fetchEstimationEnvVarMeta();
}

export async function fetchEstimationCalculationMeta() {
  return defaultAdapter.fetchEstimationCalculationMeta();
}

export async function fetchEstimationPolicy() {
  return defaultAdapter.fetchEstimationPolicy();
}

export async function fetchCommonCodeRows() {
  return defaultAdapter.fetchCommonCodeRows();
}

export async function createCommonCodeRow(payload) {
  return defaultAdapter.createCommonCodeRow(payload);
}

export async function updateCommonCodeRow(id, payload) {
  return defaultAdapter.updateCommonCodeRow(id, payload);
}

export async function updateCommonCodeActive(id, isActive) {
  return defaultAdapter.updateCommonCodeActive(id, isActive);
}
