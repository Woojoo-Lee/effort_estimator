import { supabase } from "../../supabaseClient";
import {
  normalizeBaseEffortRow,
  normalizeCoefficientRow,
  normalizeSolutionVariant,
  normalizeStandardItemRow,
  toNumberOrZero,
} from "../../../shared/lib/standardEffortMapper";
import { calculateStandardEffort } from "../../../shared/lib/standardEffortMath";
import { mergeUpdateHistoryFields } from "../../../features/auth/lib/rowHistoryActor";

const TABLES = {
  solutions: "estimation_solution",
  solutionVariants: "estimation_solution_variant",
  baseEffort: "estimation_standard_base_effort_meta",
  items: "estimation_standard_item_meta",
  coefficients: "estimation_item_solution_coefficient_meta",
};

export const STANDARD_BASE_EFFORT_PHASES = [
  { phase_code: "analysis", phase_name: "분석", display_order: 10 },
  { phase_code: "design", phase_name: "설계", display_order: 20 },
  { phase_code: "implementation", phase_name: "구현", display_order: 30 },
  { phase_code: "test", phase_name: "단위/통합테스트", display_order: 40 },
  {
    phase_code: "deployment",
    phase_name: "이행 및 모니터링",
    display_order: 50,
  },
];

const PHASE_BY_CODE = new Map(
  STANDARD_BASE_EFFORT_PHASES.map((phase) => [phase.phase_code, phase])
);

const EPSILON = 0.0001;
const EXPECTED_ROW_COUNTS = [
  { key: "solution_count", label: "solution 수", expected: 9 },
  { key: "solution_variant_count", label: "solution variant 수", expected: 11 },
  { key: "base_effort_count", label: "base effort row 수", expected: 55 },
  { key: "item_count", label: "item row 수", expected: 67 },
  { key: "coefficient_count", label: "coefficient row 수", expected: 737 },
];
const REPRESENTATIVE_BASE_TOTALS = [
  { label: "PBX", expected: 6 },
  { label: "CTI v4", expected: 2 },
  { label: "WFM", expected: 8 },
];
const S1_PROJECT_ID = "s1-fixture-preview";
const S1_FIXTURE_VARIANTS = [
  {
    key: "pbx:avaya",
    label: "PBX",
    solution_code: "pbx",
    variant_code: "avaya",
    actual_effort_mm: 7.3,
    expected_standard_effort_mm: 7.68,
  },
  {
    key: "cti:v4",
    label: "CTI v4",
    solution_code: "cti",
    variant_code: "v4",
    actual_effort_mm: 9.1,
    expected_standard_effort_mm: 9.06,
  },
  {
    key: "cms:avaya",
    label: "CMS",
    solution_code: "cms",
    variant_code: "avaya",
    actual_effort_mm: 1.8,
    expected_standard_effort_mm: 5.2,
  },
  {
    key: "callbot:v3",
    label: "CallBot",
    solution_code: "callbot",
    variant_code: "v3",
    actual_effort_mm: 8.84,
    expected_standard_effort_mm: 13.2,
  },
  {
    key: "stat:v2",
    label: "STAT",
    solution_code: "stat",
    variant_code: "v2",
    actual_effort_mm: 13.75,
    expected_standard_effort_mm: 14.88,
  },
];
const S1_EXPECTED_TOTAL_MM = 50.02;
const S1_CHECKED_EXCEL_ROWS_BY_VARIANT_KEY = {
  "pbx:avaya": [16, 18, 26, 28, 34, 40, 42, 44, 45, 47, 56, 58],
  "cti:v4": [16, 18, 26, 28, 31, 32, 38, 39, 42, 44, 45, 47, 59],
  "cms:avaya": [16, 18, 26, 28, 44],
  "callbot:v3": [16, 18, 26, 28, 29, 31, 32, 38, 39, 40, 44, 47, 48, 53, 64],
  "stat:v2": [16, 18, 26, 28, 30, 32, 38, 41, 52, 64],
};

function getClient(client) {
  const dbClient = client || supabase;

  if (!dbClient) {
    throw new Error("Supabase client not initialized.");
  }

  return dbClient;
}

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

function toActive(row = {}) {
  return row.active !== false && row.is_active !== false;
}

function normalizeSolution(row = {}) {
  return {
    solution_code: row.solution_code,
    solution_name: row.solution_name,
    display_order: toNumberOrZero(row.display_order),
    active: toActive(row),
  };
}

