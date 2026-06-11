import { createApiClient } from "../../api";
import { getApiBaseUrl } from "../../dataBackend";
import {
  buildStandardEffortInput,
  normalizeBaseEffortRow,
  normalizeCoefficientRow,
  normalizeProjectItemSelection,
  normalizeProjectSolutionSelection,
  normalizeSolutionVariant,
  normalizeStandardItemRow,
  toNumberOrZero,
} from "../../../shared/lib/standardEffortMapper";

const API_BASE_URL_REQUIRED_ERROR =
  "VITE_API_BASE_URL is required when using standardEffort API adapter.";

function throwNotImplemented(methodName) {
  throw new Error(
    `standardEffort API adapter method ${methodName} is not implemented yet.`
  );
}

function normalizeSolution(row = {}) {
  return {
    solution_code: row.solution_code,
    solution_name: row.solution_name,
    display_order: toNumberOrZero(row.display_order),
    active: row.active !== false && row.is_active !== false,
  };
}

function readRows(data = {}, camelKey, snakeKey) {
  return data[camelKey] || data[snakeKey] || [];
}

function hasRowKey(data = {}, camelKey, snakeKey) {
  return (
    Object.prototype.hasOwnProperty.call(data, camelKey) ||
    Object.prototype.hasOwnProperty.call(data, snakeKey)
  );
}

function hasMetaRows(data = {}) {
  return (
    hasRowKey(data, "solutionVariants", "solution_variants") &&
    hasRowKey(data, "baseEffortRows", "base_effort_rows") &&
    hasRowKey(data, "itemRows", "item_rows") &&
    hasRowKey(data, "coefficientRows", "coefficient_rows") &&
    Array.isArray(readRows(data, "solutionVariants", "solution_variants")) &&
    Array.isArray(readRows(data, "baseEffortRows", "base_effort_rows")) &&
    Array.isArray(readRows(data, "itemRows", "item_rows")) &&
    Array.isArray(readRows(data, "coefficientRows", "coefficient_rows"))
  );
}

function normalizeMeta(data = {}) {
  return {
    solutions: readRows(data, "solutions", "solutions").map(normalizeSolution),
    solutionVariants: readRows(
      data,
      "solutionVariants",
      "solution_variants"
    ).map(normalizeSolutionVariant),
    baseEffortRows: readRows(data, "baseEffortRows", "base_effort_rows").map(
      normalizeBaseEffortRow
    ),
    itemRows: readRows(data, "itemRows", "item_rows").map(
      normalizeStandardItemRow
    ),
    coefficientRows: readRows(
      data,
      "coefficientRows",
      "coefficient_rows"
    ).map(normalizeCoefficientRow),
  };
}

function normalizeSelections(data = {}) {
  return {
    projectSolutionSelections: readRows(
      data,
      "projectSolutionSelections",
      "project_solution_selections"
    ).map(normalizeProjectSolutionSelection),
    projectItemSelections: readRows(
      data,
      "projectItemSelections",
      "project_item_selections"
    ).map(normalizeProjectItemSelection),
  };
}

function withProjectId(projectId, row = {}) {
  return {
    ...row,
    project_id: row.project_id ?? projectId,
  };
}

function normalizeProjectSolutionRows(projectId, selections = []) {
  return (selections || []).map((selection) =>
    normalizeProjectSolutionSelection(withProjectId(projectId, selection))
  );
}

function readProjectSolutionResponseRows(data, fallbackRows = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return fallbackRows;
  }

  return (
    data.projectSolutionSelections ||
    data.project_solution_selections ||
    data.selections ||
    data.rows ||
    fallbackRows
  );
}

function assertProjectItemSelection(row = {}, index) {
  if (!row.solution_variant_id) {
    throw new Error(
      `standardEffort API adapter item selection at index ${index} requires solution_variant_id.`
    );
  }

  if (!row.item_id) {
    throw new Error(
      `standardEffort API adapter item selection at index ${index} requires item_id.`
    );
  }
}

function normalizeProjectItemRows(projectId, selections = []) {
  return (selections || []).map((selection, index) => {
    const row = normalizeProjectItemSelection(withProjectId(projectId, selection));

    assertProjectItemSelection(row, index);

    return row;
  });
}

function readProjectItemResponseRows(data, fallbackRows = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return fallbackRows;
  }

  return (
    data.projectItemSelections ||
    data.project_item_selections ||
    data.selections ||
    data.rows ||
    fallbackRows
  );
}

function normalizeActualEffortMm(value) {
  if (value && typeof value === "object") {
    return toNumberOrZero(
      value.actual_effort_mm ?? value.actual_effort_md ?? value.actual_effort
    );
  }

  return toNumberOrZero(value);
}

function assertSolutionVariantId(solutionVariantId) {
  if (!solutionVariantId) {
    throw new Error(
      "standardEffort API adapter updateProjectActualEffort requires solution_variant_id."
    );
  }
}

