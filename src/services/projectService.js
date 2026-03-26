import { FILE_VERSION, TABLE_NAME } from "../utils/constants";
import { supabase } from "./supabaseClient";

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

  const result = await supabase
    .from(TABLE_NAME)
    .select("id, project_name, updated_at")
    .order("updated_at", { ascending: false });

  return result;
}

export async function fetchProjectById(id) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const result = await supabase
    .from(TABLE_NAME)
    .select("id, project_name, payload, updated_at")
    .eq("id", id)
    .single();

  return result;
}

export async function saveProject({
  projectId,
  activeTab,
  projectName,
  itemsBySolution,
  scaleFactor,
  riskFactor,
  mgmtRate,
  savedAt,
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not initialized.") };
  }

  const payload = toPayload({
    activeTab,
    projectName,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
  });

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