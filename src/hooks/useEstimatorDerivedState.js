import { useMemo } from "react";

import {
  calcSolutionTotals,
  calcStatsMetaTotal,
  calcStatsEnvFactors,
  calcGrandBaseTotal,
  calcScaledTotal,
  calcRiskAppliedTotal,
  calcMgmtMd,
  calcFinalTotal,
} from "../shared/lib/estimatorMath";

export function useEstimatorDerivedState({
  itemsBySolution,
  activeTab,
  scaleFactor,
  riskFactor,
  mgmtRate,
  baseEffortMetaRows = [],
  itemFieldMetaRows = [],
  envVarMetaRows = [],
}) {
  const solutionTotals = useMemo(() => {
    const legacyTotals = calcSolutionTotals(itemsBySolution);
    const statsBaseEffortRows = baseEffortMetaRows.filter(
      (row) => row.solution_code === "stats" && row.is_active !== false
    );
    const statsItemFieldRows = itemFieldMetaRows.filter(
      (row) => row.solution_code === "stats" && row.is_active !== false
    );
    const canUseStatsMetaCalculation = statsBaseEffortRows.length > 0;

    if (!canUseStatsMetaCalculation) {
      return legacyTotals;
    }

    return {
      ...legacyTotals,
      stats: calcStatsMetaTotal({
        legacyItems: itemsBySolution?.stats || [],
        baseEffortRows: statsBaseEffortRows,
        itemFieldRows: statsItemFieldRows,
      }),
    };
  }, [itemsBySolution, baseEffortMetaRows, itemFieldMetaRows]);

  const grandBaseTotal = useMemo(() => {
    return calcGrandBaseTotal(solutionTotals);
  }, [solutionTotals]);

  const effectiveFactors = useMemo(() => {
    if (activeTab !== "stats") {
      return { scaleFactor, riskFactor, mgmtRate };
    }

    return calcStatsEnvFactors({
      envVarRows: envVarMetaRows,
      scaleFactor,
      riskFactor,
      mgmtRate,
    });
  }, [activeTab, envVarMetaRows, scaleFactor, riskFactor, mgmtRate]);

  const scaledTotal = useMemo(() => {
    return calcScaledTotal(grandBaseTotal, effectiveFactors.scaleFactor);
  }, [grandBaseTotal, effectiveFactors.scaleFactor]);

  const riskAppliedTotal = useMemo(() => {
    return calcRiskAppliedTotal(scaledTotal, effectiveFactors.riskFactor);
  }, [scaledTotal, effectiveFactors.riskFactor]);

  const mgmtMd = useMemo(() => {
    return calcMgmtMd(riskAppliedTotal, effectiveFactors.mgmtRate);
  }, [riskAppliedTotal, effectiveFactors.mgmtRate]);

  const finalTotal = useMemo(() => {
    return calcFinalTotal(riskAppliedTotal, mgmtMd);
  }, [riskAppliedTotal, mgmtMd]);

  const currentItems = useMemo(() => {
    return itemsBySolution?.[activeTab] || [];
  }, [itemsBySolution, activeTab]);

  return {
    solutionTotals,
    grandBaseTotal,
    scaledTotal,
    riskAppliedTotal,
    mgmtMd,
    finalTotal,
    currentItems,
  };
}