function getVariantLabel(variant = {}) {
  return (
    variant.display_name ||
    [variant.solution_name, variant.variant_name].filter(Boolean).join(" ") ||
    variant.solution_variant_id ||
    ""
  );
}

function sortByDisplayOrder(rows = []) {
  return [...rows].sort((a, b) => {
    const orderCompare =
      toNumberOrZero(a.display_order) - toNumberOrZero(b.display_order);

    if (orderCompare !== 0) {
      return orderCompare;
    }

    return getVariantLabel(a).localeCompare(getVariantLabel(b));
  });
}

function normalizeNumber(value, precision = 10) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? Number(numberValue.toFixed(precision))
    : 0;
}

function isClose(actual, expected, tolerance = EPSILON) {
  return Math.abs(normalizeNumber(actual) - normalizeNumber(expected)) <= tolerance;
}

function variantNaturalKey(row = {}) {
  return `${row.solution_code}:${row.variant_code}`;
}

function getVariantByNaturalKey(solutionVariants = []) {
  return new Map(solutionVariants.map((variant) => [variantNaturalKey(variant), variant]));
}

function getItemByExcelRowNo(itemRows = []) {
  return new Map(
    itemRows
      .filter((item) => item.excel_row_no !== null && item.excel_row_no !== undefined)
      .map((item) => [Number(item.excel_row_no), item])
  );
}

function getCheckStatus(actual, expected, { unavailable = false } = {}) {
  if (unavailable) {
    return "계산 불가";
  }

  return isClose(actual, expected) ? "일치" : "변경됨";
}

function buildRowCountChecks(counts = {}) {
  return EXPECTED_ROW_COUNTS.map((check) => {
    const actual = counts[check.key] || 0;

    return {
      ...check,
      actual,
      difference: normalizeNumber(actual - check.expected),
      status: actual === check.expected ? "정상" : "주의",
    };
  });
}

function buildBaseTotalChecks(summary = {}) {
  const totals = summary.base_total_by_variant || [];

  return REPRESENTATIVE_BASE_TOTALS.map((target) => {
    const current = totals.find((row) => row.display_name === target.label);
    const actual = normalizeNumber(current?.base_total_mm ?? 0);

    return {
      label: target.label,
      expected: target.expected,
      actual,
      difference: normalizeNumber(actual - target.expected),
      status: getCheckStatus(actual, target.expected, { unavailable: !current }),
    };
  });
}

function buildCoefficientMatrixCheck({
  solutionVariants = [],
  itemRows = [],
  coefficientRows = [],
}) {
  const expected = itemRows.length * solutionVariants.length;
  const activeVariants = solutionVariants.filter((variant) => variant.active !== false);
  const activeItems = itemRows.filter((item) => item.active !== false);
  const activeVariantIds = new Set(activeVariants.map((variant) => variant.solution_variant_id));
  const activeItemIds = new Set(activeItems.map((item) => item.item_id));
  const activeExpected = activeItems.length * activeVariants.length;
  const keyCounts = new Map();
  const activeKeyCounts = new Map();

  coefficientRows.forEach((row) => {
    const key = `${row.item_id}:${row.solution_variant_id}`;

    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);

    if (
      row.active !== false &&
      activeItemIds.has(row.item_id) &&
      activeVariantIds.has(row.solution_variant_id)
    ) {
      activeKeyCounts.set(key, (activeKeyCounts.get(key) || 0) + 1);
    }
  });

  const unique = keyCounts.size;
  const activeUnique = activeKeyCounts.size;
  const duplicates = [...keyCounts.values()].reduce(
    (sum, count) => sum + Math.max(count - 1, 0),
    0
  );
  const activeDuplicates = [...activeKeyCounts.values()].reduce(
    (sum, count) => sum + Math.max(count - 1, 0),
    0
  );
  const missing = Math.max(expected - unique, 0);
  const activeMissing = Math.max(activeExpected - activeUnique, 0);

  return {
    expected_row_count: expected,
    actual_row_count: coefficientRows.length,
    unique_row_count: unique,
    missing_count: missing,
    duplicate_count: duplicates,
    completeness_percentage:
      expected > 0 ? normalizeNumber((unique / expected) * 100, 2) : 100,
    status: missing === 0 && duplicates === 0 ? "정상" : "주의",
    active_expected_row_count: activeExpected,
    active_unique_row_count: activeUnique,
    active_missing_count: activeMissing,
    active_duplicate_count: activeDuplicates,
    active_completeness_percentage:
      activeExpected > 0
        ? normalizeNumber((activeUnique / activeExpected) * 100, 2)
        : 100,
    active_status:
      activeMissing === 0 && activeDuplicates === 0 ? "정상" : "주의",
  };
}

