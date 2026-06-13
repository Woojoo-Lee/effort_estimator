import {
  APP_LOGIN_USERS_TABLE,
  APP_SESSION_COOKIE,
  error,
  getServerSupabaseClient,
  invalidCredentials,
  ok,
  readCookie,
  sanitizeUser,
  verifySession,
} from "./_utils.js";

async function findActiveUserById(client, userId) {
  const { data, error: queryError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .select("user_id, login_id, display_name, role_code, active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (queryError) {
    throw queryError;
  }

  return data || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    error(res, 405, "METHOD_NOT_ALLOWED", "GET only.");
    return;
  }

  try {
    const token = readCookie(req, APP_SESSION_COOKIE);
    const payload = verifySession(token);

    if (!payload?.user_id) {
      invalidCredentials(res);
      return;
    }

    const client = getServerSupabaseClient();
    const row = await findActiveUserById(client, payload.user_id);

    if (!row) {
      invalidCredentials(res);
      return;
    }

    ok(res, { user: sanitizeUser(row) });
  } catch {
    error(res, 500, "INTERNAL_ERROR", "Session lookup failed.");
  }
}
