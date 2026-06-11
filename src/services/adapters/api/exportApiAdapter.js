import { createApiClient } from "../../api";
import { getApiBaseUrl } from "../../dataBackend";

const API_BASE_URL_REQUIRED_ERROR =
  "VITE_API_BASE_URL is required when using export API adapter.";

const STANDARD_EFFORT_EXPORT_NUMERIC_FIELDS = [
  "base_total_mm",
  "coefficient_total",
  "standard_effort_mm",
  "actual_effort_mm",
  "gap_mm",
];

const STANDARD_EFFORT_EXPORT_TOTAL_FIELDS = [
  "base_total_mm",
  "standard_effort_mm",
  "actual_effort_mm",
  "gap_mm",
  "solution_count",
];

const LEGACY_EFFORT_FIELDS = [
  "default_base_md",
  "base_md",
  "effort_md",
  "actual_effort_md",
  "standard_effort_md",
  "gap_md",
];

function createNotImplementedResult(methodName) {
  return {
    data: null,
    error: new Error(`export API adapter method ${methodName} is not implemented yet.`),
  };
}

function createErrorResult(error) {
  return {
    data: null,
    error,
  };
}

async function toRepositoryResult(resolveData) {
  try {
    return {
      data: await resolveData(),
      error: null,
    };
  } catch (error) {
    return createErrorResult(error);
  }
}

function readNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function readBoolean(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1" || normalized === "y") {
      return true;
    }
  }

  return false;
}

function stripLegacyEffortFields(row) {
  const normalized = { ...row };

  LEGACY_EFFORT_FIELDS.forEach((fieldName) => {
    delete normalized[fieldName];
  });

  return normalized;
}

function normalizeResultRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  const normalized = stripLegacyEffortFields(row);

  STANDARD_EFFORT_EXPORT_NUMERIC_FIELDS.forEach((fieldName) => {
    normalized[fieldName] = readNumber(normalized[fieldName]);
  });

  return normalized;
}

function normalizeTotals(totals = {}) {
  if (!totals || typeof totals !== "object" || Array.isArray(totals)) {
    return {};
  }

  const normalized = { ...totals };

  STANDARD_EFFORT_EXPORT_TOTAL_FIELDS.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(normalized, fieldName)) {
      normalized[fieldName] = readNumber(normalized[fieldName]);
    }
  });

  return normalized;
}

function normalizeCheckedItem(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  const normalized = stripLegacyEffortFields(row);
  normalized.coefficient = readNumber(normalized.coefficient);
  normalized.checked = readBoolean(normalized.checked);

  return normalized;
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function readExportPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return data.exportData || data.export_data || data;
}

function readStandardEffort(payload) {
  const standardEffort =
    payload.standard_effort || payload.standardEffort || {};
  const results =
    standardEffort.results || payload.results || payload.rows || [];
  const totals = standardEffort.totals || payload.totals || {};

  return {
    ...standardEffort,
    results: readArray(results).map(normalizeResultRow).filter(Boolean),
    totals: normalizeTotals(totals),
  };
}

function readSelections(payload) {
  const selections = payload.selections || {};

  return {
    ...selections,
    projectSolutionSelections: readArray(
      selections.projectSolutionSelections ||
        selections.project_solution_selections ||
        payload.projectSolutionSelections ||
        payload.project_solution_selections
    ),
    projectItemSelections: readArray(
      selections.projectItemSelections ||
        selections.project_item_selections ||
        payload.projectItemSelections ||
        payload.project_item_selections
    ),
  };
}

function normalizeStandardEffortExportData(data) {
  const payload = readExportPayload(data);
  const checkedItems = payload.checked_items || payload.checkedItems || [];

  return {
    ...payload,
    project: payload.project && typeof payload.project === "object" ? { ...payload.project } : {},
    standard_effort: readStandardEffort(payload),
    selections: readSelections(payload),
    checked_items: readArray(checkedItems)
      .map(normalizeCheckedItem)
      .filter(Boolean),
  };
}

function assertProjectId(projectId) {
  if (!projectId) {
    throw new Error(
      "export API adapter fetchStandardEffortExportData requires projectId."
    );
  }
}

function getStandardEffortExportDataPath(projectId) {
  return `/projects/${encodeURIComponent(
    String(projectId)
  )}/standard-effort/export-data`;
}

function buildStandardEffortExportQuery(options = {}) {
  const query = {};

  if (options?.includeCheckedItems === false) {
    query.include_checked_items = false;
  }

  return query;
}

function createClientResolver(options = {}) {
  return () => {
    if (options.apiClient) {
      return options.apiClient;
    }

    const baseUrl = getApiBaseUrl(options.env);

    if (!baseUrl) {
      throw new Error(API_BASE_URL_REQUIRED_ERROR);
    }

    return createApiClient({
      baseUrl,
      getAuthToken: options.getAuthToken,
      fetchImpl: options.fetchImpl,
      defaultHeaders: options.defaultHeaders,
      onRequest: options.onRequest,
      onResponse: options.onResponse,
      onError: options.onError,
    });
  };
}

export function createExportApiAdapter(options = {}) {
  const getClient = createClientResolver(options);

  return {
    fetchStandardEffortExportData(projectId, exportOptions) {
      return toRepositoryResult(async () => {
        assertProjectId(projectId);
        const data = await getClient().get(
          getStandardEffortExportDataPath(projectId),
          {
            query: buildStandardEffortExportQuery(exportOptions),
          }
        );

        return normalizeStandardEffortExportData(data);
      });
    },
    fetchLegacyExportData,
    downloadStandardEffortExport,
    downloadLegacyExport,
  };
}

const defaultAdapter = createExportApiAdapter();

export async function fetchStandardEffortExportData(projectId, options) {
  return defaultAdapter.fetchStandardEffortExportData(projectId, options);
}

export async function fetchLegacyExportData() {
  return createNotImplementedResult("fetchLegacyExportData");
}

export async function downloadStandardEffortExport() {
  return createNotImplementedResult("downloadStandardEffortExport");
}

export async function downloadLegacyExport() {
  return createNotImplementedResult("downloadLegacyExport");
}
