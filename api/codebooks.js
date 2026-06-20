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
} from "./auth/_utils.js";

const COMMON_CODE_TABLE = "common_code";
const USER_SELECT_FIELDS = "user_id, login_id, display_name, role_code, active";
const CODEBOOK_SELECT_FIELDS =
  "id, group_code, code, code_name, code_value, description, sort_order, is_active, created_at, updated_at";
const PATCHABLE_FIELDS = [
  "code_name",
  "code_value",
  "description",
  "sort_order",
  "is_active",
];

function sanitizeCodebookRow(row = {}) {
  return {
    id: row.id,
    group_code: row.group_code || "",
    code: row.code || "",
    code_name: row.code_name || "",
    code_value: row.code_value || "",
    description: row.description || null,
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active !== false,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function findCurrentUser(client, userId) {
  const { data, error: queryError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .select(USER_SELECT_FIELDS)
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

async function findExistingCodebookRow(client, groupCode, code) {
  const { data, error: queryError } = await client
    .from(COMMON_CODE_TABLE)
    .select("id")
    .eq("group_code", groupCode)
    .eq("code", code)
    .maybeSingle();

  if (queryError) {
    throw queryError;
  }

  return data || null;
}

function normalizeSortOrder(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function readCreatePayload(body = {}) {
  const groupCode = String(body.group_code || "").trim();
  const code = String(body.code || "").trim();
  const codeName = String(body.code_name || "").trim();

  if (!groupCode || !code || !codeName) {
    return {
      error: "group_code, code, and code_name are required.",
      payload: null,
    };
  }

  return {
    error: "",
    payload: {
      group_code: groupCode,
      code,
      code_name: codeName,
      code_value:
        code === "00" ? "00" : String(body.code_value ?? "").trim() || code,
      description:
        body.description === null || body.description === undefined
          ? null
          : String(body.description).trim() || null,
      sort_order: normalizeSortOrder(body.sort_order),
      is_active:
        typeof body.is_active === "boolean" ? body.is_active : true,
    },
  };
}

function readPatchPayload(body = {}) {
  const id = String(body.id || "").trim();

  if (!id) {
    return {
      error: "id is required.",
      id: "",
      payload: null,
    };
  }

  const payload = {};

  PATCHABLE_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return;
    }

    if (field === "sort_order") {
      payload.sort_order = normalizeSortOrder(body.sort_order);
      return;
    }

    if (field === "is_active") {
      if (typeof body.is_active !== "boolean") {
        payload.is_active = Boolean(body.is_active);
        return;
      }

      payload.is_active = body.is_active;
      return;
    }

    payload[field] =
      body[field] === null || body[field] === undefined
        ? null
        : String(body[field]).trim();
  });

  if (Object.keys(payload).length === 0) {
    return {
      error: "No codebook changes requested.",
      id,
      payload: null,
    };
  }

  payload.updated_at = new Date().toISOString();

  return {
    error: "",
    id,
    payload,
  };
}

function isDuplicateError(queryError) {
  return queryError?.code === "23505";
}

async function handleGet(req, res, client) {
  const currentUser = await requireAdmin(req, res, client);

  if (!currentUser) {
    return;
  }

  const { data, error: queryError } = await client
    .from(COMMON_CODE_TABLE)
    .select(CODEBOOK_SELECT_FIELDS)
    .order("group_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (queryError) {
    throw queryError;
  }

  ok(res, {
    rows: (data || []).map(sanitizeCodebookRow),
  });
}

async function handlePost(req, res, client) {
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

  const { error: validationMessage, payload } = readCreatePayload(body);

  if (validationMessage) {
    error(res, 400, "VALIDATION_ERROR", validationMessage);
    return;
  }

  const existingRow = await findExistingCodebookRow(
    client,
    payload.group_code,
    payload.code
  );

  if (existingRow) {
    error(res, 409, "CONFLICT", "Codebook row already exists.");
    return;
  }

  const { data, error: insertError } = await client
    .from(COMMON_CODE_TABLE)
    .insert(payload)
    .select(CODEBOOK_SELECT_FIELDS)
    .single();

  if (insertError) {
    if (isDuplicateError(insertError)) {
      error(res, 409, "CONFLICT", "Codebook row already exists.");
      return;
    }

    throw insertError;
  }

  ok(res, {
    row: sanitizeCodebookRow(data),
  });
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

  const { error: validationMessage, id, payload } = readPatchPayload(body);

  if (validationMessage) {
    error(res, 400, "VALIDATION_ERROR", validationMessage);
    return;
  }

  const { data, error: updateError } = await client
    .from(COMMON_CODE_TABLE)
    .update(payload)
    .eq("id", id)
    .select(CODEBOOK_SELECT_FIELDS)
    .maybeSingle();

  if (updateError) {
    if (isDuplicateError(updateError)) {
      error(res, 409, "CONFLICT", "Codebook row already exists.");
      return;
    }

    throw updateError;
  }

  if (!data) {
    error(res, 404, "NOT_FOUND", "Codebook row not found.");
    return;
  }

  ok(res, {
    row: sanitizeCodebookRow(data),
  });
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    error(res, 405, "METHOD_NOT_ALLOWED", "GET, POST, or PATCH only.");
    return;
  }

  try {
    const client = getServerSupabaseClient();

    if (req.method === "GET") {
      await handleGet(req, res, client);
      return;
    }

    if (req.method === "POST") {
      await handlePost(req, res, client);
      return;
    }

    await handlePatch(req, res, client);
  } catch {
    error(res, 500, "INTERNAL_ERROR", "Codebook request failed.");
  }
}
