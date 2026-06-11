import React, { useEffect } from "react";

import AppRouter from "./app/AppRouter";
import { useHashRoute } from "./app/useHashRoute";
import { AuthPermissionProvider, AuthSessionProvider } from "./features/auth";
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
  const route = useHashRoute();
  const loadMeta = useEstimatorStore((state) => state.loadMeta);
  const refreshEstimatorMetaRows = useEstimatorStore(
    (state) => state.refreshEstimatorMetaRows
  );

  useEffect(() => {
    loadMeta();
    refreshEstimatorMetaRows();
  }, [loadMeta, refreshEstimatorMetaRows]);

  return (
    <AuthSessionProvider>
      <AuthPermissionProvider>
        <MainLayout activeRoute={route}>
          <AppRouter route={route} />
        </MainLayout>
        <GlobalToast />
      </AuthPermissionProvider>
    </AuthSessionProvider>
  );
}
