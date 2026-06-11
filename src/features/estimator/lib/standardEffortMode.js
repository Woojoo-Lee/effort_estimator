const STANDARD_EFFORT_MODES = new Set(["legacy", "parallel", "standard"]);

function normalizeMode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "parallel";
  }

  return STANDARD_EFFORT_MODES.has(normalized) ? normalized : "parallel";
}

export function resolveStandardEffortMode(env = {}) {
  const isStandardFeatureEnabled =
    env.VITE_FEATURE_STANDARD_EFFORT === "true";
  const mode = isStandardFeatureEnabled
    ? normalizeMode(env.VITE_STANDARD_EFFORT_MODE)
    : "legacy";
  const isLegacyMode = mode === "legacy";
  const isParallelMode = mode === "parallel";
  const isStandardMode = mode === "standard";

  return {
    mode,
    isStandardFeatureEnabled,
    showLegacyEstimator: true,
    showStandardEstimator: isStandardFeatureEnabled && !isLegacyMode,
    isParallelMode,
    isStandardMode,
    shouldHideLegacyRightSidebar: isStandardMode,
  };
}
