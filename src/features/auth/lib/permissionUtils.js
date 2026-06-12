import { ROLES } from "./permissionCodes";
import { buildPermissionSnapshot } from "./authPermissionPolicy";

function isActiveRow(row) {
  return row == null || row.active !== false;
}

function normalizeCodeRows(rows, key) {
  const values = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const normalized = [];
  const seen = new Set();

  for (const row of values) {
    if (!isActiveRow(row)) {
      continue;
    }

    const code = typeof row === "string" ? row : row?.[key];
    const trimmed = String(code || "").trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function asSet(permissionSet) {
  if (permissionSet instanceof Set) {
    return permissionSet;
  }

  return buildPermissionSet(permissionSet);
}

export function normalizeRoleCodes(roles) {
  return normalizeCodeRows(roles, "role_code");
}

export function normalizePermissionCodes(permissions) {
  return normalizeCodeRows(permissions, "permission_code");
}

export function buildPermissionSet(permissions) {
  return new Set(normalizePermissionCodes(permissions));
}

export function hasPermission(permissionSet, permissionCode) {
  const code = String(permissionCode || "").trim();
  return Boolean(code && asSet(permissionSet).has(code));
}

export function hasAnyPermission(permissionSet, permissionCodes) {
  return normalizePermissionCodes(permissionCodes).some((permissionCode) =>
    hasPermission(permissionSet, permissionCode)
  );
}

export function hasAllPermissions(permissionSet, permissionCodes) {
  const codes = normalizePermissionCodes(permissionCodes);
  return codes.length > 0 && codes.every((code) => hasPermission(permissionSet, code));
}

export function hasRole(roleCodes, roleCode) {
  const code = String(roleCode || "").trim();
  return Boolean(code && new Set(normalizeRoleCodes(roleCodes)).has(code));
}

export function hasAnyRole(roleCodes, roleCodesToCheck) {
  const roleSet = new Set(normalizeRoleCodes(roleCodes));
  return normalizeRoleCodes(roleCodesToCheck).some((roleCode) =>
    roleSet.has(roleCode)
  );
}

export function buildAuthzSnapshot({ user, roles, permissions } = {}) {
  const roleCodes = normalizeRoleCodes(roles);
  const permissionSnapshot = buildPermissionSnapshot({
    roleCodes,
    permissionCodes: normalizePermissionCodes(permissions),
  });
  const permissionCodes = permissionSnapshot.permissionCodes;
  const permissionSet = buildPermissionSet(permissionCodes);
  const activeUser =
    user && user.active !== false && !["inactive", "suspended"].includes(user.status);

  return {
    user: activeUser ? user : null,
    roleCodes,
    permissionCodes,
    permissionSet,
    isAuthenticated: Boolean(activeUser),
    isSystemAdmin: hasRole(roleCodes, ROLES.SYSTEM_ADMIN),
    isAdmin: hasRole(roleCodes, ROLES.ADMIN),
    isSales: hasRole(roleCodes, ROLES.SALES),
    isMetaAdmin: hasRole(roleCodes, ROLES.META_ADMIN),
    isEstimator: hasRole(roleCodes, ROLES.ESTIMATOR),
    isViewer: hasRole(roleCodes, ROLES.VIEWER),
    hasPermission: (permissionCode) =>
      hasPermission(permissionSet, permissionCode),
    hasAnyPermission: (codes) => hasAnyPermission(permissionSet, codes),
    hasAllPermissions: (codes) => hasAllPermissions(permissionSet, codes),
    hasRole: (roleCode) => hasRole(roleCodes, roleCode),
    hasAnyRole: (codes) => hasAnyRole(roleCodes, codes),
  };
}
