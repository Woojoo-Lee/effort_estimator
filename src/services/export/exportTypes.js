export const EXPORT_TYPES = {
  LEGACY: "legacy",
  STANDARD_EFFORT: "standard_effort",
  AUDIT: "audit",
  STANDARD_EFFORT_META: "standard_effort_meta",
};

export const EXPORT_FORMATS = {
  JSON: "json",
  XLSX: "xlsx",
};

export const EXPORT_MODES = {
  LOCAL: "local",
  API_JSON: "api_json",
  API_FILE: "api_file",
};

export const DEFAULT_EXPORT_FORMAT = EXPORT_FORMATS.XLSX;

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizeExportType(value) {
  const normalized = normalizeValue(value);
  const allowedTypes = new Set(Object.values(EXPORT_TYPES));

  if (allowedTypes.has(normalized)) {
    return normalized;
  }

  throw new Error(`Unknown export type "${value}".`);
}

export function normalizeExportFormat(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return DEFAULT_EXPORT_FORMAT;
  }

  if (
    normalized === EXPORT_FORMATS.JSON ||
    normalized === EXPORT_FORMATS.XLSX
  ) {
    return normalized;
  }

  return DEFAULT_EXPORT_FORMAT;
}
