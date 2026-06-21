import { ROLES } from "../../auth/lib/permissionCodes";

export function firstPresentProjectValue(...values) {
  return (
    values.find(
      (value) => value !== undefined && value !== null && value !== ""
    ) || null
  );
}

function getPayload(project = {}) {
  return project?.payload && typeof project.payload === "object"
    ? project.payload
    : {};
}

export function getAuthUserId(user = {}) {
  return firstPresentProjectValue(
    user?.user_id,
    user?.userId,
    user?.id,
    user?.sub
  );
}

export function getProjectOwnerUserId(project = {}) {
  const payload = getPayload(project);

  return firstPresentProjectValue(
    project.owner_user_id,
    project.ownerUserId,
    project.created_by,
    project.createdBy,
    project.created_by_user_id,
    project.createdByUserId,
    payload.owner_user_id,
    payload.ownerUserId,
    payload.created_by,
    payload.createdBy,
    payload.created_by_user_id,
    payload.createdByUserId
  );
}

export function getProjectUpdatedByLabel(project = {}) {
  const payload = getPayload(project);

  return (
    firstPresentProjectValue(
      project.updated_by_display_name,
      project.updatedByDisplayName,
      payload.updated_by_display_name,
      payload.updatedByDisplayName,
      project.updated_by_login_id,
      project.updatedByLoginId,
      payload.updated_by_login_id,
      payload.updatedByLoginId,
      project.updated_by,
      project.updatedBy,
      payload.updated_by,
      payload.updatedBy
    ) || "-"
  );
}

export function isOwnedByUser(project, userId) {
  const ownerUserId = getProjectOwnerUserId(project);

  return Boolean(
    ownerUserId && userId && String(ownerUserId) === String(userId)
  );
}

function hasRole(authz, roleCode) {
  return Boolean(authz?.hasRole?.(roleCode) || authz?.roleCodes?.includes(roleCode));
}

export function isProjectAdmin(authz = {}) {
  return Boolean(authz?.isAdmin || hasRole(authz, ROLES.ADMIN));
}

export function isProjectSales(authz = {}) {
  return Boolean(authz?.isSales || hasRole(authz, ROLES.SALES));
}

export function isProjectViewer(authz = {}) {
  return Boolean(authz?.isViewer || hasRole(authz, ROLES.VIEWER));
}

export function canManageProject(project, { authz = {}, user = null } = {}) {
  if (isProjectAdmin(authz)) {
    return true;
  }

  if (isProjectViewer(authz)) {
    return false;
  }

  if (isProjectSales(authz)) {
    return isOwnedByUser(project, getAuthUserId(user || authz.user));
  }

  return true;
}

export function getProjectManageDisabledReason(project, {
  authz = {},
  user = null,
  missingOwnerReason = "등록자 정보를 확인할 수 없어 처리할 수 없습니다.",
  otherOwnerReason = "등록자 본인만 처리할 수 있습니다.",
  noPermissionReason = "프로젝트 처리 권한이 없습니다.",
} = {}) {
  if (isProjectAdmin(authz)) {
    return "";
  }

  if (isProjectViewer(authz)) {
    return noPermissionReason;
  }

  if (isProjectSales(authz)) {
    if (!getProjectOwnerUserId(project)) {
      return missingOwnerReason;
    }

    if (!isOwnedByUser(project, getAuthUserId(user || authz.user))) {
      return otherOwnerReason;
    }

    return "";
  }

  return "";
}
