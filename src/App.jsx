import React, { useEffect } from "react";

import AppRouter from "./app/AppRouter";
import { useHashRoute } from "./app/useHashRoute";
import {
  AuthPermissionProvider,
  AuthSessionProvider,
  LoginPage,
  useAuthSession,
} from "./features/auth";
import MainLayout from "./features/layout/components/MainLayout";
import Toast from "./features/layout/components/Toast";
import { useToastState } from "./hooks/useToastState";
import { useEstimatorStore } from "./store/useEstimatorStore";

function GlobalToast() {
  const toast = useToastState();
  return <Toast message={toast.message} tone={toast.tone} />;
}

if (import.meta.env.DEV) {
  window.__ESTIMATOR_STORE__ = useEstimatorStore;
}

export default function ContactCenterEffortEstimator() {
  return (
    <AuthSessionProvider>
      <AuthenticatedApp />
    </AuthSessionProvider>
  );
}

function AuthenticatedApp() {
  const route = useHashRoute();
  const authSession = useAuthSession();
  const loadMeta = useEstimatorStore((state) => state.loadMeta);
  const refreshEstimatorMetaRows = useEstimatorStore(
    (state) => state.refreshEstimatorMetaRows
  );

  useEffect(() => {
    if (authSession.requireLogin && !authSession.isAuthenticated) {
      return;
    }

    loadMeta();
    refreshEstimatorMetaRows();
  }, [
    authSession.isAuthenticated,
    authSession.requireLogin,
    loadMeta,
    refreshEstimatorMetaRows,
  ]);

  if (authSession.requireLogin && authSession.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
          Loading session...
        </section>
      </div>
    );
  }

  if (authSession.requireLogin && !authSession.isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AuthPermissionProvider>
      <MainLayout activeRoute={route}>
        <AppRouter route={route} />
      </MainLayout>
      <GlobalToast />
    </AuthPermissionProvider>
  );
}
