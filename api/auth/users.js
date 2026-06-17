import {
  APP_LOGIN_USERS_TABLE,
  APP_SESSION_COOKIE,
  error,
  getServerSupabaseClient,
  invalidCredentials,
  ok,
  readBody,
  readCookie,
  verifySession,
} from "./_utils.js";

const USER_SELECT_FIELDS =
  "user_id, login_id, display_name, role_code, active, created_at, updated_at";
const CURRENT_USER_SELECT_FIELDS =
  "user_id, login_id, display_name, role_code, active";
const ROLE_CODES = new Set(["admin", "sales", "viewer"]);

function sanitizeAdminUser(row = {}) {
  return {
    user_id: row.user_id,
    login_id: row.login_id,
    display_name: row.display_name || "",
    role_code: row.role_code,
    active: Boolean(row.active),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function findCurrentUser(client, userId) {
  const { data, error: queryError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .select(CURRENT_USER_SELECT_FIELDS)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (queryError) {
    throw queryError;
  }

  return data || null;
}

async function requireAdmin(req, res, client) {
  const token = readCookie(req, APP_SESSION_COOKIE);
  const payload = verifySession(token);

  if (!payload?.user_id) {
    invalidCredentials(res);
    return null;
  }

  const currentUser = await findCurrentUser(client, payload.user_id);

  if (!currentUser) {
    invalidCredentials(res);
    return null;
  }

  if (currentUser.role_code !== "admin") {
    error(res, 403, "FORBIDDEN", "Admin permission is required.");
    return null;
  }

  return currentUser;
}

async function handleGet(req, res, client) {
  const currentUser = await requireAdmin(req, res, client);

  if (!currentUser) {
    return;
  }

  const query = client
    .from(APP_LOGIN_USERS_TABLE)
    .select(USER_SELECT_FIELDS);
  const { data, error: queryError } =
    typeof query.order === "function"
      ? await query.order("login_id", { ascending: true })
      : await query;

  if (queryError) {
    throw queryError;
  }

  ok(res, {
    users: (data || []).map(sanitizeAdminUser),
  });
}

function readPatchPayload(body = {}, currentUser) {
  const userId = String(body.user_id || body.userId || "").trim();

  if (!userId) {
    return {
      error: "user_id is required.",
      updatePayload: null,
      userId: "",
    };
  }

  const updatePayload = {};

  if (Object.prototype.hasOwnProperty.call(body, "display_name")) {
    const displayName = String(body.display_name ?? "").trim();

    if (!displayName) {
      return {
        error: "display_name must not be empty.",
        updatePayload: null,
        userId,
      };
    }

    updatePayload.display_name = displayName;
  }

  if (Object.prototype.hasOwnProperty.call(body, "role_code")) {
    const roleCode = String(body.role_code || "").trim();

    if (!ROLE_CODES.has(roleCode)) {
      return {
        error: "role_code must be one of admin, sales, viewer.",
        updatePayload: null,
        userId,
      };
    }

    if (userId === currentUser.user_id && roleCode !== currentUser.role_code) {
      return {
        error: "You cannot change your own role_code.",
        updatePayload: null,
        userId,
      };
    }

    updatePayload.role_code = roleCode;
  }

  if (Object.prototype.hasOwnProperty.call(body, "active")) {
    if (typeof body.active !== "boolean") {
      return {
        error: "active must be a boolean.",
        updatePayload: null,
        userId,
      };
    }

    if (userId === currentUser.user_id && body.active === false) {
      return {
        error: "You cannot lock your own account.",
        updatePayload: null,
        userId,
      };
    }

    updatePayload.active = body.active;
  }

  if (Object.keys(updatePayload).length === 0) {
    return {
      error: "No user changes requested.",
      updatePayload: null,
      userId,
    };
  }

  updatePayload.updated_at = new Date().toISOString();

  return {
    error: "",
    updatePayload,
    userId,
  };
}

async function handlePatch(req, res, client) {
  let body;

  try {
    body = await readBody(req);
  } catch {
    error(res, 400, "VALIDATION_ERROR", "Invalid JSON body.");
    return;
  }

  const currentUser = await requireAdmin(req, res, client);

  if (!currentUser) {
    return;
  }

  const { error: validationMessage, updatePayload, userId } = readPatchPayload(
    body,
    currentUser
  );

  if (validationMessage) {
    error(res, 400, "VALIDATION_ERROR", validationMessage);
    return;
  }

  const { data, error: updateError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .update(updatePayload)
    .eq("user_id", userId)
    .select(USER_SELECT_FIELDS)
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!data) {
    error(res, 404, "NOT_FOUND", "User not found.");
    return;
  }

  ok(res, {
    user: sanitizeAdminUser(data),
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    error(res, 405, "METHOD_NOT_ALLOWED", "GET or PATCH only.");
    return;
  }

  try {
    const client = getServerSupabaseClient();

    if (req.method === "GET") {
      await handleGet(req, res, client);
      return;
    }

    await handlePatch(req, res, client);
  } catch {
    error(res, 500, "INTERNAL_ERROR", "User management request failed.");
  }
}
