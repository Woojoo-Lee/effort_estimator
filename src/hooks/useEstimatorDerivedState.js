import { useMemo } from "react";

import {
  calcSolutionTotals,
  calcMetaSolutionTotal,
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
  calculationMetaRows = [],
  envVarMetaRows = [],
}) {
  const solutionTotals = useMemo(() => {
    const legacyTotals = calcSolutionTotals(itemsBySolution);
    const metaSolutionCodes = [
      ...new Set(
        calculationMetaRows
          .filter(
            (row) =>
              row.solution_code &&
              row.solution_code !== "stats" &&
              row.is_active !== false
          )
          .map((row) => row.solution_code)
      ),
    ];
    const metaTotals = metaSolutionCodes.reduce((totals, solutionCode) => {
      const itemCodes = new Set(
        calculationMetaRows
          .filter(
            (row) =>
              row.solution_code === solutionCode && row.is_active !== false
          )
          .map((row) => row.item_code)
      );

      return {
        ...totals,
        [solutionCode]: calcMetaSolutionTotal({
          solutionCode,
          items: (itemsBySolution?.[solutionCode] || []).filter((item) =>
            itemCodes.has(item.item_code || item.itemCode)
          ),
          baseEffortMetaRows,
          itemFieldMetaRows,
          calculationMetaRows,
        }),
      };
    }, {});
    const nextTotals = {
      ...legacyTotals,
      ...metaTotals,
    };
    const statsBaseEffortRows = baseEffortMetaRows.filter(
      (row) => row.solution_code === "stats" && row.is_active !== false
    );
    const statsItemFieldRows = itemFieldMetaRows.filter(
      (row) => row.solution_code === "stats" && row.is_active !== false
    );
    const canUseStatsMetaCalculation = statsBaseEffortRows.length > 0;

    if (!canUseStatsMetaCalculation) {
      return nextTotals;
    }

    return {
      ...nextTotals,
      stats: calcStatsMetaTotal({
        legacyItems: itemsBySolution?.stats || [],
        baseEffortRows: statsBaseEffortRows,
        itemFieldRows: statsItemFieldRows,
      }),
    };
  }, [
    itemsBySolution,
    baseEffortMetaRows,
    itemFieldMetaRows,
    calculationMetaRows,
  ]);

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

  const sidebarBaseTotal = useMemo(() => {
    if (activeTab === "summary") {
      return grandBaseTotal;
    }

    return Number(solutionTotals?.[activeTab] || 0);
  }, [activeTab, grandBaseTotal, solutionTotals]);

  const sidebarScaledTotal = useMemo(() => {
    return calcScaledTotal(sidebarBaseTotal, effectiveFactors.scaleFactor);
  }, [sidebarBaseTotal, effectiveFactors.scaleFactor]);

  const sidebarRiskAppliedTotal = useMemo(() => {
    return calcRiskAppliedTotal(sidebarScaledTotal, effectiveFactors.riskFactor);
  }, [sidebarScaledTotal, effectiveFactors.riskFactor]);

  const sidebarMgmtMd = useMemo(() => {
    return calcMgmtMd(sidebarRiskAppliedTotal, effectiveFactors.mgmtRate);
  }, [sidebarRiskAppliedTotal, effectiveFactors.mgmtRate]);

  const sidebarFinalTotal = useMemo(() => {
    return calcFinalTotal(sidebarRiskAppliedTotal, sidebarMgmtMd);
  }, [sidebarRiskAppliedTotal, sidebarMgmtMd]);

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
    sidebarBaseTotal,
    sidebarScaledTotal,
    sidebarRiskAppliedTotal,
    sidebarMgmtMd,
    sidebarFinalTotal,
    currentItems,
  };
}
