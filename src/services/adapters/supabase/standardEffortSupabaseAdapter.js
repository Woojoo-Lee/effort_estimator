import { supabase } from "../../supabaseClient";
import {
  buildStandardEffortInput,
  normalizeBaseEffortRow,
  normalizeCoefficientRow,
  normalizeProjectItemSelection,
  normalizeProjectSolutionSelection,
  normalizeSolutionVariant,
  normalizeStandardItemRow,
  toNumberOrZero,
} from "../../../shared/lib/standardEffortMapper";

const TABLES = {
  solutions: "estimation_solution",
  solutionVariants: "estimation_solution_variant",
  baseEffort: "estimation_standard_base_effort_meta",
  items: "estimation_standard_item_meta",
  coefficients: "estimation_item_solution_coefficient_meta",
  projectSolutions: "estimation_project_solution_selection",
  projectItems: "estimation_project_item_solution_selection",
};

function getClient(client) {
  const dbClient = client || supabase;

  if (!dbClient) {
    throw new Error("Supabase client not initialized.");
  }

  return dbClient;
}

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

function normalizeSolution(row = {}) {
  return {
    solution_code: row.solution_code,
    solution_name: row.solution_name,
    display_order: toNumberOrZero(row.display_order),
    active: row.active !== false && row.is_active !== false,
  };
}

function withProjectId(projectId, row) {
  return {
    ...row,
    project_id: projectId,
  };
}

function withUpdatedAt(row, updatedAt) {
  return {
    ...row,
    updated_at: updatedAt,
  };
}

export async function fetchStandardEffortMeta(client) {
  const db = getClient(client);
  const [
    solutionsResult,
    variantsResult,
    baseEffortResult,
    itemsResult,
    coefficientsResult,
  ] = await Promise.all([
    db
      .from(TABLES.solutions)
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("solution_code", { ascending: true }),
    db
      .from(TABLES.solutionVariants)
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("solution_code", { ascending: true })
      .order("variant_code", { ascending: true }),
    db
      .from(TABLES.baseEffort)
      .select("*")
      .eq("active", true)
      .order("solution_variant_id", { ascending: true })
      .order("display_order", { ascending: true })
      .order("phase_code", { ascending: true }),
    db
      .from(TABLES.items)
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("excel_row_no", { ascending: true }),
    db
      .from(TABLES.coefficients)
      .select("*")
      .eq("active", true)
      .order("item_id", { ascending: true })
      .order("solution_variant_id", { ascending: true }),
  ]);

  [
    solutionsResult,
    variantsResult,
    baseEffortResult,
    itemsResult,
    coefficientsResult,
  ].forEach((result) => throwIfError(result.error));

  return {
    solutions: (solutionsResult.data || []).map(normalizeSolution),
    solutionVariants: (variantsResult.data || []).map(normalizeSolutionVariant),
    baseEffortRows: (baseEffortResult.data || []).map(normalizeBaseEffortRow),
    itemRows: (itemsResult.data || []).map(normalizeStandardItemRow),
    coefficientRows: (coefficientsResult.data || []).map(
      normalizeCoefficientRow
    ),
  };
}

export async function fetchProjectStandardSelections(projectId, client) {
  const db = getClient(client);
  const [projectSolutionsResult, projectItemsResult] = await Promise.all([
    db
      .from(TABLES.projectSolutions)
      .select("*")
      .eq("project_id", projectId)
      .order("solution_variant_id", { ascending: true }),
    db
      .from(TABLES.projectItems)
      .select("*")
      .eq("project_id", projectId)
      .order("solution_variant_id", { ascending: true })
      .order("item_id", { ascending: true }),
  ]);

  throwIfError(projectSolutionsResult.error);
  throwIfError(projectItemsResult.error);

  return {
    projectSolutionSelections: (projectSolutionsResult.data || []).map(
      normalizeProjectSolutionSelection
    ),
    projectItemSelections: (projectItemsResult.data || []).map(
      normalizeProjectItemSelection
    ),
  };
}

export async function fetchStandardEffortInput(projectId, client) {
  const db = getClient(client);
  const [meta, selections] = await Promise.all([
    fetchStandardEffortMeta(db),
    fetchProjectStandardSelections(projectId, db),
  ]);

  return buildStandardEffortInput({
    projectId,
    meta,
    selections,
  });
}

export async function upsertProjectSolutionSelections(
  projectId,
  selections = [],
  client
) {
  const nowIso = new Date().toISOString();
  const rows = selections.map((selection) =>
    withUpdatedAt(
      normalizeProjectSolutionSelection(withProjectId(projectId, selection)),
      nowIso
    )
  );

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await getClient(client)
    .from(TABLES.projectSolutions)
    .upsert(rows, { onConflict: "project_id,solution_variant_id" })
    .select("*");

  throwIfError(error);

  return (data || []).map(normalizeProjectSolutionSelection);
}

export async function upsertProjectItemSelections(
  projectId,
  selections = [],
  client
) {
  const nowIso = new Date().toISOString();
  const rows = selections.map((selection) =>
    withUpdatedAt(
      normalizeProjectItemSelection(withProjectId(projectId, selection)),
      nowIso
    )
  );

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await getClient(client)
    .from(TABLES.projectItems)
    .upsert(rows, { onConflict: "project_id,solution_variant_id,item_id" })
    .select("*");

  throwIfError(error);

  return (data || []).map(normalizeProjectItemSelection);
}

export async function updateProjectActualEffort(
  projectId,
  solutionVariantId,
  actualEffortMm,
  client
) {
  const db = getClient(client);
  const nowIso = new Date().toISOString();
  const actual_effort_mm = toNumberOrZero(actualEffortMm);
  const updateResult = await db
    .from(TABLES.projectSolutions)
    .update({ actual_effort_mm, updated_at: nowIso })
    .eq("project_id", projectId)
    .eq("solution_variant_id", solutionVariantId)
    .select("*");

  throwIfError(updateResult.error);

  if ((updateResult.data || []).length > 0) {
    return normalizeProjectSolutionSelection(updateResult.data[0]);
  }

  const insertResult = await db
    .from(TABLES.projectSolutions)
    .insert({
      project_id: projectId,
      solution_variant_id: solutionVariantId,
      enabled: true,
      actual_effort_mm,
      updated_at: nowIso,
    })
    .select("*")
    .single();

  throwIfError(insertResult.error);

  return normalizeProjectSolutionSelection(insertResult.data);
}
