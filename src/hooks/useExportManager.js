import { useCallback } from "react";
import * as XLSX from "xlsx";

import { downloadFile } from "../utils/io/downloadFile";
import { readJsonFile } from "../utils/io/readJsonFile";
import { buildProjectExportPayload } from "../utils/export/buildProjectExportPayload";
import { mapEstimatorToExcelRows } from "../utils/export/mapEstimatorToExcelRows";
import { validateImportData } from "../utils/import/validateImportData";
import { normalizeImportData } from "../utils/import/normalizeImportData";
import { useEstimatorStore } from "../store/useEstimatorStore";
import { resolveStandardEffortMode } from "../features/estimator/lib/standardEffortMode";
import { isApiBackend, resolveDataBackend } from "../services/dataBackend";
import { downloadStandardEffortWorkbookExport as defaultDownloadStandardEffortWorkbookExport } from "../services/export/standardEffortExportDownload";
import { downloadStandardEffortSupabaseWorkbookExport as defaultDownloadStandardEffortSupabaseWorkbookExport } from "../services/export/standardEffortSupabaseExportDownload";

function buildJsonFilename(projectName) {
  const safeName = (projectName || "contact-center-estimate").trim();
  return `${safeName}.json`;
}

function buildExcelFilename(projectName) {
  const safeName = (projectName || "contact-center-estimate").trim();
  return `${safeName}.xlsx`;
}

function getRuntimeEnv(env) {
  return env || import.meta.env || {};
}

function getStandardEffortExportProjectId(projectState = {}, calcState = {}) {
  return (
    projectState.projectId ??
    projectState.currentProject?.id ??
    projectState.project?.id ??
    calcState.projectId ??
    null
  );
}

function buildExportError(message) {
  return {
    data: null,
    error: new Error(message),
  };
}

export function useExportManager({
  projectState,
  calcState,
  setters,
  env,
  downloadStandardEffortWorkbookExport = defaultDownloadStandardEffortWorkbookExport,
  downloadStandardEffortSupabaseWorkbookExport = defaultDownloadStandardEffortSupabaseWorkbookExport,
}) {
  const showToast = useEstimatorStore((s) => s.showToast);

  const downloadJson = useCallback(() => {
    try {
      const payload = buildProjectExportPayload({
        projectState,
        calcState,
      });

      const jsonText = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonText], {
        type: "application/json;charset=utf-8",
      });

      downloadFile(blob, buildJsonFilename(projectState.projectName));
      showToast("JSON 내보내기 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("JSON 내보내기 실패", "red");
    }
  }, [projectState, calcState, showToast]);

  const downloadExcel = useCallback(() => {
    const resolvedEnv = getRuntimeEnv(env);
    const standardEffortMode = resolveStandardEffortMode(resolvedEnv);

    if (standardEffortMode.isStandardMode) {
      return (async () => {
        const backendConfig = resolveDataBackend(resolvedEnv);
        const projectId = getStandardEffortExportProjectId(projectState, calcState);

        if (!projectId) {
          const message = "내보낼 프로젝트를 먼저 선택하세요.";

          showToast(message, "red");
          return buildExportError(message);
        }

        const downloadStandardEffortExport = isApiBackend(backendConfig)
          ? downloadStandardEffortWorkbookExport
          : downloadStandardEffortSupabaseWorkbookExport;

        try {
          const result = await downloadStandardEffortExport(
            projectId,
            {
              includeCheckedItems: true,
            }
          );

          if (result?.error) {
            console.error(result.error);
            showToast("표준공수 내보내기에 실패했습니다.", "red");
            return result;
          }

          showToast("표준공수 내보내기가 완료되었습니다.", "emerald");
          return result;
        } catch (error) {
          console.error(error);
          showToast("표준공수 내보내기에 실패했습니다.", "red");
          return {
            data: null,
            error,
          };
        }
      })();
    }

    try {
      const rows = mapEstimatorToExcelRows({
        projectState,
        calcState,
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Estimate");
      XLSX.writeFile(workbook, buildExcelFilename(projectState.projectName));

      showToast("Excel 내보내기 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("Excel 내보내기 실패", "red");
    }
  }, [
    projectState,
    calcState,
    env,
    downloadStandardEffortWorkbookExport,
    downloadStandardEffortSupabaseWorkbookExport,
    showToast,
  ]);

  const importJson = useCallback(async (file) => {
    try {
      const parsed = await readJsonFile(file);

      const validation = validateImportData(parsed);
      if (!validation.valid) {
        showToast(validation.message, "red");
        return;
      }

      const normalized = normalizeImportData(parsed);

      setters.setProjectId("");
      setters.setProjectName(normalized.projectName);
      setters.setActiveTab(normalized.activeTab);
      setters.setItemsBySolution(normalized.itemsBySolution);
      setters.setScaleFactor(normalized.scaleFactor);
      setters.setRiskFactor(normalized.riskFactor);
      setters.setMgmtRate(normalized.mgmtRate);
      setters.setSavedAt(normalized.savedAt);
      setters.setIsDirty(true);

      showToast("JSON 가져오기 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast(error.message || "JSON 가져오기 실패", "red");
    }
  }, [setters, showToast]);

  return {
    downloadJson,
    downloadExcel,
    importJson,
  };
}