function isProjectSolutionLikeRow(data = {}) {
  return (
    Object.prototype.hasOwnProperty.call(data, "project_id") ||
    Object.prototype.hasOwnProperty.call(data, "solution_variant_id") ||
    Object.prototype.hasOwnProperty.call(data, "enabled") ||
    Object.prototype.hasOwnProperty.call(data, "actual_effort_mm") ||
    Object.prototype.hasOwnProperty.call(data, "actual_effort_md") ||
    Object.prototype.hasOwnProperty.call(data, "actual_effort")
  );
}

function readProjectSolutionResponseRow(data, fallbackRow) {
  if (Array.isArray(data)) {
    return data[0] || fallbackRow;
  }

  if (!data || typeof data !== "object") {
    return fallbackRow;
  }

  return (
    data.projectSolutionSelection ||
    data.project_solution_selection ||
    data.row ||
    (Array.isArray(data.rows) ? data.rows[0] : null) ||
    data.selection ||
    (isProjectSolutionLikeRow(data) ? data : null) ||
    fallbackRow
  );
}

function getProjectStandardEffortPath(projectId) {
  return `/projects/${encodeURIComponent(String(projectId))}/standard-effort`;
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

export function createStandardEffortApiAdapter(options = {}) {
  const getClient = createClientResolver(options);
  const adapter = {
    async fetchStandardEffortMeta() {
      const data = await getClient().get("/standard-effort/meta");

      return normalizeMeta(data || {});
    },

    async fetchProjectStandardSelections(projectId) {
      const data = await getClient().get(getProjectStandardEffortPath(projectId));

      return normalizeSelections(data || {});
    },

    async fetchStandardEffortInput(projectId) {
      const data = await getClient().get(getProjectStandardEffortPath(projectId));
      const meta = hasMetaRows(data || {})
        ? normalizeMeta(data || {})
        : await adapter.fetchStandardEffortMeta();
      const selections = normalizeSelections(data || {});

      return buildStandardEffortInput({
        projectId,
        meta,
        selections,
      });
    },

    async upsertProjectSolutionSelections(projectId, selections = []) {
      const rows = normalizeProjectSolutionRows(projectId, selections);

      if (rows.length === 0) {
        return [];
      }

      const data = await getClient().put(
        `${getProjectStandardEffortPath(projectId)}/solutions`,
        {
          body: {
            project_id: projectId,
            selections: rows,
          },
        }
      );
      const responseRows = readProjectSolutionResponseRows(data, rows);

      return normalizeProjectSolutionRows(projectId, responseRows);
    },

    async upsertProjectItemSelections(projectId, selections = []) {
      const rows = normalizeProjectItemRows(projectId, selections);

      if (rows.length === 0) {
        return [];
      }

      const data = await getClient().put(
        `${getProjectStandardEffortPath(projectId)}/items`,
        {
          body: {
            project_id: projectId,
            selections: rows,
          },
        }
      );
      const responseRows = readProjectItemResponseRows(data, rows);

      return normalizeProjectItemRows(projectId, responseRows);
    },

    async updateProjectActualEffort(
      projectId,
      solutionVariantId,
      actualEffortMm
    ) {
      assertSolutionVariantId(solutionVariantId);

      const actual_effort_mm = normalizeActualEffortMm(actualEffortMm);
      const fallbackRow = {
        project_id: projectId,
        solution_variant_id: solutionVariantId,
        enabled: true,
        actual_effort_mm,
      };
      const data = await getClient().put(
        `${getProjectStandardEffortPath(projectId)}/actual-effort`,
        {
          body: {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            actual_effort_mm,
          },
        }
      );
      const responseRow = readProjectSolutionResponseRow(data, fallbackRow);

      return normalizeProjectSolutionSelection(
        withProjectId(projectId, {
          solution_variant_id: solutionVariantId,
          ...responseRow,
        })
      );
    },
  };

  return adapter;
}

const defaultAdapter = createStandardEffortApiAdapter();

export function fetchStandardEffortMeta() {
  return defaultAdapter.fetchStandardEffortMeta();
}

export function fetchProjectStandardSelections(projectId) {
  return defaultAdapter.fetchProjectStandardSelections(projectId);
}

export function fetchStandardEffortInput(projectId) {
  return defaultAdapter.fetchStandardEffortInput(projectId);
}

export function upsertProjectSolutionSelections(projectId, selections) {
  return defaultAdapter.upsertProjectSolutionSelections(projectId, selections);
}

export function upsertProjectItemSelections(projectId, selections) {
  return defaultAdapter.upsertProjectItemSelections(projectId, selections);
}

export function updateProjectActualEffort(
  projectId,
  solutionVariantId,
  actualEffortMm
) {
  return defaultAdapter.updateProjectActualEffort(
    projectId,
    solutionVariantId,
    actualEffortMm
  );
}
