import { createApiClient } from "../../api";
import { getApiBaseUrl } from "../../dataBackend";
import {
  normalizeBaseEffortRow,
  normalizeCoefficientRow,
  normalizeSolutionVariant,
  normalizeStandardItemRow,
  toNumberOrZero,
} from "../../../shared/lib/standardEffortMapper";
import {
  buildStandardEffortMetaSummary,
  STANDARD_BASE_EFFORT_PHASES,
} from "../supabase/standardEffortMetaSupabaseAdapter";

const API_BASE_URL_REQUIRED_ERROR =
  "VITE_API_BASE_URL is required when using standardEffortMeta API adapter.";
const PHASE_BY_CODE = new Map(
  STANDARD_BASE_EFFORT_PHASES.map((phase) => [phase.phase_code, phase])
);

export { buildStandardEffortMetaSummary };

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

function normalizeMeta(data = {}) {
  const meta = data.meta && typeof data.meta === "object" ? data.meta : data;
  const solutions = readRows(meta, "solutions", "solutions").map(
    normalizeSolution
  );
  const solutionNameByCode = new Map(
    solutions.map((solution) => [solution.solution_code, solution.solution_name])
  );

  return {
    solutions,
    solutionVariants: readRows(
      meta,
      "solutionVariants",
      "solution_variants"
    ).map((row) =>
      normalizeSolutionVariant({
        ...row,
        solution_name:
          row.solution_name ?? solutionNameByCode.get(row.solution_code),
      })
    ),
    baseEffortRows: readRows(meta, "baseEffortRows", "base_effort_rows").map(
      normalizeBaseEffortRow
    ),
    itemRows: readRows(meta, "itemRows", "item_rows").map(
      normalizeStandardItemRow
    ),
    coefficientRows: readRows(
      meta,
      "coefficientRows",
      "coefficient_rows"
    ).map(normalizeCoefficientRow),
  };
}

function parseEffortMm(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(
      "standardEffortMeta API adapter base effort row effort_mm must be a number."
    );
  }

  if (numericValue < 0) {
    throw new Error(
      "standardEffortMeta API adapter base effort row effort_mm must be 0 or greater."
    );
  }

  return numericValue;
}

function assertSolutionVariantId(solutionVariantId) {
  if (!solutionVariantId) {
    throw new Error(
      "standardEffortMeta API adapter upsertStandardBaseEffortRows requires solution_variant_id."
    );
  }
}

function normalizeBaseEffortPayloadRow(solutionVariantId, row = {}, index) {
  if (!row.phase_code) {
    throw new Error(
      `standardEffortMeta API adapter base effort phase row at index ${index} requires phase_code.`
    );
  }

  const phase = PHASE_BY_CODE.get(row.phase_code);

  if (!phase) {
    throw new Error(
      `standardEffortMeta API adapter base effort phase row at index ${index} has unsupported phase_code: ${row.phase_code}.`
    );
  }

  if (!row.phase_name) {
    throw new Error(
      `standardEffortMeta API adapter base effort phase row at index ${index} requires phase_name.`
    );
  }

  return {
    solution_variant_id: solutionVariantId,
    phase_code: row.phase_code,
    phase_name: row.phase_name,
    effort_mm: parseEffortMm(row.effort_mm ?? row.effort_md),
    display_order:
      row.display_order === null || row.display_order === undefined
        ? phase.display_order
        : toNumberOrZero(row.display_order),
    active: row.active === undefined ? true : row.active !== false,
  };
}

function normalizeBaseEffortPayloadRows(solutionVariantId, phaseRows) {
  assertSolutionVariantId(solutionVariantId);

  if (!Array.isArray(phaseRows)) {
    throw new Error(
      "standardEffortMeta API adapter upsertStandardBaseEffortRows requires phase_rows to be an array."
    );
  }

  return phaseRows.map((row, index) =>
    normalizeBaseEffortPayloadRow(solutionVariantId, row, index)
  );
}

function toPhaseRowPayload(row = {}) {
  return {
    phase_code: row.phase_code,
    phase_name: row.phase_name,
    effort_mm: row.effort_mm,
    display_order: row.display_order,
    active: row.active,
  };
}

