import { FILE_VERSION } from "../shared/constants/constants";
import { getProjectAdapter } from "./adapters/projectAdapterFactory";

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

function getCurrentUserId(currentUser = {}) {
  return (
    currentUser.user_id ||
    currentUser.userId ||
    currentUser.id ||
    currentUser.sub ||
    null
  );
}

function getCurrentUserLoginId(currentUser = {}) {
  return currentUser.login_id || currentUser.loginId || null;
}

function getCurrentUserDisplayName(currentUser = {}) {
  return currentUser.display_name || currentUser.displayName || null;
}

function getExistingOwnerId(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return (
    [
      payload.owner_user_id,
      payload.ownerUserId,
      payload.created_by,
      payload.createdBy,
      payload.created_by_user_id,
      payload.createdByUserId,
    ].find(
      (value) => value !== undefined && value !== null && value !== ""
    ) || null
  );
}

function getExistingUpdatedByMetadata(source = {}) {
  if (!source || typeof source !== "object") {
    return {};
  }

  const payload =
    source.payload && typeof source.payload === "object" ? source.payload : {};

  return {
    updated_by:
      source.updated_by ??
      source.updatedBy ??
      payload.updated_by ??
      payload.updatedBy ??
      null,
    updated_by_login_id:
      source.updated_by_login_id ??
      source.updatedByLoginId ??
      payload.updated_by_login_id ??
      payload.updatedByLoginId ??
      null,
    updated_by_display_name:
      source.updated_by_display_name ??
      source.updatedByDisplayName ??
      payload.updated_by_display_name ??
      payload.updatedByDisplayName ??
      null,
  };
}

function mergeCreateOwnerMetadata(payload = {}, options = {}) {
  const currentUserId = getCurrentUserId(options.currentUser || options.user);

  if (!currentUserId || getExistingOwnerId(payload)) {
    return payload;
  }

  return {
    ...payload,
    owner_user_id: currentUserId,
    created_by: currentUserId,
  };
}

function mergeUpdatedByMetadata(payload = {}, options = {}) {
  const currentUser = options.currentUser || options.user || {};
  const currentUserId = getCurrentUserId(currentUser);
  const loginId = getCurrentUserLoginId(currentUser);
  const displayName = getCurrentUserDisplayName(currentUser);

  if (!currentUserId && !loginId && !displayName) {
    return payload;
  }

  return {
    ...payload,
    ...(currentUserId ? { updated_by: currentUserId } : {}),
    ...(loginId ? { updated_by_login_id: loginId } : {}),
    ...(displayName ? { updated_by_display_name: displayName } : {}),
  };
}

function normalizeProjectMetadata(project) {
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    return project;
  }

  const ownerId =
    getExistingOwnerId(project) || getExistingOwnerId(project.payload);
  const updatedBy = getExistingUpdatedByMetadata(project);

  if (
    !ownerId &&
    !updatedBy.updated_by &&
    !updatedBy.updated_by_login_id &&
    !updatedBy.updated_by_display_name
  ) {
    return project;
  }

  return {
    ...project,
    ...(ownerId
      ? {
          owner_user_id: project.owner_user_id || ownerId,
          ownerUserId: project.ownerUserId || ownerId,
          created_by: project.created_by || ownerId,
          createdBy: project.createdBy || ownerId,
          created_by_user_id: project.created_by_user_id || ownerId,
          createdByUserId: project.createdByUserId || ownerId,
        }
      : {}),
    ...(updatedBy.updated_by
      ? {
          updated_by: project.updated_by || updatedBy.updated_by,
          updatedBy: project.updatedBy || updatedBy.updated_by,
        }
      : {}),
    ...(updatedBy.updated_by_login_id
      ? {
          updated_by_login_id:
            project.updated_by_login_id || updatedBy.updated_by_login_id,
          updatedByLoginId:
            project.updatedByLoginId || updatedBy.updated_by_login_id,
        }
      : {}),
    ...(updatedBy.updated_by_display_name
      ? {
          updated_by_display_name:
            project.updated_by_display_name ||
            updatedBy.updated_by_display_name,
          updatedByDisplayName:
            project.updatedByDisplayName ||
            updatedBy.updated_by_display_name,
        }
      : {}),
  };
}

function normalizeProjectResult(result) {
  if (!result?.data) {
    return result;
  }

  return {
    ...result,
    data: Array.isArray(result.data)
      ? result.data.map(normalizeProjectMetadata)
      : normalizeProjectMetadata(result.data),
  };
}

export async function fetchProjects(options) {
  return normalizeProjectResult(
    await getProjectAdapter().fetchProjects(options)
  );
}

export async function fetchProjectById(id) {
  return normalizeProjectResult(await getProjectAdapter().fetchProjectById(id));
}

export async function saveProject({
  projectId,
  projectName,
  payload,
}, options = {}) {
  const ownerPayload = projectId
    ? payload
    : mergeCreateOwnerMetadata(payload, options);
  const nextPayload = mergeUpdatedByMetadata(ownerPayload, options);

  return normalizeProjectResult(
    await getProjectAdapter().saveProject({
      projectId,
      projectName,
      payload: nextPayload,
    })
  );
}

export async function deleteProjectById(projectId, options) {
  return normalizeProjectResult(
    await getProjectAdapter().deleteProjectById(projectId, options)
  );
}

export async function restoreProjectById(projectId, options) {
  return normalizeProjectResult(
    await getProjectAdapter().restoreProjectById(projectId, options)
  );
}

export async function saveProjectVersion({
  projectId,
  versionNo,
  savedType = "manual",
  projectName,
  payload,
}) {
  return getProjectAdapter().saveProjectVersion({
    projectId,
    versionNo,
    savedType,
    projectName,
    payload,
  });
}

export async function fetchProjectVersions(projectId) {
  return getProjectAdapter().fetchProjectVersions(projectId);
}

export async function fetchLatestProjectVersionNo(projectId) {
  return getProjectAdapter().fetchLatestProjectVersionNo(projectId);
}

export async function fetchCommonCodes() {
  return getProjectAdapter().fetchCommonCodes();
}

export async function fetchEstimationItemMeta() {
  return getProjectAdapter().fetchEstimationItemMeta();
}

export async function fetchEstimationItemMetaRows() {
  return getProjectAdapter().fetchEstimationItemMetaRows();
}

export async function fetchEstimationBaseEffortMeta() {
  return getProjectAdapter().fetchEstimationBaseEffortMeta();
}

export async function fetchEstimationItemFieldMeta() {
  return getProjectAdapter().fetchEstimationItemFieldMeta();
}

export async function fetchEstimationEnvVarMeta() {
  return getProjectAdapter().fetchEstimationEnvVarMeta();
}

export async function fetchEstimationCalculationMeta() {
  return getProjectAdapter().fetchEstimationCalculationMeta();
}

export async function fetchEstimationPolicy() {
  return getProjectAdapter().fetchEstimationPolicy();
}

export async function fetchCommonCodeRows() {
  return getProjectAdapter().fetchCommonCodeRows();
}

export async function createCommonCodeRow(payload) {
  return getProjectAdapter().createCommonCodeRow(payload);
}

export async function updateCommonCodeRow(id, payload) {
  return getProjectAdapter().updateCommonCodeRow(id, payload);
}

export async function updateCommonCodeActive(id, isActive) {
  return getProjectAdapter().updateCommonCodeActive(id, isActive);
}
