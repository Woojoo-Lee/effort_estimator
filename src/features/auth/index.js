export { PERMISSIONS, ROLES } from "./lib/permissionCodes";
export {
  AUTH_LOGIN_MODES,
  DEFAULT_AUTH_LOGIN_MODE,
  normalizeAuthLoginMode,
  resolveAuthLoginMode,
} from "./lib/authLoginMode";
export {
  ROLE_PERMISSION_POLICY,
  buildPermissionSnapshot,
  getPermissionsForRole,
  normalizePolicyPermissionCodes,
  normalizePolicyRoleCodes,
} from "./lib/authPermissionPolicy";
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
  changePassword,
  getAuthSession,
  getCurrentAuthUser,
  onAuthStateChange,
  signIn,
  signInWithPassword,
  signOut,
} from "./services/authSessionRepository";
export {
  authUserAdminRepository,
  fetchAuthUsers,
  updateAuthUser,
} from "./services/authUserAdminRepository";
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
export { default as UserManagementTable } from "./components/UserManagementTable";
export { default as LoginPage } from "./pages/LoginPage";
export { default as UserManagementPage } from "./pages/UserManagementPage";
export {
  canAccessRoute,
  filterRoutesByAuthz,
  getRouteDeniedReason,
  isAuthPermissionEnabled,
} from "./lib/routeAuthz";
export {
  buildCreateHistoryFields,
  buildRowHistoryActor,
  buildUpdateHistoryFields,
  mergeCreateHistoryFields,
  mergeUpdateHistoryFields,
} from "./lib/rowHistoryActor";
