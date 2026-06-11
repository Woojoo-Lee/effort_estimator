const DEFAULT_FILENAME_BASE = "standard_effort";
const DEFAULT_EXPORT_FORMAT = "xlsx";
const LEGACY_EFFORT_FIELDS = [
  "default_base_md",
  "base_md",
  "effort_md",
  "actual_effort_md",
  "standard_effort_md",
  "gap_md",
];
const RESULT_NUMERIC_FIELDS = [
  "base_total_mm",
  "coefficient_total",
  "standard_effort_mm",
  "actual_effort_mm",
  "gap_mm",
];
const TOTAL_NUMERIC_FIELDS = [
  "base_total_mm",
  "coefficient_total",
  "standard_effort_mm",
  "actual_effort_mm",
  "gap_mm",
  "solution_count",
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function stripLegacyEffortFields(row = {}) {
  const normalized = { ...row };

  LEGACY_EFFORT_FIELDS.forEach((fieldName) => {
    delete normalized[fieldName];
  });

  return normalized;
}

function toDateStamp(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return toDateStamp();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function toSafeFilenamePart(value) {
  const raw = String(value || DEFAULT_FILENAME_BASE).trim() || DEFAULT_FILENAME_BASE;

  return raw.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

function normalizeFormat(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized === "json" || normalized === "xlsx"
    ? normalized
    : DEFAULT_EXPORT_FORMAT;
}

export function toExportNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatExportNumber(value, digits = 2) {
  const precision = Number.isInteger(digits) && digits >= 0 ? digits : 2;
  const multiplier = 10 ** precision;

  return Math.round(toExportNumber(value) * multiplier) / multiplier;
}

function toExportBoolean(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1" || normalized === "y";
  }

  return false;
}

function normalizeResultRow(row) {
  if (!isObject(row)) {
    return null;
  }

  const normalized = stripLegacyEffortFields(row);

  RESULT_NUMERIC_FIELDS.forEach((fieldName) => {
    normalized[fieldName] = toExportNumber(normalized[fieldName]);
  });

  return normalized;
}

function normalizeTotals(totals) {
  if (!isObject(totals)) {
    return {};
  }

  const normalized = { ...totals };

  TOTAL_NUMERIC_FIELDS.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(normalized, fieldName)) {
      normalized[fieldName] = toExportNumber(normalized[fieldName]);
    }
  });

  return normalized;
}

function normalizeCheckedItem(row) {
  if (!isObject(row)) {
    return null;
  }

  const normalized = stripLegacyEffortFields(row);
  normalized.coefficient = toExportNumber(normalized.coefficient);
  normalized.checked = toExportBoolean(normalized.checked);

  return normalized;
}

function readStandardEffort(exportData = {}) {
  const standardEffort =
    exportData.standard_effort || exportData.standardEffort || {};
  const results =
    standardEffort.results || exportData.results || exportData.rows || [];
  const totals = standardEffort.totals || exportData.totals || {};

  return {
    ...standardEffort,
    results: readArray(results).map(normalizeResultRow).filter(Boolean),
    totals: normalizeTotals(totals),
  };
}

function readSelections(exportData = {}) {
  const selections = exportData.selections || {};

  return {
    ...selections,
    projectSolutionSelections: readArray(
      selections.projectSolutionSelections ||
        selections.project_solution_selections ||
        exportData.projectSolutionSelections ||
        exportData.project_solution_selections
    ),
    projectItemSelections: readArray(
      selections.projectItemSelections ||
        selections.project_item_selections ||
        exportData.projectItemSelections ||
        exportData.project_item_selections
    ),
  };
}

