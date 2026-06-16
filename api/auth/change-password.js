import {
  APP_LOGIN_USERS_TABLE,
  APP_SESSION_COOKIE,
  buildExpiredSessionCookie,
  createPasswordHash,
  error,
  getServerSupabaseClient,
  invalidCredentials,
  ok,
  readBody,
  readCookie,
  sanitizeUser,
  validateNewPasswordPolicy,
  verifyPasswordHash,
  verifySession,
} from "./_utils.js";

function readPasswordField(body, snakeKey, camelKey) {
  return String(body?.[snakeKey] ?? body?.[camelKey] ?? "");
}

async function findActiveUserById(client, userId) {
  const { data, error: queryError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .select("user_id, login_id, display_name, role_code, password_hash, active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (queryError) {
    throw queryError;
  }

  return data || null;
}

async function updatePasswordHash(client, userId, passwordHash) {
  const { data, error: updateError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("active", true)
    .select("user_id, login_id, display_name, role_code, active")
    .maybeSingle();

  if (updateError) {
    throw updateError;
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

  const currentPassword = readPasswordField(
    body,
    "current_password",
    "currentPassword"
  );
  const newPassword = readPasswordField(body, "new_password", "newPassword");
  const confirm = readPasswordField(
    body,
    "new_password_confirm",
    "newPasswordConfirm"
  );
  const validationMessage = validateNewPasswordPolicy({
    currentPassword,
    newPassword,
    newPasswordConfirm: confirm,
  });

  if (validationMessage) {
    error(res, 400, "VALIDATION_ERROR", validationMessage);
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

    if (!row || !verifyPasswordHash(currentPassword, row.password_hash)) {
      invalidCredentials(res);
      return;
    }

    const updatedUser = await updatePasswordHash(
      client,
      payload.user_id,
      createPasswordHash(newPassword)
    );

    if (!updatedUser) {
      invalidCredentials(res);
      return;
    }

    res.setHeader("Set-Cookie", buildExpiredSessionCookie());
    ok(res, {
      user: sanitizeUser(updatedUser),
      reauth_required: true,
    });
  } catch {
    error(res, 500, "INTERNAL_ERROR", "Password change failed.");
  }
}
