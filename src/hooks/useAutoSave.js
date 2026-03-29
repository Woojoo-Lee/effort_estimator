import { useEffect, useRef } from "react";
import { useEstimatorStore } from "../store/useEstimatorStore";

const AUTO_SAVE_DELAY = 2500;

export function useAutoSave() {
  const isDirty = useEstimatorStore((s) => s.isDirty);
  const dbReady = useEstimatorStore((s) => s.dbReady);
  const isBusy = useEstimatorStore((s) => s.isBusy);
  const handleSaveProject = useEstimatorStore((s) => s.handleSaveProject);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!dbReady || !isDirty || isBusy) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      handleSaveProject();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [dbReady, isDirty, isBusy, handleSaveProject]);
}