function buildS1FixturePreview(meta = {}) {
  const solutionVariants = meta.solutionVariants || [];
  const itemRows = meta.itemRows || [];
  const variantByKey = getVariantByNaturalKey(solutionVariants);
  const itemByExcelRowNo = getItemByExcelRowNo(itemRows);
  const missingVariantKeys = [];
  const missingExcelRows = new Set();
  const projectSolutionSelections = [];
  const projectItemSelections = [];

  S1_FIXTURE_VARIANTS.forEach((fixtureVariant) => {
    const variant = variantByKey.get(fixtureVariant.key);

    if (!variant) {
      missingVariantKeys.push(fixtureVariant.key);
      return;
    }

    projectSolutionSelections.push({
      project_id: S1_PROJECT_ID,
      solution_variant_id: variant.solution_variant_id,
      enabled: true,
      actual_effort_mm: fixtureVariant.actual_effort_mm,
    });

    (S1_CHECKED_EXCEL_ROWS_BY_VARIANT_KEY[fixtureVariant.key] || []).forEach(
      (excelRowNo) => {
        const item = itemByExcelRowNo.get(excelRowNo);

        if (!item) {
          missingExcelRows.add(excelRowNo);
          return;
        }

        projectItemSelections.push({
          project_id: S1_PROJECT_ID,
          solution_variant_id: variant.solution_variant_id,
          item_id: item.item_id,
          checked: true,
        });
      }
    );
  });

  const results = calculateStandardEffort({
    projectId: S1_PROJECT_ID,
    solutionVariants,
    baseEffortRows: meta.baseEffortRows || [],
    itemRows,
    coefficientRows: meta.coefficientRows || [],
    projectSolutionSelections,
    projectItemSelections,
  });
  const resultByVariantKey = new Map(
    results.map((result) => [variantNaturalKey(result), result])
  );
  const rows = S1_FIXTURE_VARIANTS.map((fixtureVariant) => {
    const result = resultByVariantKey.get(fixtureVariant.key);
    const current = result?.standard_effort_mm;
    const unavailable =
      !variantByKey.has(fixtureVariant.key) || current === undefined;
    const difference = unavailable
      ? null
      : normalizeNumber(current - fixtureVariant.expected_standard_effort_mm, 4);

    return {
      key: fixtureVariant.key,
      label: fixtureVariant.label,
      expected_standard_effort_mm: fixtureVariant.expected_standard_effort_mm,
      current_standard_effort_mm: unavailable ? null : normalizeNumber(current, 4),
      difference_mm: difference,
      status: getCheckStatus(current, fixtureVariant.expected_standard_effort_mm, {
        unavailable,
      }),
    };
  });
  const currentTotal = normalizeNumber(
    rows.reduce(
      (sum, row) => sum + toNumberOrZero(row.current_standard_effort_mm),
      0
    ),
    4
  );
  const unavailable = rows.some((row) => row.status === "계산 불가");

  return {
    expected_total_mm: S1_EXPECTED_TOTAL_MM,
    current_total_mm: unavailable ? null : currentTotal,
    difference_mm: unavailable
      ? null
      : normalizeNumber(currentTotal - S1_EXPECTED_TOTAL_MM, 4),
    status: getCheckStatus(currentTotal, S1_EXPECTED_TOTAL_MM, { unavailable }),
    rows,
    missing_variant_keys: missingVariantKeys,
    missing_excel_rows: [...missingExcelRows].sort((a, b) => a - b),
  };
}

function parseEffortMm(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("effort_mm은 숫자여야 합니다.");
  }

  if (numericValue < 0) {
    throw new Error("effort_mm은 0 이상이어야 합니다.");
  }

  return numericValue;
}

function parseCoefficient(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("coefficient는 숫자여야 합니다.");
  }

  if (numericValue < 0) {
    throw new Error("coefficient는 0 이상이어야 합니다.");
  }

  return numericValue;
}

