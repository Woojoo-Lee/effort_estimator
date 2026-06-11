import { DATA_BACKENDS, resolveDataBackend } from "../../../services/dataBackend";

export const FRONTEND_AUDIT_MODES = {
  AUTO: "auto",
  ENABLED: "enabled",
  DISABLED: "disabled",
  SHADOW: "shadow",
};

export const DEFAULT_FRONTEND_AUDIT_MODE = FRONTEND_AUDIT_MODES.AUTO;

const FRONTEND_AUDIT_MODE_VALUES = new Set(
  Object.values(FRONTEND_AUDIT_MODES)
);

function getRuntimeEnv() {
  return import.meta.env || {};
}

function getEnv(env) {
  return env || getRuntimeEnv();
}

function isPolicyObject(value) {
  return (
    value &&
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, "shouldWrite")
  );
}

function normalizeModeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizeFrontendAuditMode(value) {
  const rawMode = value ?? "";
  const normalized = normalizeModeValue(rawMode);

  if (!normalized) {
    return {
      mode: DEFAULT_FRONTEND_AUDIT_MODE,
      rawMode,
      isFallback: false,
      warnings: [],
    };
  }

  if (FRONTEND_AUDIT_MODE_VALUES.has(normalized)) {
    return {
      mode: normalized,
      rawMode,
      isFallback: false,
      warnings: [],
    };
  }

  return {
    mode: DEFAULT_FRONTEND_AUDIT_MODE,
    rawMode,
    isFallback: true,
    warnings: [
      `Unknown VITE_FRONTEND_AUDIT_MODE "${rawMode}". Falling back to ${DEFAULT_FRONTEND_AUDIT_MODE}.`,
    ],
  };
}

export function resolveFrontendAuditPolicy(env) {
  const resolvedEnv = getEnv(env);
  const modeConfig = normalizeFrontendAuditMode(
    resolvedEnv.VITE_FRONTEND_AUDIT_MODE
  );
  const backendConfig = resolveDataBackend(resolvedEnv);
  const dataBackend = backendConfig.backend;
  const isShadow = modeConfig.mode === FRONTEND_AUDIT_MODES.SHADOW;
  const shouldWrite =
    modeConfig.mode === FRONTEND_AUDIT_MODES.ENABLED ||
    modeConfig.mode === FRONTEND_AUDIT_MODES.SHADOW ||
    (modeConfig.mode === FRONTEND_AUDIT_MODES.AUTO &&
      dataBackend === DATA_BACKENDS.SUPABASE);
  const metadata = {
    audit_source: "frontend",
    data_backend: dataBackend,
  };

  if (isShadow) {
    metadata.frontend_shadow = true;
  }

  return {
    mode: modeConfig.mode,
    rawMode: modeConfig.rawMode,
    dataBackend,
    isFallback: modeConfig.isFallback || backendConfig.isFallback,
    shouldWrite,
    isShadow,
    metadata,
    warnings: [...modeConfig.warnings, ...backendConfig.warnings],
  };
}

export function shouldWriteFrontendAudit(policyOrEnv) {
  if (isPolicyObject(policyOrEnv)) {
    return Boolean(policyOrEnv.shouldWrite);
  }

  return resolveFrontendAuditPolicy(policyOrEnv).shouldWrite;
}

export function shouldWriteShadowAudit(policyOrEnv) {
  if (isPolicyObject(policyOrEnv)) {
    return Boolean(policyOrEnv.isShadow);
  }

  return resolveFrontendAuditPolicy(policyOrEnv).isShadow;
}

export function decorateAuditMetadata(metadata, policyOrEnv) {
  const policy = isPolicyObject(policyOrEnv)
    ? policyOrEnv
    : resolveFrontendAuditPolicy(policyOrEnv);
  const decorated =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...metadata }
      : {};

  decorated.audit_source = "frontend";
  decorated.data_backend = policy.dataBackend || policy.metadata?.data_backend;

  if (policy.isShadow) {
    decorated.frontend_shadow = true;
  } else {
    delete decorated.frontend_shadow;
  }

  return decorated;
}
