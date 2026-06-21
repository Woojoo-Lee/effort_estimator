const AUTH_ENDPOINTS = {
  LOGIN: "/api/auth/login",
  SESSION: "/api/auth/session",
  LOGOUT: "/api/auth/logout",
  CHANGE_PASSWORD: "/api/auth/change-password",
};

function getFetchImpl(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("App auth fetch implementation is not configured.");
  }

  return fetchImpl;
}

function normalizeLoginId(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAppUser(user) {
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
    login_id: normalizeLoginId(user.login_id || user.loginId),
    display_name: user.display_name || user.displayName || "",
    role_code: roleCode,
    role_codes: roleCodes,
  };
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function requestAuth(endpoint, options = {}, fetchImpl) {
  const fetcher = getFetchImpl(fetchImpl);
  const response = await fetcher(endpoint, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await readJsonSafely(response);

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || "사용자 ID 또는 비밀번호를 확인하세요."
    );
    error.status = response.status;
    error.code = payload?.error?.code || "AUTH_REQUEST_FAILED";
    error.details = payload?.error?.details || null;
    throw error;
  }

  return payload;
}

function buildSessionResult(user) {
  const normalizedUser = normalizeAppUser(user);

  return {
    data: {
      session: normalizedUser ? { user: normalizedUser } : null,
      user: normalizedUser,
    },
    error: null,
  };
}

export async function getAuthSession(fetchImpl) {
  try {
    const payload = await requestAuth(AUTH_ENDPOINTS.SESSION, {
      method: "GET",
    }, fetchImpl);

    return buildSessionResult(payload?.data?.user || payload?.user || null);
  } catch (error) {
    if (error.status === 401) {
      return buildSessionResult(null);
    }

    return { data: { session: null, user: null }, error };
  }
}

export async function getCurrentAuthUser(fetchImpl) {
  const result = await getAuthSession(fetchImpl);

  return {
    data: {
      user: result?.data?.user || null,
    },
    error: result?.error || null,
  };
}

export async function signIn({ loginId, login_id, password }, fetchImpl) {
  const normalizedLoginId = normalizeLoginId(loginId || login_id);
  const payload = await requestAuth(AUTH_ENDPOINTS.LOGIN, {
    method: "POST",
    body: JSON.stringify({
      login_id: normalizedLoginId,
      password,
    }),
  }, fetchImpl);

  return buildSessionResult(payload?.data?.user || payload?.user || null);
}

export function signInWithPassword(credentials, fetchImpl) {
  return signIn(credentials, fetchImpl);
}

export async function signOut(fetchImpl) {
  const payload = await requestAuth(AUTH_ENDPOINTS.LOGOUT, {
    method: "POST",
    body: JSON.stringify({}),
  }, fetchImpl);

  return {
    data: payload?.data || null,
    error: null,
  };
}

export async function changePassword(
  { currentPassword, newPassword, newPasswordConfirm },
  fetchImpl
) {
  const payload = await requestAuth(AUTH_ENDPOINTS.CHANGE_PASSWORD, {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),
  }, fetchImpl);

  return {
    data: payload?.data || null,
    error: null,
  };
}

export function onAuthStateChange() {
  return () => {};
}

export const authSessionRepository = {
  getAuthSession,
  getCurrentAuthUser,
  signIn,
  signInWithPassword,
  signOut,
  changePassword,
  onAuthStateChange,
};
