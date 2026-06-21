import { useEffect, useRef } from "react";
import { useEstimatorStore } from "../store/useEstimatorStore";
import { useAuthPermission } from "../features/auth";

const AUTO_SAVE_DELAY = 2500;

export function useAutoSave({ enabled = true } = {}) {
  const { authz, user } = useAuthPermission();
  const isDirty = useEstimatorStore((s) => s.isDirty);
  const dbReady = useEstimatorStore((s) => s.dbReady);
  const isBusy = useEstimatorStore((s) => s.isBusy);
  const handleSaveProject = useEstimatorStore((s) => s.handleSaveProject);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !dbReady || !isDirty || isBusy) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      handleSaveProject({ currentUser: user || authz.user });
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [authz.user, dbReady, enabled, isDirty, isBusy, handleSaveProject, user]);
}
