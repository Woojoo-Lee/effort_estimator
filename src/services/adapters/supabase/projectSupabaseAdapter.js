import {
  FILE_VERSION,
  TABLE_NAME,
  VERSION_TABLE_NAME,
} from "../../../shared/constants/constants";
import { supabase } from "../../supabaseClient";

export function toPayload({
  activeTab,
  projectName,
  itemsBySolution,
  scaleFactor,
  riskFactor,
  mgmtRate,
  savedAt,
}) {
  return {
    fileVersion: FILE_VERSION,
    activeTab,
    projectName,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
  };
}

function getCurrentUserId(currentUser = {}) {
  return (
    currentUser.user_id ||
    currentUser.userId ||
    currentUser.id ||
    currentUser.sub ||
    null
  );
}

function getCurrentUserLoginId(currentUser = {}) {
  return currentUser.login_id || currentUser.loginId || null;
}

function getCurrentUserDisplayName(currentUser = {}) {
  return currentUser.display_name || currentUser.displayName || null;
}

function mergeUpdatedByMetadata(payload = {}, options = {}) {
  const currentUser = options.currentUser || options.user || {};
  const currentUserId = getCurrentUserId(currentUser);
  const loginId = getCurrentUserLoginId(currentUser);
  const displayName = getCurrentUserDisplayName(currentUser);

  return {
    ...payload,
    ...(currentUserId ? { updated_by: currentUserId } : {}),
    ...(loginId ? { updated_by_login_id: loginId } : {}),
    ...(displayName ? { updated_by_display_name: displayName } : {}),
  };
}

function getProjectLifecycleStatus(project = {}) {
  const payload =
    project.payload && typeof project.payload === "object"
      ? project.payload
      : {};
  const status = project.status || payload.status;
  const archivedAt = project.archived_at || payload.archived_at;

  if (status === "archived" || archivedAt) {
    return "archived";
  }

  return "active";
}

function normalizeProjectLifecycle(project = {}) {
  const payload =
    project.payload && typeof project.payload === "object"
      ? project.payload
      : {};
  const status = getProjectLifecycleStatus(project);

  return {
    ...project,
    status,
    archived_at: project.archived_at ?? payload.archived_at ?? null,
    archived_by: project.archived_by ?? payload.archived_by ?? null,
    archive_reason: project.archive_reason ?? payload.archive_reason ?? null,
  };
}

function filterProjectsByStatus(projects = [], options = {}) {
  const normalizedProjects = projects.map(normalizeProjectLifecycle);

  if (options.includeArchived === true) {
    return normalizedProjects;
  }

  const status = options.status || "active";

  if (status === "archived" || status === "active") {
    return normalizedProjects.filter(
      (project) => getProjectLifecycleStatus(project) === status
    );
  }

  return normalizedProjects;
}

function createArchivePayload(project = {}, options = {}) {
  const payload =
    project.payload && typeof project.payload === "object"
      ? project.payload
      : {};
  const archivedAt = new Date().toISOString();
  const archivedBy = getCurrentUserId(options.currentUser || options.user);

  return mergeUpdatedByMetadata({
    ...payload,
    status: "archived",
    archived_at: archivedAt,
    archived_by: archivedBy,
    archive_reason: options.archiveReason || options.archive_reason || null,
  }, options);
}

function createRestorePayload(project = {}, options = {}) {
  const payload =
    project.payload && typeof project.payload === "object"
      ? project.payload
      : {};
  const restoredBy = getCurrentUserId(options.currentUser || options.user);

  return mergeUpdatedByMetadata({
    ...payload,
    status: "active",
    archived_at: null,
    archived_by: null,
    archive_reason: null,
    restored_at: new Date().toISOString(),
    restored_by: restoredBy,
  }, options);
}

async function updateProjectPayload(projectId, payload) {
  return await supabase
    .from(TABLE_NAME)
    .update({ payload })
    .eq("id", projectId)
    .select("id, project_name, payload, updated_at")
    .single();
}

export async function fetchProjects(options = {}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, project_name, payload, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return { data, error };
  }

  return {
    data: filterProjectsByStatus(data || [], options),
    error: null,
  };
}

