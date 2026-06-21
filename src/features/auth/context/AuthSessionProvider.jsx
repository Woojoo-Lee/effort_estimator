import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AUTH_LOGIN_MODES,
  resolveAuthLoginMode,
} from "../lib/authLoginMode";
import { authSessionRepository } from "../services/authSessionRepository";

export const PASSWORD_CHANGE_SUCCESS_NOTICE =
  "비밀번호가 변경되었습니다. 다시 로그인해 주세요.";

function normalizeAuthUser(user) {
  if (!user) {
    return null;
  }

  const roleCode = user.role_code || user.roleCode || null;
  const roleCodes =
    Array.isArray(user.role_codes) && user.role_codes.length > 0
      ? user.role_codes
      : roleCode
        ? [roleCode]
        : [];

  return {
    user_id: user.user_id || user.id || null,
    login_id: user.login_id || user.loginId || null,
    display_name: user.display_name || user.displayName || "",
    role_code: roleCode,
    role_codes: roleCodes,
  };
}

function readSessionPayload(result) {
  const data = result?.data || result || {};
  const session = data.session || null;
  const user = normalizeAuthUser(data.user || session?.user || null);

  return {
    session,
    user,
  };
}

function buildState({
  policy,
  loading = false,
  error = null,
  notice = "",
  session = null,
  user = null,
}) {
  const normalizedUser = normalizeAuthUser(user);

  return {
    loginMode: policy.mode,
    mode: policy.mode,
    requireLogin: policy.requireLogin,
    loading,
    error,
    notice,
    session,
    user: normalizedUser,
    isAuthenticated: Boolean(session || normalizedUser),
  };
}

function cleanupAuthSubscription(subscriptionResult) {
  if (typeof subscriptionResult === "function") {
    subscriptionResult();
    return;
  }

  const subscription =
    subscriptionResult?.data?.subscription || subscriptionResult?.subscription;

  if (typeof subscription?.unsubscribe === "function") {
    subscription.unsubscribe();
  }
}

export function createAuthSessionFallback() {
  const policy = {
    mode: AUTH_LOGIN_MODES.DISABLED,
    requireLogin: false,
  };

  return {
    ...buildState({ policy }),
    refresh: async () => ({ data: null, error: null }),
    signIn: async () => ({ data: null, error: null }),
    signOut: async () => ({ data: null, error: null }),
    changePassword: async () => ({ data: null, error: null }),
  };
}

export const AuthSessionContext = createContext(createAuthSessionFallback());

export function AuthSessionProvider({
  children,
  env = import.meta.env,
  repository = authSessionRepository,
}) {
  const policy = useMemo(() => resolveAuthLoginMode(env), [env]);
  const [state, setState] = useState(() =>
    buildState({ policy, loading: policy.requireLogin })
  );

  const refresh = useCallback(async () => {
    if (!policy.requireLogin) {
      const nextState = buildState({ policy });
      setState(nextState);
      return { data: nextState, error: null };
    }

    setState((current) => ({
        ...current,
        loginMode: policy.mode,
        mode: policy.mode,
        requireLogin: policy.requireLogin,
        loading: true,
        error: null,
        notice: "",
      }));

    try {
      const result = await repository.getAuthSession();

      if (result?.error) {
        throw result.error;
      }

      const payload = readSessionPayload(result);
      const nextState = buildState({
        policy,
        session: payload.session,
        user: payload.user,
      });

      setState(nextState);

      return { data: nextState, error: null };
    } catch (error) {
      const nextState = buildState({ policy, error });
      setState(nextState);

      return { data: null, error };
    }
  }, [policy, repository]);

  const signIn = useCallback(
    async ({ loginId, login_id, password }) => {
      if (!policy.requireLogin) {
        return { data: null, error: null };
      }

      setState((current) => ({
        ...current,
        loading: true,
        error: null,
        notice: "",
      }));

      try {
        const result = await repository.signIn({
          loginId: loginId || login_id,
          password,
        });

        if (result?.error) {
          throw result.error;
        }

        const payload = readSessionPayload(result);
        const nextState = buildState({
          policy,
          session: payload.session,
          user: payload.user,
        });

        setState(nextState);

        return { data: result?.data || null, error: null };
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          error,
        }));
        throw error;
      }
    },
    [policy, repository]
  );

  const signOut = useCallback(async () => {
    if (!policy.requireLogin) {
      return { data: null, error: null };
    }

    setState((current) => ({
        ...current,
        loading: true,
        error: null,
        notice: "",
      }));

    try {
      const result = await repository.signOut();

      if (result?.error) {
        throw result.error;
      }

      const nextState = buildState({ policy });
      setState(nextState);

      return { data: result?.data || null, error: null };
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error,
      }));
      throw error;
    }
  }, [policy, repository]);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword, newPasswordConfirm }) => {
      if (!policy.requireLogin) {
        return { data: null, error: null };
      }

      setState((current) => ({
        ...current,
        error: null,
        notice: "",
      }));

      try {
        if (typeof repository.changePassword !== "function") {
          throw new Error("Password change is not configured.");
        }

        const result = await repository.changePassword({
          currentPassword,
          newPassword,
          newPasswordConfirm,
        });

        if (result?.error) {
          throw result.error;
        }

        const nextState = buildState({
          policy,
          notice: PASSWORD_CHANGE_SUCCESS_NOTICE,
        });
        setState(nextState);

        return { data: result?.data || null, error: null };
      } catch (error) {
        setState((current) => ({
          ...current,
          error,
        }));
        throw error;
      }
    },
    [policy, repository]
  );

  useEffect(() => {
    let active = true;
    let subscriptionResult = null;

    if (!policy.requireLogin) {
      setState(buildState({ policy }));
      return undefined;
    }

    refresh();

    try {
      subscriptionResult = repository.onAuthStateChange(({ session, user }) => {
        if (!active) {
          return;
        }

        setState(
          buildState({
            policy,
            session,
            user: user || session?.user || null,
          })
        );
      });
    } catch (error) {
      setState(buildState({ policy, error }));
    }

    return () => {
      active = false;
      cleanupAuthSubscription(subscriptionResult);
    };
  }, [policy, refresh, repository]);

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      signIn,
      signOut,
      changePassword,
    }),
    [changePassword, refresh, signIn, signOut, state]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
