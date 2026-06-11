export { PERMISSIONS, ROLES } from "./lib/permissionCodes";
export {
  AUTH_LOGIN_MODES,
  DEFAULT_AUTH_LOGIN_MODE,
  normalizeAuthLoginMode,
  resolveAuthLoginMode,
} from "./lib/authLoginMode";
export {
  buildAuthzSnapshot,
  buildPermissionSet,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  normalizePermissionCodes,
  normalizeRoleCodes,
} from "./lib/permissionUtils";
export {
  fetchAppUserByAuthUserId,
  fetchAppUserByEmail,
  fetchPermissionSnapshotByAuthUserId,
  fetchPermissionSnapshotByEmail,
  fetchRolePermissions,
  fetchUserRoles,
} from "./services/authPermissionRepository";
export {
  authSessionRepository,
  getAuthSession,
  getCurrentAuthUser,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "./services/authSessionRepository";
export { useAuthPermissionState } from "./hooks/useAuthPermissionState";
export { useAuthSession } from "./hooks/useAuthSession";
export {
  AuthPermissionProvider,
  useAuthPermission,
} from "./context/AuthPermissionProvider";
export {
  AuthSessionContext,
  AuthSessionProvider,
  createAuthSessionFallback,
} from "./context/AuthSessionProvider";
export { default as LoginForm } from "./components/LoginForm";
export { default as LoginPage } from "./pages/LoginPage";
export {
  canAccessRoute,
  filterRoutesByAuthz,
  getRouteDeniedReason,
  isAuthPermissionEnabled,
} from "./lib/routeAuthz";
