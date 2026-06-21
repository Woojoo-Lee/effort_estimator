import { useEffect, useMemo } from "react";
import { useEstimatorStore } from "../store/useEstimatorStore";
import { useEstimatorDerivedState } from "./useEstimatorDerivedState";

function toNumberOrZero(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const num = Number(value);

  return Number.isFinite(num) ? num : 0;
}

function normalizeNumber(value) {
  return Number(toNumberOrZero(value).toFixed(10));
}

function addNumber(sum, value) {
  return normalizeNumber(sum + toNumberOrZero(value));
}

function buildStandardEffortTotals(results = []) {
  return {
    base_total_mm: results.reduce(
      (sum, row) => addNumber(sum, row.base_total_mm),
      0
    ),
    coefficient_total: results.reduce(
      (sum, row) => addNumber(sum, row.coefficient_total),
      0
    ),
    standard_effort_mm: results.reduce(
      (sum, row) => addNumber(sum, row.standard_effort_mm),
      0
    ),
    actual_effort_mm: results.reduce(
      (sum, row) => addNumber(sum, row.actual_effort_mm),
      0
    ),
    gap_mm: results.reduce((sum, row) => addNumber(sum, row.gap_mm), 0),
    solution_count: results.length,
  };
}

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
  const standardEffortMeta = useEstimatorStore((s) => s.standardEffortMeta);
  const standardProjectSolutionSelections = useEstimatorStore(
    (s) => s.standardProjectSolutionSelections
  );
  const standardProjectItemSelections = useEstimatorStore(
    (s) => s.standardProjectItemSelections
  );
  const standardEffortResults = useEstimatorStore(
    (s) => s.standardEffortResults
  );
  const standardEffortLoading = useEstimatorStore(
    (s) => s.standardEffortLoading
  );
  const standardEffortError = useEstimatorStore((s) => s.standardEffortError);
  const standardEffortLoadedProjectId = useEstimatorStore(
    (s) => s.standardEffortLoadedProjectId
  );
  const standardEffortLastChange = useEstimatorStore(
    (s) => s.standardEffortLastChange
  );
  const standardEffortLastChangeLoading = useEstimatorStore(
    (s) => s.standardEffortLastChangeLoading
  );
  const standardEffortLastChangeError = useEstimatorStore(
    (s) => s.standardEffortLastChangeError
  );

  const setActiveTab = useEstimatorStore((s) => s.setActiveTab);
  const setScaleFactor = useEstimatorStore((s) => s.setScaleFactor);
  const setRiskFactor = useEstimatorStore((s) => s.setRiskFactor);
  const setMgmtRate = useEstimatorStore((s) => s.setMgmtRate);

  const markDirty = useEstimatorStore((s) => s.markDirty);
  const updateItem = useEstimatorStore((s) => s.updateItem);
  const addItem = useEstimatorStore((s) => s.addItem);
  const removeItem = useEstimatorStore((s) => s.removeItem);
  const showToast = useEstimatorStore((s) => s.showToast);
  const loadStandardEffortMeta = useEstimatorStore(
    (s) => s.loadStandardEffortMeta
  );
  const loadProjectStandardEffort = useEstimatorStore(
    (s) => s.loadProjectStandardEffort
  );
  const refreshProjectStandardEffort = useEstimatorStore(
    (s) => s.refreshProjectStandardEffort
  );
  const recalculateStandardEffort = useEstimatorStore(
    (s) => s.recalculateStandardEffort
  );
  const setStandardProjectSolutionSelections = useEstimatorStore(
    (s) => s.setStandardProjectSolutionSelections
  );
  const setStandardProjectItemSelections = useEstimatorStore(
    (s) => s.setStandardProjectItemSelections
  );
  const saveStandardProjectSolutionSelections = useEstimatorStore(
    (s) => s.saveStandardProjectSolutionSelections
  );
  const saveStandardProjectItemSelections = useEstimatorStore(
    (s) => s.saveStandardProjectItemSelections
  );
  const updateStandardActualEffort = useEstimatorStore(
    (s) => s.updateStandardActualEffort
  );
  const loadStandardEffortLastChange = useEstimatorStore(
    (s) => s.loadStandardEffortLastChange
  );

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

  const standardEffortTotals = useMemo(
    () => buildStandardEffortTotals(standardEffortResults || []),
    [standardEffortResults]
  );

  const standardEffort = useMemo(
    () => ({
      meta: standardEffortMeta,
      projectSolutionSelections: standardProjectSolutionSelections,
      projectItemSelections: standardProjectItemSelections,
      results: standardEffortResults,
      loading: standardEffortLoading,
      error: standardEffortError,
      loadedProjectId: standardEffortLoadedProjectId,
      lastChange: standardEffortLastChange,
      lastChangeLoading: standardEffortLastChangeLoading,
      lastChangeError: standardEffortLastChangeError,
      totals: standardEffortTotals,
    }),
    [
      standardEffortMeta,
      standardProjectSolutionSelections,
      standardProjectItemSelections,
      standardEffortResults,
      standardEffortLoading,
      standardEffortError,
      standardEffortLoadedProjectId,
      standardEffortLastChange,
      standardEffortLastChangeLoading,
      standardEffortLastChangeError,
      standardEffortTotals,
    ]
  );

  const standardEffortActions = useMemo(
    () => ({
      loadStandardEffortMeta,
      loadProjectStandardEffort,
      refreshProjectStandardEffort,
      recalculateStandardEffort,
      setStandardProjectSolutionSelections,
      setStandardProjectItemSelections,
      saveStandardProjectSolutionSelections,
      saveStandardProjectItemSelections,
      updateStandardActualEffort,
      loadStandardEffortLastChange,
    }),
    [
      loadStandardEffortMeta,
      loadProjectStandardEffort,
      refreshProjectStandardEffort,
      recalculateStandardEffort,
      setStandardProjectSolutionSelections,
      setStandardProjectItemSelections,
      saveStandardProjectSolutionSelections,
      saveStandardProjectItemSelections,
      updateStandardActualEffort,
      loadStandardEffortLastChange,
    ]
  );

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
    standardEffort,
    standardEffortActions,
  };
}
