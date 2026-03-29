import { describe, expect, it } from "vitest";
import { buildProjectExportPayload } from "../src/utils/export/buildProjectExportPayload";
import { mapEstimatorToExcelRows } from "../src/utils/export/mapEstimatorToExcelRows";

describe("export data", () => {
  it("JSON export payload를 생성한다", () => {
    const payload = buildProjectExportPayload({
      projectState: {
        projectName: "테스트 프로젝트",
        activeTab: "pbx",
        itemsBySolution: { pbx: [] },
        scaleFactor: 1,
        riskFactor: 1,
        mgmtRate: 10,
        savedAt: "",
      },
      calcState: {
        solutionTotals: { pbx: 0 },
        grandBaseTotal: 0,
        scaledTotal: 0,
        riskAppliedTotal: 0,
        mgmtMd: 0,
        finalTotal: 0,
      },
    });

    expect(payload.project.projectName).toBe("테스트 프로젝트");
    expect(payload.meta.formatVersion).toBe(1);
  });

  it("Excel row 배열을 생성한다", () => {
    const rows = mapEstimatorToExcelRows({
      projectState: {
        itemsBySolution: {
          pbx: [
            {
              name: "업무1",
              baseMd: 5,
              difficulty: 1,
              complexity: 1,
              note: "",
            },
          ],
        },
      },
      calcState: {
        grandBaseTotal: 5,
        scaledTotal: 5,
        riskAppliedTotal: 5,
        mgmtMd: 0.5,
        finalTotal: 5.5,
      },
    });

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].업무명).toBe("업무1");
  });
});