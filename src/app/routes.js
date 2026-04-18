export const DEFAULT_ROUTE = "/estimator";

export const APP_ROUTES = [
  {
    path: "/estimator",
    label: "공수 산정",
  },
  {
    path: "/codebooks",
    label: "코드북 관리",
  },
  {
    path: "/item-meta",
    label: "항목 메타 관리",
  },
  {
    path: "/projects",
    label: "프로젝트 관리",
  },
];

export function isKnownRoute(path) {
  return APP_ROUTES.some((route) => route.path === path);
}
