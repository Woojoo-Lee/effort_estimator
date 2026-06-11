export function isAuthPermissionEnabled(env = import.meta.env) {
  return (env?.VITE_AUTH_PERMISSION_MODE || "disabled") !== "disabled";
}

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function canAccessRoute(route, authz, options = {}) {
  const { env = import.meta.env } = options;

  if (!route) {
    return false;
  }

  if (!isAuthPermissionEnabled(env)) {
    return true;
  }

  const requiredPermissions = toArray(route.requiredPermissions);
  const anyPermissions = toArray(route.anyPermissions);

  if (
    requiredPermissions.length > 0 &&
    !authz?.hasAllPermissions?.(requiredPermissions)
  ) {
    return false;
  }

  if (
    anyPermissions.length > 0 &&
    !authz?.hasAnyPermission?.(anyPermissions)
  ) {
    return false;
  }

  return true;
}

export function filterRoutesByAuthz(routes = [], authz, options = {}) {
  if (!isAuthPermissionEnabled(options.env || import.meta.env)) {
    return routes;
  }

  return routes.filter((route) => canAccessRoute(route, authz, options));
}

export function getRouteDeniedReason() {
  return "접근 권한이 없습니다.";
}