function normalizeBaseEffortPayload(solutionVariantId, row = {}) {
  if (!solutionVariantId) {
    throw new Error("solutionVariantId가 필요합니다.");
  }

  if (!row.phase_code) {
    throw new Error("phase_code가 필요합니다.");
  }

  const phase = PHASE_BY_CODE.get(row.phase_code);

  if (!phase) {
    throw new Error(`허용되지 않은 phase_code입니다: ${row.phase_code}`);
  }

  if (!row.phase_name) {
    throw new Error("phase_name이 필요합니다.");
  }

  return {
    solution_variant_id: solutionVariantId,
    phase_code: row.phase_code,
    phase_name: row.phase_name,
    effort_mm: parseEffortMm(row.effort_mm),
    display_order:
      row.display_order === null || row.display_order === undefined
        ? phase.display_order
        : toNumberOrZero(row.display_order),
    active: row.active === undefined ? true : row.active !== false,
    updated_at: new Date().toISOString(),
  };
}

function normalizeCoefficientPayload(itemId, row = {}) {
  if (!itemId) {
    throw new Error("itemId가 필요합니다.");
  }

  if (!row.solution_variant_id) {
    throw new Error("solution_variant_id가 필요합니다.");
  }

  return {
    item_id: itemId,
    solution_variant_id: row.solution_variant_id,
    coefficient: parseCoefficient(row.coefficient),
    active: row.active === undefined ? true : row.active !== false,
    updated_at: new Date().toISOString(),
  };
}

function assertBooleanActive(active) {
  if (typeof active !== "boolean") {
    throw new Error("active는 boolean이어야 합니다.");
  }
}

function readUpdatedRow(data, message) {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error(message);
  }

  return row;
}

function getHistoryActor(options = {}) {
  return options.currentUser || options.actor || options.sessionUser || null;
}

export async function fetchStandardEffortMetaAdmin(client) {
  const db = getClient(client);
  const [
    solutionsResult,
    variantsResult,
    baseEffortResult,
    itemsResult,
    coefficientsResult,
  ] = await Promise.all([
    db
      .from(TABLES.solutions)
      .select("*")
      .order("display_order", { ascending: true })
      .order("solution_code", { ascending: true }),
    db
      .from(TABLES.solutionVariants)
      .select("*")
      .order("display_order", { ascending: true })
      .order("solution_code", { ascending: true })
      .order("variant_code", { ascending: true }),
    db
      .from(TABLES.baseEffort)
      .select("*")
      .order("solution_variant_id", { ascending: true })
      .order("display_order", { ascending: true }),
    db
      .from(TABLES.items)
      .select("*")
      .order("display_order", { ascending: true })
      .order("excel_row_no", { ascending: true }),
    db
      .from(TABLES.coefficients)
      .select("*")
      .order("item_id", { ascending: true })
      .order("solution_variant_id", { ascending: true }),
  ]);

  [
    solutionsResult,
    variantsResult,
    baseEffortResult,
    itemsResult,
    coefficientsResult,
  ].forEach((result) => throwIfError(result.error));

  const solutions = (solutionsResult.data || []).map(normalizeSolution);
  const solutionNameByCode = new Map(
    solutions.map((solution) => [
      solution.solution_code,
      solution.solution_name,
    ])
  );

  return {
    solutions,
    solutionVariants: (variantsResult.data || []).map((row) =>
      normalizeSolutionVariant({
        ...row,
        solution_name:
          row.solution_name ?? solutionNameByCode.get(row.solution_code),
      })
    ),
    baseEffortRows: (baseEffortResult.data || []).map(normalizeBaseEffortRow),
    itemRows: (itemsResult.data || []).map(normalizeStandardItemRow),
    coefficientRows: (coefficientsResult.data || []).map(
      normalizeCoefficientRow
    ),
  };
}

export async function upsertStandardBaseEffortRows(
  solutionVariantId,
  phaseRows,
  client,
  options = {}
) {
  if (!solutionVariantId) {
    throw new Error("solutionVariantId가 필요합니다.");
  }

  if (!Array.isArray(phaseRows)) {
    throw new Error("phaseRows는 배열이어야 합니다.");
  }

  const historyActor = getHistoryActor(options);
  const rows = phaseRows.map((row) => {
    const normalizedRow = normalizeBaseEffortPayload(solutionVariantId, row);

    return mergeUpdateHistoryFields(
      normalizedRow,
      historyActor,
      normalizedRow.updated_at
    );
  });

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await getClient(client)
    .from(TABLES.baseEffort)
    .upsert(rows, { onConflict: "solution_variant_id,phase_code" })
    .select("*");

  throwIfError(error);

  return (data || []).map(normalizeBaseEffortRow);
}

