import React from "react";

import CodebookPage from "../features/codebooks/pages/CodebookPage";
import EstimatorPage from "../features/estimator/pages/EstimatorPage";
import ItemMetaPage from "../features/itemMeta/pages/ItemMetaPage";
import ProjectPage from "../features/projects/pages/ProjectPage";
import StandardEffortMetaPage from "../features/standardEffortMeta/pages/StandardEffortMetaPage";
import {
  canAccessRoute,
  getRouteDeniedReason,
  LoginPage,
  UserManagementPage,
  useAuthPermission,
  useAuthSession,
} from "../features/auth";
import { getAppRouteByPath, LOGIN_ROUTE } from "./routes";

function AccessDenied() {
  return (
    <div className="mx-auto max-w-[960px] p-4">
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-extrabold text-slate-900">
          {getRouteDeniedReason()}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          필요한 권한이 없거나 비활성화된 기능입니다.
        </p>
      </section>
    </div>
  );
}

export default function AppRouter({ route }) {
  const { authz } = useAuthPermission();
  const authSession = useAuthSession();
  const routeMeta = getAppRouteByPath(route);

  if (route === LOGIN_ROUTE.path) {
    return <LoginPage />;
  }

  if (authSession.requireLogin && authSession.loading) {
    return (
      <div className="mx-auto max-w-[960px] p-4">
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Loading session...
        </section>
      </div>
    );
  }

  if (authSession.requireLogin && !authSession.isAuthenticated) {
    return <LoginPage />;
  }

  if (!canAccessRoute(routeMeta, authz, { env: import.meta.env })) {
    return <AccessDenied />;
  }

  switch (route) {
    case "/codebooks":
      return <CodebookPage />;
    case "/item-meta":
      return <ItemMetaPage />;
    case "/standard-effort-meta":
      return <StandardEffortMetaPage />;
    case "/users":
      return <UserManagementPage />;
    case "/projects":
      return <ProjectPage />;
    case "/estimator":
    default:
      return <EstimatorPage />;
  }
}
