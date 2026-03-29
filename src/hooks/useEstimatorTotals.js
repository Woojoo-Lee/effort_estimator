import { useMemo } from "react";

import {
  calcSolutionTotals,
  calcGrandBaseTotal,
  calcScaledTotal,
  calcRiskAppliedTotal,
  calcMgmtMd,
  calcFinalTotal,
} from "../shared/lib/estimatorMath";

export function useEstimatorTotals({
  itemsBySolution,
  activeTab,
  scaleFactor,
  riskFactor,
  mgmtRate,
}) {
  const solutionTotals = useMemo(
    () => calcSolutionTotals(itemsBySolution),
    [itemsBySolution]
  );

  const grandBaseTotal = useMemo(
    () => calcGrandBaseTotal(solutionTotals),
    [solutionTotals]
  );

  const scaledTotal = useMemo(
    () => calcScaledTotal(grandBaseTotal, scaleFactor),
    [grandBaseTotal, scaleFactor]
  );

  const riskAppliedTotal = useMemo(
    () => calcRiskAppliedTotal(scaledTotal, riskFactor),
    [scaledTotal, riskFactor]
  );

  const mgmtMd = useMemo(
    () => calcMgmtMd(riskAppliedTotal, mgmtRate),
    [riskAppliedTotal, mgmtRate]
  );

  const finalTotal = useMemo(
    () => calcFinalTotal(riskAppliedTotal, mgmtMd),
    [riskAppliedTotal, mgmtMd]
  );

  const currentItems = useMemo(
    () => itemsBySolution[activeTab] || [],
    [itemsBySolution, activeTab]
  );

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