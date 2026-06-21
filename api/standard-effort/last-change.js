import {
  APP_LOGIN_USERS_TABLE,
  APP_SESSION_COOKIE,
  error,
  getServerSupabaseClient,
  invalidCredentials,
  ok,
  readCookie,
  verifySession,
} from "../auth/_utils.js";

const USER_SELECT_FIELDS = "user_id, login_id, display_name, role_code, active";
const UPDATER_SELECT_FIELDS = "user_id, login_id, display_name";
const PROJECT_SOLUTION_TABLE = "estimation_project_solution_selection";
const PROJECT_ITEM_TABLE = "estimation_project_item_solution_selection";

function getProjectId(req) {
  const url = new URL(req.url || "", "http://localhost");
  return String(url.searchParams.get("project_id") || "").trim();
}

function sanitizeLastChange(row = {}, updater = null, projectId) {
  return {
    project_id: row.project_id ?? projectId,
    updated_at: row.updated_at || null,
    updated_by: row.updated_by || null,
    updated_by_login_id: updater?.login_id || null,
    updated_by_display_name: updater?.display_name || null,
    source: row.source || null,
  };
}

function compareUpdatedAt(left = {}, right = {}) {
  const leftTime = new Date(left.updated_at || 0).getTime();
  const rightTime = new Date(right.updated_at || 0).getTime();
  const safeLeftTime = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRightTime = Number.isFinite(rightTime) ? rightTime : 0;

  return safeLeftTime - safeRightTime;
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

async function requireActiveSession(req, res, client) {
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

  return currentUser;
}

async function fetchLatestRow(client, table, projectId, source) {
  const query = client
    .from(table)
    .select("project_id, updated_at, updated_by")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  const { data, error: queryError } =
    typeof query.limit === "function"
      ? await query.limit(1).maybeSingle()
      : await query.maybeSingle();

  if (queryError) {
    throw queryError;
  }

  return data ? { ...data, source } : null;
}

async function findUpdater(client, userId) {
  if (!userId) {
    return null;
  }

  const { data, error: queryError } = await client
    .from(APP_LOGIN_USERS_TABLE)
    .select(UPDATER_SELECT_FIELDS)
    .eq("user_id", userId)
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

  const projectId = getProjectId(req);

  if (!projectId) {
    error(res, 400, "VALIDATION_ERROR", "project_id is required.");
    return;
  }

  try {
    const client = getServerSupabaseClient();
    const currentUser = await requireActiveSession(req, res, client);

    if (!currentUser) {
      return;
    }

    const [solutionRow, itemRow] = await Promise.all([
      fetchLatestRow(
        client,
        PROJECT_SOLUTION_TABLE,
        projectId,
        "project_solution_selection"
      ),
      fetchLatestRow(
        client,
        PROJECT_ITEM_TABLE,
        projectId,
        "project_item_solution_selection"
      ),
    ]);
    const latestRow = [solutionRow, itemRow]
      .filter(Boolean)
      .sort((left, right) => compareUpdatedAt(right, left))[0];

    if (!latestRow) {
      ok(res, sanitizeLastChange({}, null, projectId));
      return;
    }

    const updater = await findUpdater(client, latestRow.updated_by);

    ok(res, sanitizeLastChange(latestRow, updater, projectId));
  } catch {
    error(
      res,
      500,
      "INTERNAL_ERROR",
      "Standard effort last-change request failed."
    );
  }
}