function readBaseEffortResponseRows(data, fallbackRows = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return fallbackRows;
  }

  return (
    data.baseEffortRows ||
    data.base_effort_rows ||
    data.phaseRows ||
    data.phase_rows ||
    data.rows ||
    fallbackRows
  );
}

function normalizeBaseEffortResponseRows(solutionVariantId, rows = []) {
  return (rows || []).map((row) =>
    normalizeBaseEffortRow({
      solution_variant_id: row.solution_variant_id ?? solutionVariantId,
      ...row,
    })
  );
}

function parseCoefficient(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(
      "standardEffortMeta API adapter coefficient row coefficient must be a number."
    );
  }

  if (numericValue < 0) {
    throw new Error(
      "standardEffortMeta API adapter coefficient row coefficient must be 0 or greater."
    );
  }

  return numericValue;
}

function assertItemId(itemId) {
  if (!itemId) {
    throw new Error(
      "standardEffortMeta API adapter upsertStandardCoefficientRows requires item_id."
    );
  }
}

function normalizeCoefficientPayloadRow(itemId, row = {}, index) {
  if (!row.solution_variant_id) {
    throw new Error(
      `standardEffortMeta API adapter coefficient row at index ${index} requires solution_variant_id.`
    );
  }

  return {
    item_id: itemId,
    solution_variant_id: row.solution_variant_id,
    coefficient: parseCoefficient(row.coefficient),
    active: row.active === undefined ? true : row.active !== false,
  };
}

function normalizeCoefficientPayloadRows(itemId, coefficientRows) {
  assertItemId(itemId);

  if (!Array.isArray(coefficientRows)) {
    throw new Error(
      "standardEffortMeta API adapter upsertStandardCoefficientRows requires coefficient_rows to be an array."
    );
  }

  return coefficientRows.map((row, index) =>
    normalizeCoefficientPayloadRow(itemId, row, index)
  );
}

function toCoefficientRowPayload(row = {}) {
  return {
    solution_variant_id: row.solution_variant_id,
    coefficient: row.coefficient,
    active: row.active,
  };
}

function readCoefficientResponseRows(data, fallbackRows = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return fallbackRows;
  }

  return (
    data.coefficientRows ||
    data.coefficient_rows ||
    data.rows ||
    data.coefficients ||
    fallbackRows
  );
}

function normalizeCoefficientResponseRows(itemId, rows = []) {
  return (rows || []).map((row) =>
    normalizeCoefficientRow({
      ...row,
      item_id: row.item_id ?? itemId,
    })
  );
}

function assertBooleanActive(active) {
  if (typeof active !== "boolean") {
    throw new Error(
      "standardEffortMeta API adapter active updates require active to be boolean."
    );
  }
}

function assertActiveSolutionVariantId(solutionVariantId) {
  if (!solutionVariantId) {
    throw new Error(
      "standardEffortMeta API adapter updateStandardSolutionVariantActive requires solution_variant_id."
    );
  }
}

function assertActiveItemId(itemId) {
  if (!itemId) {
    throw new Error(
      "standardEffortMeta API adapter updateStandardItemActive requires item_id."
    );
  }
}

function isSolutionVariantLikeRow(data = {}) {
  return (
    Object.prototype.hasOwnProperty.call(data, "solution_variant_id") ||
    Object.prototype.hasOwnProperty.call(data, "solution_code") ||
    Object.prototype.hasOwnProperty.call(data, "variant_code") ||
    Object.prototype.hasOwnProperty.call(data, "active")
  );
}

function isStandardItemLikeRow(data = {}) {
  return (
    Object.prototype.hasOwnProperty.call(data, "item_id") ||
    Object.prototype.hasOwnProperty.call(data, "item_name") ||
    Object.prototype.hasOwnProperty.call(data, "category_l1") ||
    Object.prototype.hasOwnProperty.call(data, "active")
  );
}

function readSolutionVariantResponseRow(data, fallbackRow) {
  if (Array.isArray(data)) {
    return data[0] || fallbackRow;
  }

  if (!data || typeof data !== "object") {
    return fallbackRow;
  }

  return (
    data.solutionVariant ||
    data.solution_variant ||
    data.row ||
    (Array.isArray(data.rows) ? data.rows[0] : null) ||
    data.variant ||
    (isSolutionVariantLikeRow(data) ? data : null) ||
    fallbackRow
  );
}

