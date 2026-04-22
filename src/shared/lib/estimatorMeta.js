import {
  SOLUTIONS,
  DEFAULT_ITEMS,
  difficultyOptions,
  complexityOptions,
  scaleOptions,
  riskOptions,
} from "../constants/constants";

const DIFFICULTY_FACTORS = {
  1: 0.8,
  2: 1.0,
  3: 1.2,
};

const COMPLEXITY_FACTORS = {
  1: 0.9,
  2: 1.0,
  3: 1.3,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function activeCodes(codebooks, groupCode) {
  return (codebooks || [])
    .filter((code) => code.group_code === groupCode && code.is_active)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function optionValue(code, factorMap) {
  const codeKey = String(code.code);
  const valueKey = String(code.code_value);

  return Number(factorMap[codeKey] ?? factorMap[valueKey] ?? code.code_value);
}

function getNumericCodeOptions(codebooks, groupCode, fallbackOptions) {
  const codes = activeCodes(codebooks, groupCode);

  if (codes.length === 0) {
    return fallbackOptions;
  }

  return codes.map((code) => {
    const value = Number(code.code_value ?? code.code);

    return {
      value,
      label: `${code.code_name} (${value})`,
    };
  });
}

function buildDefaultItemFromMeta(item) {
  return {
    itemCode: item.item_code,
    name: item.item_name,
    baseMd: Number(item.default_base_md ?? 0),
    difficulty: Number(DIFFICULTY_FACTORS[item.default_difficulty] ?? 1),
    complexity: Number(COMPLEXITY_FACTORS[item.default_complexity] ?? 1),
    note: item.default_note || "",
  };
}

function buildStatsItemFromMeta(item) {
  return {
    item_code: item.item_code,
    itemCode: item.item_code,
    name: item.item_name,
    quantity: 1,
    is_realtime: false,
    use_export: false,
    baseMd: Number(item.default_base_md ?? 0),
    note: item.default_note || "",
  };
}

function mergeStatsItemsWithDefaults(statsItems = []) {
  const defaultStatsItems = clone(DEFAULT_ITEMS.stats || []);
  const statsItemsByCode = new Map(
    statsItems.map((item) => [item.item_code || item.itemCode, item])
  );

  return defaultStatsItems.map((defaultItem) => {
    const itemCode = defaultItem.item_code || defaultItem.itemCode;
    return statsItemsByCode.get(itemCode) || defaultItem;
  });
}

export function getSolutionTabs(codebooks) {
  const summaryTab = SOLUTIONS.find((solution) => solution.key === "summary");
  const solutionCodes = activeCodes(codebooks, "SOLUTION");

  if (solutionCodes.length === 0) {
    return SOLUTIONS;
  }

  return [
    summaryTab,
    ...solutionCodes.map((code) => ({
      key: code.code_value || code.code,
      label: code.code_name,
      icon: null,
    })),
  ].filter(Boolean);
}

export function getSolutionOptions(codebooks) {
  return getSolutionTabs(codebooks).filter((solution) => solution.key !== "summary");
}

export function getDifficultyOptions(codebooks) {
  const codes = activeCodes(codebooks, "DIFFICULTY");

  if (codes.length === 0) {
    return difficultyOptions;
  }

  return codes.map((code) => {
    const value = optionValue(code, DIFFICULTY_FACTORS);

    return {
      value,
      label: `${code.code_name} (${value})`,
    };
  });
}

export function getComplexityOptions(codebooks) {
  const codes = activeCodes(codebooks, "COMPLEXITY");

  if (codes.length === 0) {
    return complexityOptions;
  }

  return codes.map((code) => {
    const value = optionValue(code, COMPLEXITY_FACTORS);

    return {
      value,
      label: `${code.code_name} (${value})`,
    };
  });
}

export function getScaleOptions(codebooks) {
  return getNumericCodeOptions(codebooks, "SCALE", scaleOptions);
}

export function getRiskOptions(codebooks) {
  return getNumericCodeOptions(codebooks, "RISK", riskOptions);
}

export function buildItemsBySolution(itemMeta, solutionKeys = []) {
  const activeItems = (itemMeta || [])
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.sort_order || a.id || 0) - Number(b.sort_order || b.id || 0));
  const keys = solutionKeys.length > 0
    ? solutionKeys
    : [...new Set(activeItems.map((item) => item.solution_code).filter(Boolean))];

  if (activeItems.length === 0 && keys.length === 0) {
    return clone(DEFAULT_ITEMS);
  }

  const initialItemsBySolution = keys.reduce((result, key) => {
    result[key] = [];
    return result;
  }, {});

  const itemsBySolution = activeItems.reduce((result, item) => {
    const solutionCode = item.solution_code;

    if (!result[solutionCode]) {
      result[solutionCode] = [];
    }

    result[solutionCode].push(
      solutionCode === "stats"
        ? buildStatsItemFromMeta(item)
        : buildDefaultItemFromMeta(item)
    );

    return result;
  }, initialItemsBySolution);

  if ("stats" in itemsBySolution) {
    itemsBySolution.stats = mergeStatsItemsWithDefaults(itemsBySolution.stats);
  }

  return itemsBySolution;
}

export function getPolicyValue(policy, policyCode, fallback) {
  const value = policy?.[policyCode];

  if (value == null || value === "") {
    return fallback;
  }

  if (typeof fallback === "number") {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  return value;
}
