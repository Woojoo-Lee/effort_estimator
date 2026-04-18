import { emptyProjectState } from "./estimatorMath";
import {
  buildItemsBySolution,
  getPolicyValue,
  getSolutionOptions,
} from "./estimatorMeta";

function hasSolutionCodebookRows(codebooks) {
  return (codebooks || []).some(
    (code) => code.group_code === "SOLUTION" && code.is_active
  );
}

export function buildDefaultProjectState({
  itemMeta = [],
  policy = {},
  codebooks = [],
} = {}) {
  const fallback = emptyProjectState();
  const solutionKeys = hasSolutionCodebookRows(codebooks)
    ? getSolutionOptions(codebooks).map((solution) => solution.key)
    : [];

  return {
    ...fallback,
    activeTab: getPolicyValue(
      policy,
      "DEFAULT_ACTIVE_TAB",
      fallback.activeTab
    ),
    itemsBySolution: buildItemsBySolution(itemMeta, solutionKeys),
    scaleFactor: getPolicyValue(
      policy,
      "DEFAULT_SCALE_FACTOR",
      fallback.scaleFactor
    ),
    riskFactor: getPolicyValue(
      policy,
      "DEFAULT_RISK_FACTOR",
      fallback.riskFactor
    ),
    mgmtRate: getPolicyValue(policy, "DEFAULT_MGMT_RATE", fallback.mgmtRate),
  };
}
