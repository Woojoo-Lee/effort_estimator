const ROUND_PRECISION = 10;
const MONEY_PRECISION = 2;

function normalizeNumber(value, precision = ROUND_PRECISION) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return 0;
  }

  return Number(num.toFixed(precision));
}

function readNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return normalizeNumber(value);
}

function readBaseEffort(row = {}) {
  return readNumber(row.effort_mm ?? row.effort_md);
}

function readActualEffort(row = {}) {
  return readNumber(
    row.actual_effort_mm ?? row.actual_effort_md ?? row.actual_effort
  );
}

function isActive(row = {}) {
  return row.active !== false && row.is_active !== false;
}

function isChecked(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();

    return normalized === "1" || normalized === "Y";
  }

  return false;
}

function isSameProject(rowProjectId, projectId) {
  if (projectId === null || projectId === undefined || projectId === "") {
    return true;
  }

  return String(rowProjectId) === String(projectId);
}

function getDisplayOrder(row = {}) {
  return readNumber(row.display_order);
}

function addToMapNumber(map, key, value) {
  map.set(key, normalizeNumber((map.get(key) || 0) + readNumber(value)));
}

export function calculateStandardEffort({
  projectId,
  solutionVariants = [],
  baseEffortRows = [],
  itemRows = [],
  coefficientRows = [],
  projectSolutionSelections = [],
  projectItemSelections = [],
} = {}) {
  const activeVariants = solutionVariants.filter(isActive);
  const activeVariantById = new Map(
    activeVariants.map((variant) => [
      variant.solution_variant_id,
      variant,
    ])
  );
  const activeItemIds = new Set(
    itemRows.filter(isActive).map((item) => item.item_id)
  );
  const baseTotalByVariantId = new Map();

  baseEffortRows
    .filter((row) => isActive(row))
    .filter((row) => activeVariantById.has(row.solution_variant_id))
    .forEach((row) => {
      addToMapNumber(
        baseTotalByVariantId,
        row.solution_variant_id,
        readBaseEffort(row)
      );
    });

  const coefficientByVariantId = new Map();

  coefficientRows
    .filter((row) => isActive(row))
    .filter((row) => activeVariantById.has(row.solution_variant_id))
    .filter((row) => activeItemIds.has(row.item_id))
    .forEach((row) => {
      if (!coefficientByVariantId.has(row.solution_variant_id)) {
        coefficientByVariantId.set(row.solution_variant_id, new Map());
      }

      coefficientByVariantId
        .get(row.solution_variant_id)
        .set(row.item_id, readNumber(row.coefficient));
    });

  const enabledSelectionByVariantId = new Map();

  projectSolutionSelections
    .filter((row) => isSameProject(row.project_id, projectId))
    .filter((row) => row.enabled === true)
    .filter((row) => activeVariantById.has(row.solution_variant_id))
    .forEach((row) => {
      enabledSelectionByVariantId.set(row.solution_variant_id, row);
    });

  const checkedItemIdsByVariantId = new Map();

  projectItemSelections
    .filter((row) => isSameProject(row.project_id, projectId))
    .filter((row) => activeVariantById.has(row.solution_variant_id))
    .filter((row) => activeItemIds.has(row.item_id))
    .filter((row) => isChecked(row.checked))
    .forEach((row) => {
      if (!checkedItemIdsByVariantId.has(row.solution_variant_id)) {
        checkedItemIdsByVariantId.set(row.solution_variant_id, new Set());
      }

      checkedItemIdsByVariantId
        .get(row.solution_variant_id)
        .add(row.item_id);
    });

  return activeVariants
    .filter((variant) =>
      enabledSelectionByVariantId.has(variant.solution_variant_id)
    )
    .sort((a, b) => {
      const orderCompare = getDisplayOrder(a) - getDisplayOrder(b);

      if (orderCompare !== 0) {
        return orderCompare;
      }

      return String(a.display_name || a.solution_variant_id).localeCompare(
        String(b.display_name || b.solution_variant_id)
      );
    })
    .map((variant) => {
      const variantId = variant.solution_variant_id;
      const checkedItemIds = checkedItemIdsByVariantId.get(variantId) || new Set();
      const variantCoefficients = coefficientByVariantId.get(variantId) || new Map();
      const baseTotalMm = normalizeNumber(baseTotalByVariantId.get(variantId));
      const coefficientTotal = normalizeNumber(
        [...checkedItemIds].reduce(
          (sum, itemId) => sum + readNumber(variantCoefficients.get(itemId)),
          0
        )
      );
      const standardEffortMm = normalizeNumber(
        baseTotalMm * coefficientTotal,
        MONEY_PRECISION
      );
      const actualEffortMm = normalizeNumber(
        readActualEffort(enabledSelectionByVariantId.get(variantId))
      );
      const gapMm = normalizeNumber(
        standardEffortMm - actualEffortMm,
        MONEY_PRECISION
      );

      return {
        solution_variant_id: variantId,
        solution_code: variant.solution_code,
        solution_name: variant.solution_name,
        variant_code: variant.variant_code,
        variant_name: variant.variant_name,
        display_name: variant.display_name,
        base_total_mm: baseTotalMm,
        coefficient_total: coefficientTotal,
        standard_effort_mm: standardEffortMm,
        actual_effort_mm: actualEffortMm,
        gap_mm: gapMm,
      };
    });
}