export async function fetchProjectById(id) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, project_name, payload, updated_at")
    .eq("id", id)
    .single();

  return {
    data: data ? normalizeProjectLifecycle(data) : data,
    error,
  };
}

export async function saveProject({ projectId, projectName, payload }) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const rowData = {
    project_name: projectName,
    payload,
  };

  if (projectId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(rowData)
      .eq("id", projectId)
      .select("id, project_name, payload, updated_at")
      .single();

    return {
      data: data ? normalizeProjectLifecycle(data) : data,
      error,
    };
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(rowData)
    .select("id, project_name, payload, updated_at")
    .single();

  return {
    data: data ? normalizeProjectLifecycle(data) : data,
    error,
  };
}

export async function deleteProjectById(projectId, options = {}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const { data: project, error: fetchError } = await fetchProjectById(projectId);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  const { data, error } = await updateProjectPayload(
    projectId,
    createArchivePayload(project, options)
  );

  return {
    data: data ? normalizeProjectLifecycle(data) : data,
    error,
  };
}

export async function restoreProjectById(projectId, options = {}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const { data: project, error: fetchError } = await fetchProjectById(projectId);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  const { data, error } = await updateProjectPayload(
    projectId,
    createRestorePayload(project, options)
  );

  return {
    data: data ? normalizeProjectLifecycle(data) : data,
    error,
  };
}

export async function saveProjectVersion({
  projectId,
  versionNo,
  savedType = "manual",
  projectName,
  payload,
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const { data, error } = await supabase
    .from(VERSION_TABLE_NAME)
    .insert([
      {
        project_id: projectId,
        version_no: versionNo,
        saved_type: savedType,
        project_name: projectName,
        payload,
      },
    ])
    .select()
    .single();

  return { data, error };
}

export async function fetchProjectVersions(projectId) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const { data, error } = await supabase
    .from(VERSION_TABLE_NAME)
    .select("*")
    .eq("project_id", projectId)
    .order("version_no", { ascending: false });

  return { data, error };
}

export async function fetchLatestProjectVersionNo(projectId) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const { data, error } = await supabase
    .from(VERSION_TABLE_NAME)
    .select("version_no")
    .eq("project_id", projectId)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function fetchCommonCodes() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return supabase.from("common_code").select("*").eq("is_active", true);
}

export async function fetchEstimationItemMeta() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return supabase.from("estimation_item_meta").select("*").eq("is_active", true);
}

export async function fetchEstimationItemMetaRows() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return await supabase
    .from("estimation_item_meta")
    .select("*")
    .order("solution_code", { ascending: true })
    .order("id", { ascending: true });
}

export async function fetchEstimationBaseEffortMeta() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return await supabase
    .from("estimation_base_effort_meta")
    .select("*")
    .order("solution_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("phase_code", { ascending: true });
}

export async function fetchEstimationItemFieldMeta() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return await supabase
    .from("estimation_item_field_meta")
    .select("*")
    .order("solution_code", { ascending: true })
    .order("item_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("field_key", { ascending: true });
}

export async function fetchEstimationEnvVarMeta() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return await supabase
    .from("estimation_env_var_meta")
    .select("*")
    .order("solution_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("var_key", { ascending: true });
}

export async function fetchEstimationCalculationMeta() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return await supabase
    .from("estimation_calculation_meta")
    .select("*")
    .order("solution_code", { ascending: true })
    .order("item_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("method", { ascending: true });
}

export async function fetchEstimationPolicy() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return supabase.from("estimation_policy").select("*").eq("is_active", true);
}

export async function fetchCommonCodeRows() {
  if (!supabase) {
    return { data: [], error: null };
  }

  return await supabase
    .from("common_code")
    .select("*")
    .order("group_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });
}

export async function createCommonCodeRow(payload) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  return await supabase.from("common_code").insert(payload).select("*").single();
}

export async function updateCommonCodeRow(id, payload) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  return await supabase
    .from("common_code")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
}

export async function updateCommonCodeActive(id, isActive) {
  return updateCommonCodeRow(id, { is_active: isActive });
}
