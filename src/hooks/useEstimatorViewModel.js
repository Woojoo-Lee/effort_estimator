import { useMemo } from "react";
import { useEstimatorStore } from "../store/useEstimatorStore";
import { useEstimatorDerivedState } from "./useEstimatorDerivedState";

export function useEstimatorViewModel() {
  const activeTab = useEstimatorStore((s) => s.activeTab);
  const itemsBySolution = useEstimatorStore((s) => s.itemsBySolution);
  const scaleFactor = useEstimatorStore((s) => s.scaleFactor);
  const riskFactor = useEstimatorStore((s) => s.riskFactor);
  const mgmtRate = useEstimatorStore((s) => s.mgmtRate);

  const setActiveTab = useEstimatorStore((s) => s.setActiveTab);
  const setScaleFactor = useEstimatorStore((s) => s.setScaleFactor);
  const setRiskFactor = useEstimatorStore((s) => s.setRiskFactor);
  const setMgmtRate = useEstimatorStore((s) => s.setMgmtRate);

  const markDirty = useEstimatorStore((s) => s.markDirty);
  const updateItem = useEstimatorStore((s) => s.updateItem);
  const addItem = useEstimatorStore((s) => s.addItem);
  const removeItem = useEstimatorStore((s) => s.removeItem);
  const showToast = useEstimatorStore((s) => s.showToast);

  const derived = useEstimatorDerivedState({
    itemsBySolution,
    activeTab,
    scaleFactor,
    riskFactor,
    mgmtRate,
  });

  const detailActions = useMemo(
    () => ({
      updateItem,
      addItem: (solutionKey) => {
        addItem(solutionKey);
        showToast("항목 추가 완료", "blue");
      },
      removeItem: (solutionKey, index) => {
        removeItem(solutionKey, index);
        showToast("항목 삭제 완료", "blue");
      },
    }),
    [updateItem, addItem, removeItem, showToast]
  );

  const sidebarModel = useMemo(
    () => ({
      activeTab,
      solutionTotals: derived.solutionTotals,
      grandBaseTotal: derived.grandBaseTotal,
      scaledTotal: derived.scaledTotal,
      riskAppliedTotal: derived.riskAppliedTotal,
      mgmtRate,
      mgmtMd: derived.mgmtMd,
      finalTotal: derived.finalTotal,
      scaleFactor,
      setScaleFactor,
      riskFactor,
      setRiskFactor,
      setMgmtRate,
      markDirty,
    }),
    [
      activeTab,
      derived.solutionTotals,
      derived.grandBaseTotal,
      derived.scaledTotal,
      derived.riskAppliedTotal,
      mgmtRate,
      derived.mgmtMd,
      derived.finalTotal,
      scaleFactor,
      setScaleFactor,
      riskFactor,
      setRiskFactor,
      setMgmtRate,
      markDirty,
    ]
  );

  return {
    activeTab,
    setActiveTab,
    currentItems: derived.currentItems,
    solutionTotals: derived.solutionTotals,
    grandBaseTotal: derived.grandBaseTotal,
    scaledTotal: derived.scaledTotal,
    riskAppliedTotal: derived.riskAppliedTotal,
    mgmtMd: derived.mgmtMd,
    finalTotal: derived.finalTotal,
    sidebarModel,
    detailActions,
  };
}