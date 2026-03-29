import { describe, expect, it } from "vitest";
import { validateImportData } from "../src/utils/import/validateImportData";
import { normalizeImportData } from "../src/utils/import/normalizeImportData";

describe("import data validation", () => {
  it("정상 구조는 valid true를 반환한다", () => {
    const input = {
      project: {
        itemsBySolution: {
          pbx: [],
        },
      },
    };

    const result = validateImportData(input);

    expect(result.valid).toBe(true);
  });

  it("project가 없으면 valid false를 반환한다", () => {
    const input = {};

    const result = validateImportData(input);

    expect(result.valid).toBe(false);
  });

  it("누락된 필드를 기본값으로 보정한다", () => {
    const input = {
      project: {
        itemsBySolution: {
          pbx: [],
        },
      },
    };

    const result = normalizeImportData(input);

    expect(result.projectName).toBe("불러온 컨택센터 프로젝트");
    expect(result.activeTab).toBe("pbx");
    expect(result.scaleFactor).toBe(1);
    expect(result.riskFactor).toBe(1);
    expect(result.mgmtRate).toBe(10);
  });
});