function readStandardItemResponseRow(data, fallbackRow) {
  if (Array.isArray(data)) {
    return data[0] || fallbackRow;
  }

  if (!data || typeof data !== "object") {
    return fallbackRow;
  }

  return (
    data.item ||
    data.standardItem ||
    data.standard_item ||
    data.row ||
    (Array.isArray(data.rows) ? data.rows[0] : null) ||
    (isStandardItemLikeRow(data) ? data : null) ||
    fallbackRow
  );
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

export function createStandardEffortMetaApiAdapter(options = {}) {
  const getClient = createClientResolver(options);

  return {
    async fetchStandardEffortMetaAdmin() {
      const data = await getClient().get("/standard-effort/admin/meta");

      return normalizeMeta(data || {});
    },

    buildStandardEffortMetaSummary,

    async upsertStandardBaseEffortRows(solutionVariantId, phaseRows) {
      const rows = normalizeBaseEffortPayloadRows(solutionVariantId, phaseRows);

      if (rows.length === 0) {
        return [];
      }

      const data = await getClient().put(
        `/standard-effort/admin/base-effort/${encodeURIComponent(
          String(solutionVariantId)
        )}`,
        {
          body: {
            solution_variant_id: solutionVariantId,
            phase_rows: rows.map(toPhaseRowPayload),
          },
        }
      );
      const responseRows = readBaseEffortResponseRows(data, rows);

      return normalizeBaseEffortResponseRows(solutionVariantId, responseRows);
    },

    async upsertStandardCoefficientRows(itemId, coefficientRows) {
      const rows = normalizeCoefficientPayloadRows(itemId, coefficientRows);

      if (rows.length === 0) {
        return [];
      }

      const data = await getClient().put(
        `/standard-effort/admin/coefficients/${encodeURIComponent(
          String(itemId)
        )}`,
        {
          body: {
            item_id: itemId,
            coefficient_rows: rows.map(toCoefficientRowPayload),
          },
        }
      );
      const responseRows = readCoefficientResponseRows(data, rows);

      return normalizeCoefficientResponseRows(itemId, responseRows);
    },

    async updateStandardSolutionVariantActive(solutionVariantId, active) {
      assertActiveSolutionVariantId(solutionVariantId);
      assertBooleanActive(active);

      const fallbackRow = {
        solution_variant_id: solutionVariantId,
        active,
      };
      const data = await getClient().put(
        `/standard-effort/admin/solution-variants/${encodeURIComponent(
          String(solutionVariantId)
        )}/active`,
        {
          body: {
            solution_variant_id: solutionVariantId,
            active,
          },
        }
      );
      const responseRow = readSolutionVariantResponseRow(data, fallbackRow);

      return normalizeSolutionVariant({
        solution_variant_id: solutionVariantId,
        ...responseRow,
      });
    },

    async updateStandardItemActive(itemId, active) {
      assertActiveItemId(itemId);
      assertBooleanActive(active);

      const fallbackRow = {
        item_id: itemId,
        active,
      };
      const data = await getClient().put(
        `/standard-effort/admin/items/${encodeURIComponent(String(itemId))}/active`,
        {
          body: {
            item_id: itemId,
            active,
          },
        }
      );
      const responseRow = readStandardItemResponseRow(data, fallbackRow);

      return normalizeStandardItemRow({
        item_id: itemId,
        ...responseRow,
      });
    },
  };
}

const defaultAdapter = createStandardEffortMetaApiAdapter();

export function fetchStandardEffortMetaAdmin() {
  return defaultAdapter.fetchStandardEffortMetaAdmin();
}

export async function upsertStandardBaseEffortRows(
  solutionVariantId,
  phaseRows
) {
  return defaultAdapter.upsertStandardBaseEffortRows(
    solutionVariantId,
    phaseRows
  );
}

export async function upsertStandardCoefficientRows(itemId, coefficientRows) {
  return defaultAdapter.upsertStandardCoefficientRows(itemId, coefficientRows);
}

export async function updateStandardSolutionVariantActive(
  solutionVariantId,
  active
) {
  return defaultAdapter.updateStandardSolutionVariantActive(
    solutionVariantId,
    active
  );
}

export async function updateStandardItemActive(itemId, active) {
  return defaultAdapter.updateStandardItemActive(itemId, active);
}
