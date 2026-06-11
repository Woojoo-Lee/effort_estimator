export const AUTH_LOGIN_MODES = {
  DISABLED: "disabled",
  SUPABASE: "supabase",
};

export const DEFAULT_AUTH_LOGIN_MODE = AUTH_LOGIN_MODES.DISABLED;

const VALID_AUTH_LOGIN_MODES = new Set(Object.values(AUTH_LOGIN_MODES));

export function normalizeAuthLoginMode(value) {
  const rawMode = value;
  const mode = String(value || DEFAULT_AUTH_LOGIN_MODE)
    .trim()
    .toLowerCase();

  if (VALID_AUTH_LOGIN_MODES.has(mode)) {
    return {
      mode,
      rawMode,
      isFallback: false,
      warnings: [],
    };
  }

  return {
    mode: DEFAULT_AUTH_LOGIN_MODE,
    rawMode,
    isFallback: true,
    warnings: [
      `Unknown VITE_AUTH_LOGIN_MODE "${String(value)}"; using disabled.`,
    ],
  };
}

export function resolveAuthLoginMode(env = import.meta.env) {
  const resolved = normalizeAuthLoginMode(env?.VITE_AUTH_LOGIN_MODE);

  return {
    ...resolved,
    isEnabled: resolved.mode === AUTH_LOGIN_MODES.SUPABASE,
    requireLogin: resolved.mode === AUTH_LOGIN_MODES.SUPABASE,
  };
}
