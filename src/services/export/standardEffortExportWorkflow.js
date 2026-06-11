import { fetchStandardEffortExportData } from "../exportRepository";
import { buildStandardEffortWorkbookOutput } from "../../utils/export/standardEffortWorkbook";

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

export function buildStandardEffortWorkbookFromExportData(exportData, options = {}) {
  if (isMissingValue(exportData)) {
    return failure(
      null,
      "standard effort export data is required to build a workbook."
    );
  }

  try {
    return success(buildStandardEffortWorkbookOutput(exportData, options));
  } catch (error) {
    return failure(error, "Failed to build standard effort workbook output.");
  }
}

export async function prepareStandardEffortWorkbookExport(
  projectId,
  options = {},
  deps = {}
) {
  if (isMissingValue(projectId)) {
    return failure(
      null,
      "projectId is required to prepare standard effort workbook export."
    );
  }

  const fetchExportData =
    deps.fetchStandardEffortExportData || fetchStandardEffortExportData;
  const buildWorkbookOutput =
    deps.buildStandardEffortWorkbookOutput || buildStandardEffortWorkbookOutput;

  let exportResult;

  try {
    exportResult = await fetchExportData(projectId, options);
  } catch (error) {
    return failure(error, "Failed to fetch standard effort export data.");
  }

  if (exportResult?.error) {
    return failure(
      exportResult.error,
      "Failed to fetch standard effort export data."
    );
  }

  if (isMissingValue(exportResult?.data)) {
    return failure(
      null,
      "standard effort export data response is empty."
    );
  }

  try {
    const workbookOutput = buildWorkbookOutput(exportResult.data, options);

    return success({
      exportData: exportResult.data,
      ...workbookOutput,
    });
  } catch (error) {
    return failure(error, "Failed to build standard effort workbook output.");
  }
}
