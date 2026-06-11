import { PERMISSIONS } from "../features/auth";

export const DEFAULT_ROUTE = "/estimator";
export const LOGIN_ROUTE = {
  path: "/login",
  label: "Login",
};

const BASE_ROUTES = [
  {
    path: "/estimator",
    label: "공수 산정",
    requiredPermissions: [PERMISSIONS.ROUTE_ESTIMATOR_READ],
  },
  {
    path: "/codebooks",
    label: "코드북 관리",
  },
  {
    path: "/item-meta",
    label: "항목 메타 관리",
    requiredPermissions: [PERMISSIONS.ROUTE_ITEM_META_READ],
  },
  {
    path: "/projects",
    label: "프로젝트 관리",
    requiredPermissions: [PERMISSIONS.ROUTE_PROJECTS_READ],
  },
];

export const STANDARD_EFFORT_META_ROUTE = {
  path: "/standard-effort-meta",
  label: "표준공수 메타",
  requiredPermissions: [PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ],
};

export function isStandardEffortMetaRouteEnabled() {
  return import.meta.env.VITE_FEATURE_STANDARD_EFFORT_META === "true";
}

export function getAppRoutes() {
  return isStandardEffortMetaRouteEnabled()
    ? [...BASE_ROUTES, STANDARD_EFFORT_META_ROUTE]
    : BASE_ROUTES;
}

export const APP_ROUTES = getAppRoutes();

export function getAppRouteByPath(path) {
  if (path === LOGIN_ROUTE.path) {
    return LOGIN_ROUTE;
  }

  return getAppRoutes().find((route) => route.path === path) || null;
}

export function isKnownRoute(path) {
  return (
    path === LOGIN_ROUTE.path ||
    getAppRoutes().some((route) => route.path === path)
  );
}
