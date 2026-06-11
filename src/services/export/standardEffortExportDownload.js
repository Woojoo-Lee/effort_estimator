import { prepareStandardEffortWorkbookExport } from "./standardEffortExportWorkflow";
import { downloadWorkbookOutput } from "../../utils/export/browserDownload";

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

function getDownloadHelper(deps = {}) {
  return deps.downloadWorkbookOutput || downloadWorkbookOutput;
}

export function downloadPreparedStandardEffortWorkbookOutput(
  workbookOutput,
  options = {},
  deps = {}
) {
  if (!workbookOutput) {
    return failure(
      null,
      "standard effort workbook output is required for download."
    );
  }

  if (isMissingValue(workbookOutput.buffer)) {
    return failure(
      null,
      "standard effort workbook output buffer is required for download."
    );
  }

  try {
    const downloadResult = getDownloadHelper(deps)(workbookOutput, options, deps);

    if (!downloadResult?.ok) {
      return failure(downloadResult?.error, "Standard effort workbook download failed.");
    }

    return success({
      filename: downloadResult.filename || workbookOutput.filename,
    });
  } catch (error) {
    return failure(error, "Standard effort workbook download failed.");
  }
}

export async function downloadStandardEffortWorkbookExport(
  projectId,
  options = {},
  deps = {}
) {
  if (isMissingValue(projectId)) {
    return failure(
      null,
      "projectId is required to download standard effort workbook export."
    );
  }

  const prepareExport =
    deps.prepareStandardEffortWorkbookExport || prepareStandardEffortWorkbookExport;

  let preparedResult;

  try {
    preparedResult = await prepareExport(projectId, options, deps);
  } catch (error) {
    return failure(error, "Failed to prepare standard effort workbook export.");
  }

  if (preparedResult?.error) {
    return failure(
      preparedResult.error,
      "Failed to prepare standard effort workbook export."
    );
  }

  if (isMissingValue(preparedResult?.data)) {
    return failure(
      null,
      "standard effort workbook export output is empty."
    );
  }

  let downloadResult;

  try {
    downloadResult = getDownloadHelper(deps)(preparedResult.data, options, deps);
  } catch (error) {
    return failure(error, "Standard effort workbook download failed.");
  }

  if (!downloadResult?.ok) {
    return failure(downloadResult?.error, "Standard effort workbook download failed.");
  }

  return success({
    filename: downloadResult.filename || preparedResult.data.filename,
    exportData: preparedResult.data.exportData,
    sheets: preparedResult.data.sheets,
  });
}
