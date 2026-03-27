import {
  buildExcelXml,
  downloadExcelFile,
  toExportPayload,
} from "../utils/excelExport";
import { readJsonFile, downloadJsonFile } from "../utils/jsonUtils";
import { deepCloneItems } from "../utils/estimatorMath";
import { useEstimatorStore } from "../store/useEstimatorStore";

export function useExportManager({ projectState, calcState, setters }) {
  const showToast = useEstimatorStore((state) => state.showToast);

  const {
    projectName,
    activeTab,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
  } = projectState;

  const {
    solutionTotals,
    grandBaseTotal,
    scaledTotal,
    riskAppliedTotal,
    mgmtMd,
    finalTotal,
  } = calcState;

  const {
    setProjectId,
    setActiveTab,
    setProjectName,
    setItemsBySolution,
    setScaleFactor,
    setRiskFactor,
    setMgmtRate,
    setSavedAt,
    setIsDirty,
  } = setters;

  const downloadJson = () => {
    try {
      const payload = {
        ...toExportPayload({
          activeTab,
          projectName,
          itemsBySolution,
          scaleFactor,
          riskFactor,
          mgmtRate,
          savedAt,
        }),
        exportedAt: new Date().toISOString(),
      };

      downloadJsonFile({
        projectName,
        payload,
      });

      showToast("JSON 파일 저장 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("JSON 저장 실패", "red");
    }
  };

  const downloadExcel = () => {
    try {
      const xml = buildExcelXml({
        projectName,
        activeTab,
        itemsBySolution,
        solutionTotals,
        grandBaseTotal,
        scaledTotal,
        riskAppliedTotal,
        mgmtRate,
        mgmtMd,
        finalTotal,
        scaleFactor,
        riskFactor,
        savedAt,
      });

      downloadExcelFile({
        projectName,
        xml,
      });

      showToast("엑셀 파일 저장 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("엑셀 저장 실패", "red");
    }
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await readJsonFile(file);
      const parsed = JSON.parse(text);

      if (!parsed.itemsBySolution || !parsed.projectName) {
        throw new Error("형식이 올바르지 않은 파일입니다.");
      }

      setProjectId(null);
      setActiveTab(parsed.activeTab || "pbx");
      setProjectName(parsed.projectName || "새 컨택센터 프로젝트");
      setItemsBySolution(parsed.itemsBySolution || deepCloneItems());
      setScaleFactor(Number(parsed.scaleFactor ?? 1.0));
      setRiskFactor(Number(parsed.riskFactor ?? 1.0));
      setMgmtRate(Number(parsed.mgmtRate ?? 10));
      setSavedAt(parsed.savedAt || "");
      setIsDirty(true);

      showToast("JSON 불러오기 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("JSON 불러오기 실패", "red");
      alert("JSON 파일을 불러오지 못했습니다. 파일 형식을 확인해 주세요.");
    } finally {
      event.target.value = "";
    }
  };

  return {
    downloadJson,
    downloadExcel,
    importJson,
  };
}