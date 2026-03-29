import { useMemo } from "react";

import {
  calcSolutionTotals,
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
}) {
  const solutionTotals = useMemo(() => {
    return calcSolutionTotals(itemsBySolution);
  }, [itemsBySolution]);

  const grandBaseTotal = useMemo(() => {
    return calcGrandBaseTotal(solutionTotals);
  }, [solutionTotals]);

  const scaledTotal = useMemo(() => {
    return calcScaledTotal(grandBaseTotal, scaleFactor);
  }, [grandBaseTotal, scaleFactor]);

  const riskAppliedTotal = useMemo(() => {
    return calcRiskAppliedTotal(scaledTotal, riskFactor);
  }, [scaledTotal, riskFactor]);

  const mgmtMd = useMemo(() => {
    return calcMgmtMd(riskAppliedTotal, mgmtRate);
  }, [riskAppliedTotal, mgmtRate]);

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