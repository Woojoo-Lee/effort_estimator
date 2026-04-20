import { DEFAULT_ITEMS } from "../constants/constants";

export function fmt(value) {
  const num = Number(value ?? 0);

  if (!Number.isFinite(num)) {
    return "0";
  }

  const rounded = Math.round(num * 10) / 10;

  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(rounded);
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

export function calcBaseEffortTotal(baseEffortRows = []) {
  return Number(
    baseEffortRows
      .filter((row) => row.is_active !== false)
      .reduce((sum, row) => sum + Number(row.base_md || 0), 0)
      .toFixed(2)
  );
}

export function calcStatsAdditionalEffortTotal({
  legacyItems = [],
  itemFieldRows = [],
}) {
  const quantityField = itemFieldRows.find(
    (row) => row.field_key === "quantity" && row.is_active !== false
  );

  if (!quantityField) {
    return calcSolutionTotal(legacyItems);
  }

  const defaultQuantity = Number(quantityField.default_value ?? 1);
  const fallbackQuantity = Number.isFinite(defaultQuantity)
    ? defaultQuantity
    : 1;

  return Number(
    legacyItems
      .reduce((sum, item) => {
        const quantity = Number(item.quantity ?? fallbackQuantity);
        const safeQuantity = Number.isFinite(quantity) ? quantity : fallbackQuantity;

        return sum + Number(item.baseMd || 0) * safeQuantity;
      }, 0)
      .toFixed(2)
  );
}

export function calcStatsMetaTotal({
  legacyItems = [],
  baseEffortRows = [],
  itemFieldRows = [],
}) {
  return Number(
    (
      calcBaseEffortTotal(baseEffortRows) +
      calcStatsAdditionalEffortTotal({ legacyItems, itemFieldRows })
    ).toFixed(2)
  );
}

function getEnvVarNumber(envVarRows = [], varKey, fallbackValue) {
  const row = envVarRows.find(
    (item) =>
      item.var_key === varKey &&
      item.is_active !== false &&
      (!item.solution_code || item.solution_code === "stats")
  );
  const value = Number(
    row?.default_value ?? row?.var_value ?? row?.value ?? fallbackValue
  );

  return Number.isFinite(value) ? value : Number(fallbackValue);
}

export function calcStatsEnvFactors({
  envVarRows = [],
  scaleFactor,
  riskFactor,
  mgmtRate,
}) {
  return {
    scaleFactor: getEnvVarNumber(envVarRows, "SCALE_FACTOR", scaleFactor),
    riskFactor: getEnvVarNumber(envVarRows, "RISK_FACTOR", riskFactor),
    mgmtRate: getEnvVarNumber(envVarRows, "MGMT_RATE", mgmtRate),
  };
}

export function calcSolutionTotals(itemsBySolution) {
  const result = {};
  Object.keys(itemsBySolution || DEFAULT_ITEMS).forEach((key) => {
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
