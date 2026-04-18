import React, { useEffect } from "react";

import AppRouter from "./app/AppRouter";
import { useHashRoute } from "./app/useHashRoute";
import MainLayout from "./features/layout/components/MainLayout";
import Toast from "./features/layout/components/Toast";
import { useToastState } from "./hooks/useToastState";
import { useEstimatorStore } from "./store/useEstimatorStore";

function GlobalToast() {
  const toast = useToastState();
  return <Toast message={toast.message} tone={toast.tone} />;
}

export default function ContactCenterEffortEstimator() {
  const route = useHashRoute();
  const loadMeta = useEstimatorStore((state) => state.loadMeta);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  return (
    <>
      <MainLayout activeRoute={route}>
        <AppRouter route={route} />
      </MainLayout>
      <GlobalToast />
    </>
  );
}
