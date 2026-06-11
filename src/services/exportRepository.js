import { getExportAdapter } from "./adapters/exportAdapterFactory";

export async function fetchStandardEffortExportData(projectId, options) {
  return getExportAdapter().fetchStandardEffortExportData(projectId, options);
}

export async function fetchLegacyExportData(projectId, options) {
  return getExportAdapter().fetchLegacyExportData(projectId, options);
}

export async function downloadStandardEffortExport(projectId, options) {
  return getExportAdapter().downloadStandardEffortExport(projectId, options);
}

export async function downloadLegacyExport(projectId, options) {
  return getExportAdapter().downloadLegacyExport(projectId, options);
}
