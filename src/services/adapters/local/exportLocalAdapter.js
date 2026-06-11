function createUnsupportedResult(methodName) {
  return {
    data: null,
    error: new Error(
      `export local adapter method ${methodName} is not connected yet. Existing frontend export still uses useExportManager.`
    ),
  };
}

export async function fetchStandardEffortExportData() {
  return createUnsupportedResult("fetchStandardEffortExportData");
}

export async function fetchLegacyExportData() {
  return createUnsupportedResult("fetchLegacyExportData");
}

export async function downloadStandardEffortExport() {
  return createUnsupportedResult("downloadStandardEffortExport");
}

export async function downloadLegacyExport() {
  return createUnsupportedResult("downloadLegacyExport");
}
