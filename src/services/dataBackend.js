export const DATA_BACKENDS = {
  SUPABASE: "supabase",
  API: "api",
};

export const DEFAULT_DATA_BACKEND = DATA_BACKENDS.SUPABASE;

function getRuntimeEnv() {
  return import.meta.env || {};
}

function getEnv(env) {
  return env || getRuntimeEnv();
}

function normalizeBackendValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getBackendFromConfig(backendConfig) {
  if (backendConfig && typeof backendConfig === "object") {
    return backendConfig.backend;
  }

  return backendConfig;
}

export function normalizeDataBackend(value) {
  const normalized = normalizeBackendValue(value);

  if (!normalized) {
    return DEFAULT_DATA_BACKEND;
  }

  if (
    normalized === DATA_BACKENDS.SUPABASE ||
    normalized === DATA_BACKENDS.API
  ) {
    return normalized;
  }

  return DEFAULT_DATA_BACKEND;
}

export function getApiBaseUrl(env) {
  const rawBaseUrl = getEnv(env).VITE_API_BASE_URL;
  const trimmed = String(rawBaseUrl || "").trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

export function resolveDataBackend(env) {
  const resolvedEnv = getEnv(env);
  const rawBackend = resolvedEnv.VITE_DATA_BACKEND ?? "";
  const normalized = normalizeBackendValue(rawBackend);
  const isKnownBackend =
    !normalized ||
    normalized === DATA_BACKENDS.SUPABASE ||
    normalized === DATA_BACKENDS.API;
  const backend = isKnownBackend ? normalizeDataBackend(normalized) : DEFAULT_DATA_BACKEND;
  const isFallback = Boolean(normalized && !isKnownBackend);
  const warnings = isFallback
    ? [
        `Unknown VITE_DATA_BACKEND "${rawBackend}". Falling back to ${DEFAULT_DATA_BACKEND}.`,
      ]
    : [];

  return {
    backend,
    rawBackend,
    isFallback,
    apiBaseUrl: backend === DATA_BACKENDS.API ? getApiBaseUrl(resolvedEnv) : null,
    warnings,
  };
}

export function isSupabaseBackend(backendConfig) {
  return normalizeDataBackend(getBackendFromConfig(backendConfig)) === DATA_BACKENDS.SUPABASE;
}

export function isApiBackend(backendConfig) {
  return normalizeDataBackend(getBackendFromConfig(backendConfig)) === DATA_BACKENDS.API;
}

export function validateDataBackendConfig(env) {
  const backendConfig = resolveDataBackend(env);
  const errors = [];
  const warnings = [...backendConfig.warnings];

  if (backendConfig.backend === DATA_BACKENDS.API && !backendConfig.apiBaseUrl) {
    errors.push("VITE_API_BASE_URL is required when VITE_DATA_BACKEND=api.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    backendConfig,
  };
}