export function normalizeStandardEffortExportDataForRows(exportData = {}) {
  const source = isObject(exportData)
    ? exportData.exportData || exportData.export_data || exportData
    : {};
  const checkedItems = source.checked_items || source.checkedItems || [];

  return {
    ...source,
    project: isObject(source.project) ? { ...source.project } : {},
    standard_effort: readStandardEffort(source),
    selections: readSelections(source),
    checked_items: readArray(checkedItems)
      .map(normalizeCheckedItem)
      .filter(Boolean),
    generated_at: source.generated_at,
    generated_by: source.generated_by,
  };
}

export function buildStandardEffortSummaryRows(exportData) {
  const normalized = normalizeStandardEffortExportDataForRows(exportData);
  const project = normalized.project;
  const totals = normalized.standard_effort.totals;

  return [
    { "항목": "프로젝트명", "값": project.project_name || project.name || "" },
    { "항목": "프로젝트 ID", "값": project.project_id ?? project.id ?? "" },
    { "항목": "생성일시", "값": normalized.generated_at || "" },
    {
      "항목": "솔루션 수",
      "값": toExportNumber(
        totals.solution_count || normalized.standard_effort.results.length
      ),
    },
    {
      "항목": "기본공수합(M/M)",
      "값": formatExportNumber(totals.base_total_mm),
    },
    {
      "항목": "표준공수합(M/M)",
      "값": formatExportNumber(totals.standard_effort_mm),
    },
    {
      "항목": "실투입공수합(M/M)",
      "값": formatExportNumber(totals.actual_effort_mm),
    },
    { "항목": "GAP(M/M)", "값": formatExportNumber(totals.gap_mm) },
  ];
}

function getSolutionLabel(row = {}) {
  return row.solution_name || row.solution_code || "";
}

function getVariantLabel(row = {}) {
  return row.variant_name || row.variant_code || "";
}

function getDisplayName(row = {}) {
  return (
    row.display_name ||
    [getSolutionLabel(row), getVariantLabel(row)].filter(Boolean).join(" ")
  );
}

export function buildStandardEffortResultRows(exportData) {
  const normalized = normalizeStandardEffortExportDataForRows(exportData);

  return normalized.standard_effort.results.map((row) => ({
    "솔루션": getSolutionLabel(row),
    "버전": getVariantLabel(row),
    "표시명": getDisplayName(row),
    "기본공수합(M/M)": formatExportNumber(row.base_total_mm),
    "계수합": formatExportNumber(row.coefficient_total),
    "표준공수(M/M)": formatExportNumber(row.standard_effort_mm),
    "실투입공수(M/M)": formatExportNumber(row.actual_effort_mm),
    "GAP(M/M)": formatExportNumber(row.gap_mm),
  }));
}

export function buildStandardEffortCheckedItemRows(exportData) {
  const normalized = normalizeStandardEffortExportDataForRows(exportData);

  return normalized.checked_items.map((row) => ({
    "솔루션": getSolutionLabel(row),
    "버전": getVariantLabel(row),
    "구분1": row.category_l1 || "",
    "구분2": row.category_l2 || "",
    "기능항목": row.item_name || "",
    "옵션": row.item_option || "",
    "계수": formatExportNumber(row.coefficient),
    "체크여부": row.checked ? "Y" : "N",
  }));
}

export function buildStandardEffortExportSheets(exportData) {
  return [
    {
      name: "요약",
      rows: buildStandardEffortSummaryRows(exportData),
    },
    {
      name: "솔루션별 공수",
      rows: buildStandardEffortResultRows(exportData),
    },
    {
      name: "체크 항목",
      rows: buildStandardEffortCheckedItemRows(exportData),
    },
  ];
}

export function buildStandardEffortExportFilename(exportData = {}, options = {}) {
  const normalized = normalizeStandardEffortExportDataForRows(exportData);
  const projectName =
    normalized.project.project_name || normalized.project.name || DEFAULT_FILENAME_BASE;
  const dateStamp = toDateStamp(options.generatedAt || normalized.generated_at);
  const format = normalizeFormat(options.format);

  return `표준공수_${toSafeFilenamePart(projectName)}_${dateStamp}.${format}`;
}
