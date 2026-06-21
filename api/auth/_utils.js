import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

export const APP_SESSION_COOKIE = "effort_app_session";
export const APP_LOGIN_USERS_TABLE = "app_login_users";
export const DEFAULT_PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MIN_LENGTH_FLOOR = 4;
export const PASSWORD_MIN_LENGTH_CEILING = 128;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const INVALID_CREDENTIALS_MESSAGE =
  "사용자 ID 또는 비밀번호를 확인하세요.";

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeLoginId(value) {
  return String(value || "").trim().toLowerCase();
}

export function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function ok(res, data = {}) {
  json(res, 200, {
    ok: true,
    data,
    meta: {
      request_id: null,
    },
  });
}

export function error(res, status, code, message, details = {}) {
  json(res, status, {
    ok: false,
    error: {
      code,
      message,
      details,
      request_id: null,
    },
  });
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

export function getServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server Supabase env is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSessionSecret() {
  const secret = process.env.APP_AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("APP_AUTH_SESSION_SECRET must be configured.");
  }

  return secret;
}

export function createPasswordHash(password, options = {}) {
  const iterations = options.iterations || 310000;
  const salt = options.salt || crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(String(password), salt, iterations, 32, "sha256")
    .toString("base64url");

  return `pbkdf2$sha256$${iterations}$${salt}$${hash}`;
}

export function verifyPasswordHash(password, passwordHash) {
  const [algorithm, digest, iterationsText, salt, expectedHash] = String(
    passwordHash || ""
  ).split("$");

  if (algorithm !== "pbkdf2" || digest !== "sha256") {
    return false;
  }

  const iterations = Number(iterationsText);

  if (!Number.isInteger(iterations) || iterations <= 0 || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto
    .pbkdf2Sync(String(password), salt, iterations, 32, digest)
    .toString("base64url");

  return safeEqual(actualHash, expectedHash);
}

export function getPasswordMinLength(env = process.env) {
  const rawValue = env?.APP_AUTH_PASSWORD_MIN_LENGTH;
  const parsedValue = Number(rawValue);

  if (!rawValue || !Number.isFinite(parsedValue)) {
    return DEFAULT_PASSWORD_MIN_LENGTH;
  }

  const integerValue = Math.trunc(parsedValue);

  if (integerValue < PASSWORD_MIN_LENGTH_FLOOR) {
    return PASSWORD_MIN_LENGTH_FLOOR;
  }

  if (integerValue > PASSWORD_MIN_LENGTH_CEILING) {
    return PASSWORD_MIN_LENGTH_CEILING;
  }

  return integerValue;
}

export function validateNewPasswordPolicy(
  { currentPassword, newPassword, newPasswordConfirm },
  env = process.env
) {
  if (!currentPassword) {
    return "current_password is required.";
  }

  if (!newPassword) {
    return "new_password is required.";
  }

  const minLength = getPasswordMinLength(env);

  if (newPassword.length < minLength) {
    return `new_password must be at least ${minLength} characters.`;
  }

  if (!newPasswordConfirm) {
    return "new_password_confirm is required.";
  }

  if (newPassword !== newPasswordConfirm) {
    return "new_password_confirm does not match.";
  }

  if (newPassword === currentPassword) {
    return "new_password must be different from current_password.";
  }

  return "";
}

export function sanitizeUser(row = {}) {
  const roleCode = row.role_code || null;

  return {
    user_id: row.user_id,
    login_id: normalizeLoginId(row.login_id),
    display_name: row.display_name || normalizeLoginId(row.login_id),
    role_code: roleCode,
    role_codes: roleCode ? [roleCode] : [],
  };
}

export function signSession(user, now = Date.now()) {
  const secret = getSessionSecret();
  const payload = {
    user_id: user.user_id,
    login_id: user.login_id,
    display_name: user.display_name,
    role_code: user.role_code,
    role_codes: user.role_codes || (user.role_code ? [user.role_code] : []),
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySession(token, now = Date.now()) {
  const [encodedPayload, signature] = String(token || "").split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const nowSeconds = Math.floor(now / 1000);

    if (!payload.exp || payload.exp < nowSeconds) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function readCookie(req, name) {
  const cookieHeader = req.headers?.cookie || "";
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return "";
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function buildSessionCookie(token) {
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  const parts = [
    `${APP_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function buildExpiredSessionCookie() {
  return [
    `${APP_SESSION_COOKIE}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

export function invalidCredentials(res) {
  error(res, 401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
}
