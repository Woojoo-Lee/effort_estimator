import { useCallback, useEffect, useMemo, useState } from "react";

import { buildAuthzSnapshot } from "../lib/permissionUtils";
import { fetchPermissionSnapshotByEmail } from "../services/authPermissionRepository";

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildDisabledState() {
  const authz = buildAuthzSnapshot();

  return {
    loading: false,
    error: null,
    user: null,
    roles: [],
    permissions: [],
    authz,
    devOnly: false,
  };
}

function buildDevSnapshotFromEnv(env) {
  const email = String(env.VITE_DEV_AUTH_EMAIL || "").trim();
  const roles = parseCsv(env.VITE_DEV_AUTH_ROLE_CODES).map((role_code) => ({
    role_code,
    active: true,
  }));
  const permissions = parseCsv(env.VITE_DEV_AUTH_PERMISSION_CODES).map(
    (permission_code) => ({
      permission_code,
      active: true,
    })
  );
  const user = email
    ? {
        user_id: "dev-auth-user",
        email,
        display_name: email,
        status: "active",
        active: true,
      }
    : null;

  return {
    user,
    roles,
    permissions,
  };
}

function buildSessionSnapshot(sessionUser) {
  if (!sessionUser) {
    return null;
  }

  const roleCodes =
    Array.isArray(sessionUser.role_codes) && sessionUser.role_codes.length > 0
      ? sessionUser.role_codes
      : sessionUser.role_code
        ? [sessionUser.role_code]
        : [];

  return {
    user: {
      user_id: sessionUser.user_id || sessionUser.id || null,
      login_id: sessionUser.login_id || sessionUser.loginId || null,
      display_name: sessionUser.display_name || sessionUser.displayName || "",
      status: "active",
      active: true,
    },
    roles: roleCodes.map((role_code) => ({
      role_code,
      active: true,
    })),
    permissions: [],
  };
}

export function useAuthPermissionState(env = import.meta.env, options = {}) {
  const mode = env.VITE_AUTH_PERMISSION_MODE || "disabled";
  const sessionUser = options.sessionUser || null;
  const [state, setState] = useState(() => buildDisabledState());

  const reload = useCallback(async () => {
    if (mode !== "dev") {
      setState(buildDisabledState());
      return;
    }

    const sessionSnapshot = buildSessionSnapshot(sessionUser);

    if (sessionSnapshot) {
      const authz = buildAuthzSnapshot(sessionSnapshot);
      setState({
        loading: false,
        error: null,
        user: sessionSnapshot.user,
        roles: sessionSnapshot.roles,
        permissions: [],
        authz,
        devOnly: false,
      });
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
      devOnly: true,
    }));

    const devSnapshot = buildDevSnapshotFromEnv(env);

    try {
      if (devSnapshot.user?.email) {
        const snapshot = await fetchPermissionSnapshotByEmail(
          devSnapshot.user.email
        );

        if (snapshot.user) {
          const authz = buildAuthzSnapshot(snapshot);
          setState({
            loading: false,
            error: null,
            user: snapshot.user,
            roles: snapshot.roles,
            permissions: snapshot.permissions,
            authz,
            devOnly: true,
          });
          return;
        }
      }

      const authz = buildAuthzSnapshot(devSnapshot);
      setState({
        loading: false,
        error: null,
        user: devSnapshot.user,
        roles: devSnapshot.roles,
        permissions: devSnapshot.permissions,
        authz,
        devOnly: true,
      });
    } catch (error) {
      // Development-only fallback. This is not a security mechanism.
      const authz = buildAuthzSnapshot(devSnapshot);
      setState({
        loading: false,
        error,
        user: devSnapshot.user,
        roles: devSnapshot.roles,
        permissions: devSnapshot.permissions,
        authz,
        devOnly: true,
      });
    }
  }, [env, mode, sessionUser]);

  useEffect(() => {
    reload();
  }, [reload]);

  return useMemo(
    () => ({
      ...state,
      reload,
    }),
    [reload, state]
  );
}
