import { fetchStandardEffortInput as defaultFetchStandardEffortInput } from "../standardEffortRepository";
import { calculateStandardEffort as defaultCalculateStandardEffort } from "../../shared/lib/standardEffortMath";
import { buildStandardEffortWorkbookOutput as defaultBuildStandardEffortWorkbookOutput } from "../../utils/export/standardEffortWorkbook";
import { buildStandardEffortExportDataFromInput as defaultBuildStandardEffortExportDataFromInput } from "../../utils/export/standardEffortSupabaseExportMapper";

function isMissingValue(value) {
  return value === null || value === undefined || value === "";
}

function toError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }

  return new Error(fallbackMessage);
}

function success(data) {
  return { data, error: null };
}

function failure(error, fallbackMessage) {
  return { data: null, error: toError(error, fallbackMessage) };
}

function resolveProject(input = {}, options = {}) {
  if (options.project) {
    return options.project;
  }

  const projectId = input.projectId ?? input.project_id;
  const projectName = options.projectName ?? input.projectName ?? input.project_name;

  return {
    ...(projectId === null || projectId === undefined || projectId === ""
      ? {}
      : { project_id: projectId }),
    ...(projectName ? { project_name: projectName } : {}),
  };
}

function readInputFromFetchResult(fetchResult) {
  if (fetchResult?.error) {
    throw fetchResult.error;
  }

  return fetchResult?.data ?? fetchResult;
}

function resolveDeps(deps = {}) {
  return {
    fetchStandardEffortInput:
      deps.fetchStandardEffortInput || defaultFetchStandardEffortInput,
    calculateStandardEffort:
      deps.calculateStandardEffort || defaultCalculateStandardEffort,
    buildStandardEffortExportDataFromInput:
      deps.buildStandardEffortExportDataFromInput ||
      defaultBuildStandardEffortExportDataFromInput,
    buildStandardEffortWorkbookOutput:
      deps.buildStandardEffortWorkbookOutput ||
      defaultBuildStandardEffortWorkbookOutput,
  };
}

export function buildStandardEffortSupabaseWorkbookFromInput(
  input,
  options = {},
  deps = {}
) {
  if (isMissingValue(input)) {
    throw new Error("standard effort input is required.");
  }

  const {
    calculateStandardEffort,
    buildStandardEffortExportDataFromInput,
    buildStandardEffortWorkbookOutput,
  } = resolveDeps(deps);
  const results = calculateStandardEffort(input);
  const exportData = buildStandardEffortExportDataFromInput({
    project: resolveProject(input, options),
    input,
    results,
    generatedBy: options.generatedBy,
    generatedAt: options.generatedAt,
    options,
  });
  const workbookOutput = buildStandardEffortWorkbookOutput(exportData, options);

  return {
    exportData,
    ...workbookOutput,
  };
}

export async function prepareStandardEffortSupabaseWorkbookExport(
  projectId,
  options = {},
  deps = {}
) {
  if (isMissingValue(projectId)) {
    return failure(
      null,
      "projectId is required to prepare Supabase standard effort workbook export."
    );
  }

  const { fetchStandardEffortInput } = resolveDeps(deps);
  let input;

  try {
    input = readInputFromFetchResult(
      await fetchStandardEffortInput(projectId, options.client)
    );
  } catch (error) {
    return failure(error, "Failed to fetch Supabase standard effort input.");
  }

  if (isMissingValue(input)) {
    return failure(null, "Supabase standard effort input response is empty.");
  }

  try {
    return success(
      buildStandardEffortSupabaseWorkbookFromInput(input, options, deps)
    );
  } catch (error) {
    return failure(
      error,
      "Failed to build Supabase standard effort workbook output."
    );
  }
}
