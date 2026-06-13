import {
  APP_LOGIN_USERS_TABLE,
  error,
  getServerSupabaseClient,
  invalidCredentials,
  normalizeLoginId,
  ok,
  readBody,
  sanitizeUser,
  signSession,
  verifyPasswordHash,
  buildSessionCookie,
} from "./_utils.js";

async function findActiveUser(client, loginId) {
  const { data, error: queryError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .select(
      "user_id, login_id, display_name, role_code, password_hash, active"
    )
    .eq("login_id", loginId)
    .eq("active", true)
    .maybeSingle();

  if (queryError) {
    throw queryError;
  }

  return data || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    error(res, 405, "METHOD_NOT_ALLOWED", "POST only.");
    return;
  }

  let body;

  try {
    body = await readBody(req);
  } catch {
    error(res, 400, "VALIDATION_ERROR", "Invalid JSON body.");
    return;
  }

  const loginId = normalizeLoginId(body.login_id || body.loginId);
  const password = body.password;

  if (!loginId) {
    error(res, 400, "VALIDATION_ERROR", "login_id is required.");
    return;
  }

  if (!password) {
    error(res, 400, "VALIDATION_ERROR", "password is required.");
    return;
  }

  try {
    const client = getServerSupabaseClient();
    const row = await findActiveUser(client, loginId);

    if (!row || !verifyPasswordHash(password, row.password_hash)) {
      invalidCredentials(res);
      return;
    }

    const user = sanitizeUser(row);
    const token = signSession(user);

    res.setHeader("Set-Cookie", buildSessionCookie(token));
    ok(res, { user });
  } catch {
    error(res, 500, "INTERNAL_ERROR", "Login failed.");
  }
}
