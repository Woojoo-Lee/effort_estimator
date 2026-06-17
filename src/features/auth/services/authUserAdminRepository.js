const USERS_ENDPOINT = "/api/auth/users";

function getFetchImpl(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("User admin fetch implementation is not configured.");
  }

  return fetchImpl;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeUser(row = {}) {
  return {
    user_id: row.user_id || row.id || null,
    login_id: row.login_id || row.loginId || "",
    display_name: row.display_name || row.displayName || "",
    role_code: row.role_code || row.roleCode || "",
    active: Boolean(row.active),
    created_at: row.created_at || row.createdAt || null,
    updated_at: row.updated_at || row.updatedAt || null,
  };
}

async function requestUsers(options = {}, fetchImpl) {
  const fetcher = getFetchImpl(fetchImpl);
  const response = await fetcher(USERS_ENDPOINT, {
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
      payload?.error?.message || "User management request failed."
    );
    error.status = response.status;
    error.code = payload?.error?.code || "USER_ADMIN_REQUEST_FAILED";
    error.details = payload?.error?.details || null;
    throw error;
  }

  return payload;
}

export async function fetchAuthUsers(fetchImpl) {
  const payload = await requestUsers(
    {
      method: "GET",
    },
    fetchImpl
  );

  return {
    users: (payload?.data?.users || payload?.users || []).map(normalizeUser),
  };
}

export async function updateAuthUser(
  { userId, user_id, displayName, display_name, roleCode, role_code, active },
  fetchImpl
) {
  const payload = {
    user_id: userId || user_id,
  };

  if (displayName !== undefined || display_name !== undefined) {
    payload.display_name = displayName ?? display_name;
  }

  if (roleCode !== undefined || role_code !== undefined) {
    payload.role_code = roleCode ?? role_code;
  }

  if (active !== undefined) {
    payload.active = active;
  }

  const result = await requestUsers(
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    fetchImpl
  );

  return {
    user: normalizeUser(result?.data?.user || result?.user || {}),
  };
}

export const authUserAdminRepository = {
  fetchAuthUsers,
  updateAuthUser,
};
