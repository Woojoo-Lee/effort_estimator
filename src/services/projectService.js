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

export async function fetchProjects(options) {
  return getProjectAdapter().fetchProjects(options);
}

export async function fetchProjectById(id) {
  return getProjectAdapter().fetchProjectById(id);
}

export async function saveProject({
  projectId,
  projectName,
  payload,
}) {
  return getProjectAdapter().saveProject({ projectId, projectName, payload });
}

export async function deleteProjectById(projectId) {
  return getProjectAdapter().deleteProjectById(projectId);
}

export async function restoreProjectById(projectId, options) {
  return getProjectAdapter().restoreProjectById(projectId, options);
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
