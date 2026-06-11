export const PROJECT_REPOSITORY_METHODS = [
  "toPayload",
  "fetchProjects",
  "fetchProjectById",
  "saveProject",
  "deleteProjectById",
  "restoreProjectById",
  "saveProjectVersion",
  "fetchProjectVersions",
  "fetchLatestProjectVersionNo",
  "fetchCommonCodes",
  "fetchEstimationItemMeta",
  "fetchEstimationItemMetaRows",
  "fetchEstimationBaseEffortMeta",
  "fetchEstimationItemFieldMeta",
  "fetchEstimationEnvVarMeta",
  "fetchEstimationCalculationMeta",
  "fetchEstimationPolicy",
  "fetchCommonCodeRows",
  "createCommonCodeRow",
  "updateCommonCodeRow",
  "updateCommonCodeActive",
];

export const STANDARD_EFFORT_REPOSITORY_METHODS = [
  "fetchStandardEffortMeta",
  "fetchProjectStandardSelections",
  "fetchStandardEffortInput",
  "upsertProjectSolutionSelections",
  "upsertProjectItemSelections",
  "updateProjectActualEffort",
];

export const STANDARD_EFFORT_META_REPOSITORY_METHODS = [
  "fetchStandardEffortMetaAdmin",
  "buildStandardEffortMetaSummary",
  "upsertStandardBaseEffortRows",
  "upsertStandardCoefficientRows",
  "updateStandardSolutionVariantActive",
  "updateStandardItemActive",
];

export const AUTH_PERMISSION_REPOSITORY_METHODS = [
  "fetchAppUserByEmail",
  "fetchAppUserByAuthUserId",
  "fetchUserRoles",
  "fetchRolePermissions",
  "fetchPermissionSnapshotByEmail",
  "fetchPermissionSnapshotByAuthUserId",
];

export const AUDIT_LOG_REPOSITORY_METHODS = [
  "createAuditLog",
  "createAuditLogSafe",
];

export const EXPORT_REPOSITORY_METHODS = [
  "fetchStandardEffortExportData",
  "fetchLegacyExportData",
  "downloadStandardEffortExport",
  "downloadLegacyExport",
];

export const REPOSITORY_CONTRACTS = {
  project: PROJECT_REPOSITORY_METHODS,
  standardEffort: STANDARD_EFFORT_REPOSITORY_METHODS,
  standardEffortMeta: STANDARD_EFFORT_META_REPOSITORY_METHODS,
  authPermission: AUTH_PERMISSION_REPOSITORY_METHODS,
  auditLog: AUDIT_LOG_REPOSITORY_METHODS,
  export: EXPORT_REPOSITORY_METHODS,
};

export function getMissingRepositoryMethods(repository, methodNames = []) {
  if (!repository) {
    return [...methodNames];
  }

  return methodNames.filter((methodName) => typeof repository[methodName] !== "function");
}

export function assertRepositoryContract(
  repository,
  methodNames = [],
  repositoryName = "repository"
) {
  const missingMethods = getMissingRepositoryMethods(repository, methodNames);

  if (missingMethods.length > 0) {
    throw new Error(
      `${repositoryName} is missing repository methods: ${missingMethods.join(", ")}`
    );
  }

  return true;
}
