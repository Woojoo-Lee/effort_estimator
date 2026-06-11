import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildStandardEffortCheckedItemRows,
  buildStandardEffortExportFilename,
  buildStandardEffortExportSheets,
  buildStandardEffortResultRows,
  buildStandardEffortSummaryRows,
  formatExportNumber,
  normalizeStandardEffortExportDataForRows,
  toExportNumber,
} from "../src/utils/export/standardEffortExportMapper";

const sampleExportData = {
  project: {
    id: "00000042",
    project_id: "00000042",
    project_name: "콜센터/표준:공수",
  },
  standard_effort: {
    results: [
      {
        solution_name: "PBX",
        variant_name: "Avaya",
        display_name: "PBX Avaya",
        solution_variant_id: "variant-1",
        base_total_mm: "10",
        coefficient_total: "1.234",
        standard_effort_mm: "12.345",
        actual_effort_mm: "10",
        gap_mm: "2.345",
      },
    ],
    totals: {
      base_total_mm: "10",
      coefficient_total: "1.234",
      standard_effort_mm: "12.345",
      actual_effort_mm: "10",
      gap_mm: "2.345",
      solution_count: "1",
    },
  },
  selections: {
    projectSolutionSelections: [{ project_id: "00000042" }],
    projectItemSelections: [{ item_id: "item-1" }],
  },
  checked_items: [
    {
      solution_name: "PBX",
      variant_name: "Avaya",
      category_l1: "채널",
      category_l2: "음성",
      item_name: "IVR",
      item_option: "Basic",
      coefficient: "1.5",
      checked: true,
    },
    {
      solution_code: "CTI",
      variant_code: "v1",
      category_l1: "연동",
      category_l2: "CRM",
      item_name: "CRM 연동",
      item_option: "",
      coefficient: "",
      checked: false,
    },
  ],
  generated_at: "2026-06-03T00:00:00.000Z",
  generated_by: { email: "user@example.com" },
};

