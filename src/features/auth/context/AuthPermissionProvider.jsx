import React, { createContext, useContext } from "react";

import { buildAuthzSnapshot } from "../lib/permissionUtils";
import { useAuthPermissionState } from "../hooks/useAuthPermissionState";

function createFallbackValue() {
  return {
    loading: false,
    error: null,
    user: null,
    roles: [],
    permissions: [],
    authz: buildAuthzSnapshot(),
    devOnly: false,
    reload: () => {},
  };
}

const AuthPermissionContext = createContext(createFallbackValue());

export function AuthPermissionProvider({ children, env }) {
  const value = useAuthPermissionState(env);

  return (
    <AuthPermissionContext.Provider value={value}>
      {children}
    </AuthPermissionContext.Provider>
  );
}

export function useAuthPermission() {
  return useContext(AuthPermissionContext);
}
