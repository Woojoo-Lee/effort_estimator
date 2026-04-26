import { useEffect, useMemo } from "react";
import { useEstimatorStore } from "../store/useEstimatorStore";
import { useEstimatorDerivedState } from "./useEstimatorDerivedState";

export function useEstimatorViewModel() {
  const activeTab = useEstimatorStore((s) => s.activeTab);
  const itemsBySolution = useEstimatorStore((s) => s.itemsBySolution);
  const scaleFactor = useEstimatorStore((s) => s.scaleFactor);
  const riskFactor = useEstimatorStore((s) => s.riskFactor);
  const mgmtRate = useEstimatorStore((s) => s.mgmtRate);
  const baseEffortMetaRows = useEstimatorStore((s) => s.baseEffortMetaRows);
  const itemFieldMetaRows = useEstimatorStore((s) => s.itemFieldMetaRows);
  const calculationMetaRows = useEstimatorStore((s) => s.calculationMetaRows);
  const envVarMetaRows = useEstimatorStore((s) => s.envVarMetaRows);

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
    baseEffortMetaRows,
    itemFieldMetaRows,
    calculationMetaRows,
    envVarMetaRows,
  });

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__ESTIMATOR_DERIVED__ = {
        solutionTotals: derived.solutionTotals,
        grandBaseTotal: derived.grandBaseTotal,
        sidebarBaseTotal: derived.sidebarBaseTotal,
        finalTotal: derived.finalTotal,
        sidebarFinalTotal: derived.sidebarFinalTotal,
      };
    }
  }, [
    derived.solutionTotals,
    derived.grandBaseTotal,
    derived.sidebarBaseTotal,
    derived.finalTotal,
    derived.sidebarFinalTotal,
  ]);

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
      sidebarBaseTotal: derived.sidebarBaseTotal,
      scaledTotal: derived.scaledTotal,
      riskAppliedTotal: derived.riskAppliedTotal,
      sidebarScaledTotal: derived.sidebarScaledTotal,
      sidebarRiskAppliedTotal: derived.sidebarRiskAppliedTotal,
      mgmtRate,
      mgmtMd: derived.mgmtMd,
      sidebarMgmtMd: derived.sidebarMgmtMd,
      finalTotal: derived.finalTotal,
      sidebarFinalTotal: derived.sidebarFinalTotal,
      scaleFactor,
      setScaleFactor,
      riskFactor,
      setRiskFactor,
      setMgmtRate,
      markDirty,
      envVarMetaRows,
    }),
    [
      activeTab,
      derived.solutionTotals,
      derived.grandBaseTotal,
      derived.sidebarBaseTotal,
      derived.scaledTotal,
      derived.riskAppliedTotal,
      derived.sidebarScaledTotal,
      derived.sidebarRiskAppliedTotal,
      mgmtRate,
      derived.mgmtMd,
      derived.sidebarMgmtMd,
      derived.finalTotal,
      derived.sidebarFinalTotal,
      scaleFactor,
      setScaleFactor,
      riskFactor,
      setRiskFactor,
      setMgmtRate,
      markDirty,
      envVarMetaRows,
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
    baseEffortMetaRows,
    itemFieldMetaRows,
  };
}
