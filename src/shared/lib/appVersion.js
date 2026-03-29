export function getAppVersion() {
  return import.meta.env.VITE_APP_VERSION || "unknown";
}