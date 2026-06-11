function readObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function readFirstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function readDisplayOrder(row = {}) {
  return toExportNumber(row.display_order ?? row.displayOrder);
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""));
}

export function toExportNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function toExportBoolean(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0 || !value) {
    return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "1" || normalized === "y" || normalized === "true";
  }

  return false;
}

export function normalizeExportResult(result = {}) {
  const row = readObject(result);

  return {
    solution_variant_id: readFirstDefined(
      row.solution_variant_id,
      row.solutionVariantId
    ),
    solution_code: readFirstDefined(row.solution_code, row.solutionCode),
    variant_code: readFirstDefined(row.variant_code, row.variantCode),
    solution_name: readFirstDefined(row.solution_name, row.solutionName),
    variant_name: readFirstDefined(row.variant_name, row.variantName),
    display_name: readFirstDefined(row.display_name, row.displayName),
    base_total_mm: toExportNumber(row.base_total_mm ?? row.baseTotalMm),
    coefficient_total: toExportNumber(
      row.coefficient_total ?? row.coefficientTotal
    ),
    standard_effort_mm: toExportNumber(
      row.standard_effort_mm ?? row.standardEffortMm
    ),
    actual_effort_mm: toExportNumber(
      row.actual_effort_mm ?? row.actualEffortMm
    ),
    gap_mm: toExportNumber(row.gap_mm ?? row.gapMm),
  };
}

export function buildStandardEffortTotals(results = []) {
  const rows = readArray(results);

  return rows.reduce(
    (totals, row) => ({
      base_total_mm:
        totals.base_total_mm + toExportNumber(row?.base_total_mm),
      coefficient_total:
        totals.coefficient_total + toExportNumber(row?.coefficient_total),
      standard_effort_mm:
        totals.standard_effort_mm + toExportNumber(row?.standard_effort_mm),
      actual_effort_mm:
        totals.actual_effort_mm + toExportNumber(row?.actual_effort_mm),
      gap_mm: totals.gap_mm + toExportNumber(row?.gap_mm),
      solution_count: totals.solution_count + 1,
    }),
    {
      base_total_mm: 0,
      coefficient_total: 0,
      standard_effort_mm: 0,
      actual_effort_mm: 0,
      gap_mm: 0,
      solution_count: 0,
    }
  );
}

function normalizeProjectSolutionSelection(selection = {}) {
  const row = readObject(selection);

  return {
    project_id: row.project_id,
    solution_variant_id: row.solution_variant_id,
    enabled: toExportBoolean(row.enabled),
    actual_effort_mm: toExportNumber(row.actual_effort_mm),
  };
}

function normalizeProjectItemSelection(selection = {}) {
  const row = readObject(selection);

  return {
    project_id: row.project_id,
    solution_variant_id: row.solution_variant_id,
    item_id: row.item_id,
    checked: toExportBoolean(row.checked),
  };
}

function buildVariantMap(solutionVariants = []) {
  return new Map(
    readArray(solutionVariants).map((variant) => [
      variant.solution_variant_id,
      readObject(variant),
    ])
  );
}

function buildItemMap(itemRows = []) {
  return new Map(
    readArray(itemRows).map((item) => [item.item_id, readObject(item)])
  );
}

function buildCoefficientMap(coefficientRows = []) {
  return new Map(
    readArray(coefficientRows).map((row) => [
      `${row.solution_variant_id}:${row.item_id}`,
      readObject(row),
    ])
  );
}

function buildCheckedItem(selection, maps) {
  const variant = maps.variantById.get(selection.solution_variant_id) || {};
  const item = maps.itemById.get(selection.item_id) || {};
  const coefficient =
    maps.coefficientByKey.get(
      `${selection.solution_variant_id}:${selection.item_id}`
    ) || {};

  return {
    solution_variant_id: selection.solution_variant_id,
    solution_code: variant.solution_code,
    solution_name: variant.solution_name,
    variant_code: variant.variant_code,
    variant_name: variant.variant_name,
    display_name: variant.display_name,
    item_id: selection.item_id,
    category_l1: item.category_l1,
    category_l2: item.category_l2 ?? null,
    item_name: item.item_name,
    item_option: item.item_option ?? null,
    coefficient: toExportNumber(coefficient.coefficient),
    checked: selection.checked,
    solution_display_order: readDisplayOrder(variant),
    item_display_order: readDisplayOrder(item),
  };
}

function sortCheckedItems(left, right) {
  const solutionOrder =
    toExportNumber(left.solution_display_order) -
    toExportNumber(right.solution_display_order);

  if (solutionOrder !== 0) {
    return solutionOrder;
  }

  const itemOrder =
    toExportNumber(left.item_display_order) -
    toExportNumber(right.item_display_order);

  if (itemOrder !== 0) {
    return itemOrder;
  }

  const itemNameCompare = compareText(left.item_name, right.item_name);

  if (itemNameCompare !== 0) {
    return itemNameCompare;
  }

  return compareText(left.item_option, right.item_option);
}

function stripSortFields(row) {
  const { solution_display_order, item_display_order, ...exportRow } = row;

  return exportRow;
}

export function buildCheckedItemsFromStandardEffortInput(input = {}, options = {}) {
  const source = readObject(input);
  const selections = readArray(source.projectItemSelections)
    .map(normalizeProjectItemSelection)
    .filter((selection) => options.includeUnchecked || selection.checked);
  const maps = {
    variantById: buildVariantMap(source.solutionVariants),
    itemById: buildItemMap(source.itemRows),
    coefficientByKey: buildCoefficientMap(source.coefficientRows),
  };

  return selections
    .map((selection) => buildCheckedItem(selection, maps))
    .sort(sortCheckedItems)
    .map(stripSortFields);
}

function buildProject(project, projectId) {
  const source = readObject(project);

  if (Object.keys(source).length > 0) {
    return {
      ...source,
      project_id: source.project_id ?? source.id ?? projectId,
    };
  }

  return projectId === null || projectId === undefined || projectId === ""
    ? {}
    : { project_id: projectId };
}

export function buildStandardEffortExportDataFromInput({
  project,
  input = {},
  results = [],
  generatedBy = null,
  generatedAt,
  options = {},
} = {}) {
  const source = readObject(input);
  const normalizedResults = readArray(results).map(normalizeExportResult);

  return {
    project: buildProject(project, source.projectId),
    standard_effort: {
      results: normalizedResults,
      totals: buildStandardEffortTotals(normalizedResults),
    },
    selections: {
      projectSolutionSelections: readArray(
        source.projectSolutionSelections
      ).map(normalizeProjectSolutionSelection),
      projectItemSelections: readArray(source.projectItemSelections).map(
        normalizeProjectItemSelection
      ),
    },
    checked_items: buildCheckedItemsFromStandardEffortInput(source, options),
    generated_at: generatedAt || new Date().toISOString(),
    generated_by: generatedBy,
  };
}