export async function upsertStandardCoefficientRows(
  itemId,
  coefficientRows,
  client,
  options = {}
) {
  if (!itemId) {
    throw new Error("itemId가 필요합니다.");
  }

  if (!Array.isArray(coefficientRows)) {
    throw new Error("coefficientRows는 배열이어야 합니다.");
  }

  const historyActor = getHistoryActor(options);
  const rows = coefficientRows.map((row) => {
    const normalizedRow = normalizeCoefficientPayload(itemId, row);

    return mergeUpdateHistoryFields(
      normalizedRow,
      historyActor,
      normalizedRow.updated_at
    );
  });

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await getClient(client)
    .from(TABLES.coefficients)
    .upsert(rows, { onConflict: "item_id,solution_variant_id" })
    .select("*");

  throwIfError(error);

  return (data || []).map(normalizeCoefficientRow);
}

export async function updateStandardSolutionVariantActive(
  solutionVariantId,
  active,
  client,
  options = {}
) {
  if (!solutionVariantId) {
    throw new Error("solutionVariantId가 필요합니다.");
  }

  assertBooleanActive(active);

  const updatedAt = new Date().toISOString();
  const payload = mergeUpdateHistoryFields(
    {
      active,
      updated_at: updatedAt,
    },
    getHistoryActor(options),
    updatedAt
  );
  const { data, error } = await getClient(client)
    .from(TABLES.solutionVariants)
    .update(payload)
    .eq("solution_variant_id", solutionVariantId)
    .select("*");

  throwIfError(error);

  return normalizeSolutionVariant(
    readUpdatedRow(data, "solution variant를 찾을 수 없습니다.")
  );
}

export async function updateStandardItemActive(
  itemId,
  active,
  client,
  options = {}
) {
  if (!itemId) {
    throw new Error("itemId가 필요합니다.");
  }

  assertBooleanActive(active);

  const updatedAt = new Date().toISOString();
  const payload = mergeUpdateHistoryFields(
    {
      active,
      updated_at: updatedAt,
    },
    getHistoryActor(options),
    updatedAt
  );
  const { data, error } = await getClient(client)
    .from(TABLES.items)
    .update(payload)
    .eq("item_id", itemId)
    .select("*");

  throwIfError(error);

  return normalizeStandardItemRow(
    readUpdatedRow(data, "standard item을 찾을 수 없습니다.")
  );
}

export function buildStandardEffortMetaSummary(meta = {}) {
  const solutions = meta.solutions || [];
  const solutionVariants = meta.solutionVariants || [];
  const baseEffortRows = meta.baseEffortRows || [];
  const itemRows = meta.itemRows || [];
  const coefficientRows = meta.coefficientRows || [];
  const baseRowsByVariantId = baseEffortRows.reduce((result, row) => {
    const normalized = normalizeBaseEffortRow(row);
    const key = normalized.solution_variant_id;

    if (!key) {
      return result;
    }

    if (!result[key]) {
      result[key] = [];
    }

    result[key].push(normalized);
    return result;
  }, {});

  const summary = {
    solution_count: solutions.length,
    solution_variant_count: solutionVariants.length,
    base_effort_count: baseEffortRows.length,
    item_count: itemRows.length,
    coefficient_count: coefficientRows.length,
    active_solution_variant_count: solutionVariants.filter(
      (variant) => variant.active !== false
    ).length,
    active_item_count: itemRows.filter((item) => item.active !== false).length,
    active_coefficient_count: coefficientRows.filter(
      (coefficient) => coefficient.active !== false
    ).length,
    base_total_by_variant: sortByDisplayOrder(solutionVariants).map(
      (variant) => {
        const rows = baseRowsByVariantId[variant.solution_variant_id] || [];
        const baseTotalMm = rows.reduce(
          (sum, row) => sum + toNumberOrZero(row.effort_mm ?? row.effort_md),
          0
        );

        return {
          solution_variant_id: variant.solution_variant_id,
          display_name: getVariantLabel(variant),
          base_total_mm: Number(baseTotalMm.toFixed(10)),
        };
      }
    ),
  };

  return {
    ...summary,
    row_count_checks: buildRowCountChecks(summary),
    base_total_checks: buildBaseTotalChecks(summary),
    coefficient_matrix_check: buildCoefficientMatrixCheck({
      solutionVariants,
      itemRows,
      coefficientRows,
    }),
    s1_fixture_preview: buildS1FixturePreview({
      solutionVariants,
      baseEffortRows,
      itemRows,
      coefficientRows,
    }),
  };
}
