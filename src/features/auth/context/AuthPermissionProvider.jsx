import React, { createContext, useContext } from "react";

import { buildAuthzSnapshot } from "../lib/permissionUtils";
import { useAuthPermissionState } from "../hooks/useAuthPermissionState";
import { useAuthSession } from "../hooks/useAuthSession";

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
  const authSession = useAuthSession();
  const value = useAuthPermissionState(env, {
    sessionUser: authSession.user,
  });

  return (
    <AuthPermissionContext.Provider value={value}>
      {children}
    </AuthPermissionContext.Provider>
  );
}

export function useAuthPermission() {
  return useContext(AuthPermissionContext);
}
