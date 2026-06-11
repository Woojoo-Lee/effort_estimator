export function toNumberOrZero(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const num = Number(value);

  return Number.isFinite(num) ? num : 0;
}

export function toBooleanChecked(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (!value) {
    return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();

    return normalized === "1" || normalized === "Y" || normalized === "TRUE";
  }

  return false;
}

function toActive(row = {}) {
  return row.active !== false && row.is_active !== false;
}

function toEnabled(value) {
  if (value === null || value === undefined) {
    return true;
  }

  return toBooleanChecked(value);
}

function toExcelRowNo(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return toNumberOrZero(value);
}

export function normalizeSolutionVariant(row = {}) {
  return {
    solution_variant_id: row.solution_variant_id,
    solution_code: row.solution_code,
    solution_name: row.solution_name,
    variant_code: row.variant_code,
    variant_name: row.variant_name,
    display_name: row.display_name,
    display_order: toNumberOrZero(row.display_order),
    active: toActive(row),
  };
}

export function normalizeBaseEffortRow(row = {}) {
  return {
    base_effort_id: row.base_effort_id,
    solution_variant_id: row.solution_variant_id,
    phase_code: row.phase_code,
    phase_name: row.phase_name,
    effort_mm: toNumberOrZero(row.effort_mm ?? row.effort_md),
    display_order: toNumberOrZero(row.display_order),
    active: toActive(row),
  };
}

export function normalizeStandardItemRow(row = {}) {
  return {
    item_id: row.item_id,
    excel_row_no: toExcelRowNo(row.excel_row_no),
    category_l1: row.category_l1,
    category_l2: row.category_l2 ?? null,
    item_name: row.item_name,
    item_option: row.item_option ?? null,
    display_order: toNumberOrZero(row.display_order),
    active: toActive(row),
  };
}

export function normalizeCoefficientRow(row = {}) {
  return {
    item_id: row.item_id,
    solution_variant_id: row.solution_variant_id,
    coefficient: toNumberOrZero(row.coefficient),
    active: toActive(row),
  };
}

export function normalizeProjectSolutionSelection(row = {}) {
  return {
    project_id: row.project_id,
    solution_variant_id: row.solution_variant_id,
    enabled: toEnabled(row.enabled),
    actual_effort_mm: toNumberOrZero(
      row.actual_effort_mm ?? row.actual_effort_md ?? row.actual_effort
    ),
  };
}

export function normalizeProjectItemSelection(row = {}) {
  return {
    project_id: row.project_id,
    solution_variant_id: row.solution_variant_id,
    item_id: row.item_id,
    checked: toBooleanChecked(row.checked),
  };
}

export function buildStandardEffortInput({
  projectId,
  meta = {},
  selections = {},
} = {}) {
  const solutions = meta.solutions || [];
  const solutionNameByCode = new Map(
    solutions.map((solution) => [
      solution.solution_code,
      solution.solution_name,
    ])
  );

  return {
    projectId,
    solutionVariants: (meta.solutionVariants || []).map((row) =>
      normalizeSolutionVariant({
        ...row,
        solution_name:
          row.solution_name ?? solutionNameByCode.get(row.solution_code),
      })
    ),
    baseEffortRows: (meta.baseEffortRows || []).map(normalizeBaseEffortRow),
    itemRows: (meta.itemRows || []).map(normalizeStandardItemRow),
    coefficientRows: (meta.coefficientRows || []).map(normalizeCoefficientRow),
    projectSolutionSelections: (
      selections.projectSolutionSelections || []
    ).map(normalizeProjectSolutionSelection),
    projectItemSelections: (selections.projectItemSelections || []).map(
      normalizeProjectItemSelection
    ),
  };
}
