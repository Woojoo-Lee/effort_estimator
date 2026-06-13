export const AUTH_LOGIN_MODES = {
  DISABLED: "disabled",
  APP: "app",
  SUPABASE: "supabase",
};

export const DEFAULT_AUTH_LOGIN_MODE = AUTH_LOGIN_MODES.DISABLED;

const VALID_AUTH_LOGIN_MODES = new Set([
  AUTH_LOGIN_MODES.DISABLED,
  AUTH_LOGIN_MODES.APP,
]);

export function normalizeAuthLoginMode(value) {
  const rawMode = value;
  const mode = String(value || DEFAULT_AUTH_LOGIN_MODE)
    .trim()
    .toLowerCase();

  if (mode === AUTH_LOGIN_MODES.SUPABASE) {
    return {
      mode: AUTH_LOGIN_MODES.APP,
      rawMode,
      isFallback: true,
      warnings: [
        "VITE_AUTH_LOGIN_MODE=supabase is deprecated; using app login.",
      ],
    };
  }

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
    isEnabled: resolved.mode === AUTH_LOGIN_MODES.APP,
    requireLogin: resolved.mode === AUTH_LOGIN_MODES.APP,
  };
}