describe("standard effort export mapper", () => {
  it("normalizes numbers without M/D to M/M conversion", () => {
    expect(toExportNumber(null)).toBe(0);
    expect(toExportNumber(undefined)).toBe(0);
    expect(toExportNumber("")).toBe(0);
    expect(toExportNumber(Number.NaN)).toBe(0);
    expect(toExportNumber("12.5")).toBe(12.5);
    expect(formatExportNumber("12.345", 2)).toBe(12.35);
  });

  it("guarantees the normalized export data structure", () => {
    const normalized = normalizeStandardEffortExportDataForRows({});

    expect(normalized.project).toEqual({});
    expect(normalized.standard_effort.results).toEqual([]);
    expect(normalized.standard_effort.totals).toEqual({});
    expect(normalized.selections.projectSolutionSelections).toEqual([]);
    expect(normalized.selections.projectItemSelections).toEqual([]);
    expect(normalized.checked_items).toEqual([]);
  });

  it("uses camelCase standardEffort and checkedItems fallbacks", () => {
    const normalized = normalizeStandardEffortExportDataForRows({
      standardEffort: {
        results: [{ solution_variant_id: "variant-1", base_total_mm: "1" }],
        totals: { standard_effort_mm: "2" },
      },
      checkedItems: [{ item_id: "item-1", coefficient: "3", checked: "Y" }],
    });

    expect(normalized.standard_effort.results[0].base_total_mm).toBe(1);
    expect(normalized.standard_effort.totals.standard_effort_mm).toBe(2);
    expect(normalized.checked_items[0]).toEqual({
      item_id: "item-1",
      coefficient: 3,
      checked: true,
    });
  });

  it("normalizes standard effort numeric fields and checked items", () => {
    const normalized = normalizeStandardEffortExportDataForRows({
      project: { id: 42, project_id: "00000042" },
      standard_effort: {
        results: [
          {
            base_total_mm: "",
            coefficient_total: "1.25",
            standard_effort_mm: null,
            actual_effort_mm: undefined,
            gap_mm: "",
            base_md: 99,
          },
        ],
        totals: {
          base_total_mm: "",
          coefficient_total: "1.25",
          standard_effort_mm: "10",
          actual_effort_mm: null,
          gap_mm: undefined,
        },
      },
      checked_items: [
        { coefficient: "", checked: "true", effort_md: 1 },
        { coefficient: null, checked: 0 },
      ],
    });

    expect(normalized.project).toEqual({ id: 42, project_id: "00000042" });
    expect(normalized.standard_effort.results[0]).toEqual({
      base_total_mm: 0,
      coefficient_total: 1.25,
      standard_effort_mm: 0,
      actual_effort_mm: 0,
      gap_mm: 0,
    });
    expect(normalized.standard_effort.totals).toEqual({
      base_total_mm: 0,
      coefficient_total: 1.25,
      standard_effort_mm: 10,
      actual_effort_mm: 0,
      gap_mm: 0,
    });
    expect(normalized.checked_items).toEqual([
      { coefficient: 0, checked: true },
      { coefficient: 0, checked: false },
    ]);
    expect(normalized.standard_effort.results[0]).not.toHaveProperty("base_md");
    expect(normalized.checked_items[0]).not.toHaveProperty("effort_md");
  });

  it("builds summary rows with required labels", () => {
    const rows = buildStandardEffortSummaryRows(sampleExportData);
    const labels = rows.map((row) => row["항목"]);

    expect(labels).toEqual([
      "프로젝트명",
      "프로젝트 ID",
      "생성일시",
      "솔루션 수",
      "기본공수합(M/M)",
      "표준공수합(M/M)",
      "실투입공수합(M/M)",
      "GAP(M/M)",
    ]);
    expect(rows.find((row) => row["항목"] === "프로젝트명")["값"]).toBe(
      "콜센터/표준:공수"
    );
    expect(rows.find((row) => row["항목"] === "표준공수합(M/M)")["값"]).toBe(
      12.35
    );
    expect(rows.find((row) => row["항목"] === "GAP(M/M)")["값"]).toBe(2.35);
  });

  it("builds solution result rows with M/M labels only for effort fields", () => {
    const [row] = buildStandardEffortResultRows(sampleExportData);

    expect(row["솔루션"]).toBe("PBX");
    expect(row["버전"]).toBe("Avaya");
    expect(row["표시명"]).toBe("PBX Avaya");
    expect(row).toHaveProperty("기본공수합(M/M)");
    expect(row).toHaveProperty("계수합");
    expect(row).not.toHaveProperty("계수합(M/M)");
    expect(row).toHaveProperty("표준공수(M/M)");
    expect(row).toHaveProperty("실투입공수(M/M)");
    expect(row).toHaveProperty("GAP(M/M)");
    expect(row["계수합"]).toBe(1.23);
  });

  it("builds checked item rows and maps checked values to Y/N", () => {
    const rows = buildStandardEffortCheckedItemRows(sampleExportData);

    expect(rows[0]).toEqual({
      "솔루션": "PBX",
      "버전": "Avaya",
      "구분1": "채널",
      "구분2": "음성",
      "기능항목": "IVR",
      "옵션": "Basic",
      "계수": 1.5,
      "체크여부": "Y",
    });
    expect(rows[1]["체크여부"]).toBe("N");
    expect(rows[1]["구분1"]).toBe("연동");
    expect(rows[1]["구분2"]).toBe("CRM");
    expect(rows[1]["기능항목"]).toBe("CRM 연동");
    expect(rows[1]["옵션"]).toBe("");
  });

  it("builds the workbook sheet model without creating files", () => {
    const sheets = buildStandardEffortExportSheets(sampleExportData);

    expect(sheets).toEqual([
      { name: "요약", rows: expect.any(Array) },
      { name: "솔루션별 공수", rows: expect.any(Array) },
      { name: "체크 항목", rows: expect.any(Array) },
    ]);
    expect(sheets[0].rows.length).toBeGreaterThan(0);
    expect(sheets[1].rows.length).toBe(1);
    expect(sheets[2].rows.length).toBe(2);
  });

  it("builds safe filenames", () => {
    expect(buildStandardEffortExportFilename(sampleExportData)).toBe(
      "표준공수_콜센터_표준_공수_20260603.xlsx"
    );
    expect(
      buildStandardEffortExportFilename(
        { project: {}, generated_at: "bad-date" },
        { format: "json", generatedAt: "2026-06-04T00:00:00.000Z" }
      )
    ).toBe("표준공수_standard_effort_20260604.json");
  });

  it("does not use xlsx, Blob, window, or document APIs", () => {
    const source = readFileSync(
      new URL("../src/utils/export/standardEffortExportMapper.js", import.meta.url),
      "utf8"
    );

    expect(source).not.toMatch(/from ["']xlsx["']/);
    expect(source).not.toContain("Blob");
    expect(source).not.toContain("window");
    expect(source).not.toContain("document");
  });
});
