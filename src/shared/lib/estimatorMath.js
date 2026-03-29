import { DEFAULT_ITEMS } from "../constants/constants";

export function fmt(n) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function deepCloneItems() {
  return JSON.parse(JSON.stringify(DEFAULT_ITEMS));
}

export function calcItemMd(item) {
  return Number(
    (
      Number(item.baseMd || 0) *
      Number(item.difficulty || 1) *
      Number(item.complexity || 1)
    ).toFixed(2)
  );
}

export function calcSolutionTotal(items) {
  return Number(items.reduce((sum, item) => sum + calcItemMd(item), 0).toFixed(2));
}

export function calcSolutionTotals(itemsBySolution) {
  const result = {};
  Object.keys(DEFAULT_ITEMS).forEach((key) => {
    result[key] = calcSolutionTotal(itemsBySolution[key] || []);
  });
  return result;
}

export function calcGrandBaseTotal(solutionTotals) {
  return Object.values(solutionTotals).reduce((sum, n) => sum + n, 0);
}

export function calcScaledTotal(grandBaseTotal, scaleFactor) {
  return Number((grandBaseTotal * Number(scaleFactor)).toFixed(2));
}

export function calcRiskAppliedTotal(scaledTotal, riskFactor) {
  return Number((scaledTotal * Number(riskFactor)).toFixed(2));
}

export function calcMgmtMd(riskAppliedTotal, mgmtRate) {
  return Number((riskAppliedTotal * (Number(mgmtRate) / 100)).toFixed(2));
}

export function calcFinalTotal(riskAppliedTotal, mgmtMd) {
  return Number((riskAppliedTotal + mgmtMd).toFixed(2));
}

export function emptyProjectState() {
  return {
    id: null,
    activeTab: "pbx",
    projectName: "새 컨택센터 프로젝트",
    itemsBySolution: deepCloneItems(),
    scaleFactor: 1.0,
    riskFactor: 1.0,
    mgmtRate: 10,
    savedAt: "",
  };
}