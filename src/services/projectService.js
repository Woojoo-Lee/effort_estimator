import { FILE_VERSION, TABLE_NAME } from "../shared/constants/constants";
import { supabase } from "./supabaseClient";

const VERSION_TABLE_NAME = "estimation_project_versions";

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

export async function fetchProjects() {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  return await supabase
    .from(TABLE_NAME)
    .select("id, project_name, updated_at")
    .order("updated_at", { ascending: false });
}

export async function fetchProjectById(id) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  return await supabase
    .from(TABLE_NAME)
    .select("id, project_name, payload, updated_at")
    .eq("id", id)
    .single();
}

export async function saveProject({
  projectId,
  projectName,
  payload,
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const rowData = {
    project_name: projectName,
    payload,
  };

  if (projectId) {
    return await supabase
      .from(TABLE_NAME)
      .update(rowData)
      .eq("id", projectId)
      .select("id, updated_at")
      .single();
  }

  return await supabase
    .from(TABLE_NAME)
    .insert(rowData)
    .select("id, updated_at")
    .single();
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

  return await supabase
    .from("common_code")
    .insert(payload)
    .select("*")
    .single();
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
