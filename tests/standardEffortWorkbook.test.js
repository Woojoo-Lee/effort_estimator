import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  buildStandardEffortWorkbookOutput,
  createStandardEffortWorkbook,
  createWorkbookFromSheets,
  writeWorkbookToArrayBuffer,
} from "../src/utils/export/standardEffortWorkbook";

const sampleExportData = {
  project: {
    id: "00000042",
    project_id: "00000042",
    project_name: "Contact Center:Standard",
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
  checked_items: [
    {
      solution_name: "PBX",
      variant_name: "Avaya",
      category_l1: "Channel",
      category_l2: "Voice",
      item_name: "IVR",
      item_option: "Basic",
      coefficient: "1.5",
      checked: true,
    },
  ],
  generated_at: "2026-06-03T00:00:00.000Z",
};

function readWorksheetRows(workbook, sheetName) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

function isArrayBufferLike(value) {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

describe("standard effort workbook helper", () => {
  it("creates a workbook from sheet models", () => {
    const sheets = [{ name: "Summary", rows: [{ Label: "Project", Value: 42 }] }];
    const workbook = createWorkbookFromSheets(sheets);

    expect(workbook.SheetNames).toEqual(["Summary"]);
    expect(readWorksheetRows(workbook, "Summary")).toEqual(sheets[0].rows);
  });

  it("matches sheet count to the input sheets", () => {
    const workbook = createWorkbookFromSheets([
      { name: "One", rows: [{ A: 1 }] },
      { name: "Two", rows: [{ B: 2 }] },
    ]);

    expect(workbook.SheetNames).toHaveLength(2);
  });

  it("creates worksheets for empty rows", () => {
    const workbook = createWorkbookFromSheets([{ name: "Empty", rows: [] }]);

    expect(workbook.SheetNames).toEqual(["Empty"]);
    expect(readWorksheetRows(workbook, "Empty")).toEqual([]);
  });

  it("sanitizes long and invalid sheet names", () => {
    const workbook = createWorkbookFromSheets([
      { name: "A".repeat(40), rows: [] },
      { name: "Bad:/\\?*[]Name", rows: [] },
    ]);

    expect(workbook.SheetNames[0]).toHaveLength(31);
    expect(workbook.SheetNames[1]).not.toMatch(/[\\/?*:[\]]/);
  });

  it("deduplicates sheet names", () => {
    const workbook = createWorkbookFromSheets([
      { name: "Same", rows: [] },
      { name: "Same", rows: [] },
      { name: "Same", rows: [] },
    ]);

    expect(workbook.SheetNames).toEqual(["Same", "Same_2", "Same_3"]);
  });

  it("creates a standard effort workbook with mapper sheets", () => {
    const workbook = createStandardEffortWorkbook(sampleExportData);

    expect(workbook.SheetNames).toHaveLength(3);
    expect(readWorksheetRows(workbook, workbook.SheetNames[0]).length).toBeGreaterThan(0);
    expect(readWorksheetRows(workbook, workbook.SheetNames[1])).toHaveLength(1);
    expect(readWorksheetRows(workbook, workbook.SheetNames[2])).toHaveLength(1);
  });

  it("writes a workbook to an array buffer-like value", () => {
    const workbook = createWorkbookFromSheets([{ name: "Summary", rows: [{ A: 1 }] }]);
    const buffer = writeWorkbookToArrayBuffer(workbook);

    expect(isArrayBufferLike(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("builds workbook output with workbook, buffer, filename, and sheets", () => {
    const output = buildStandardEffortWorkbookOutput(sampleExportData);

    expect(output.workbook.SheetNames).toHaveLength(3);
    expect(isArrayBufferLike(output.buffer)).toBe(true);
    expect(output.filename).toContain("Contact_Center_Standard_20260603.xlsx");
    expect(output.sheets).toHaveLength(3);
  });

  it("keeps M/M labels only on effort rows and not coefficient labels", () => {
    const output = buildStandardEffortWorkbookOutput(sampleExportData);
    const serializedSheets = JSON.stringify(output.sheets);
    const resultRow = output.sheets[1].rows[0];
    const checkedItemRow = output.sheets[2].rows[0];
    const coefficientTotalLabel = Object.entries(resultRow).find(
      ([, value]) => value === 1.23
    )?.[0];
    const checkedCoefficientLabel = Object.entries(checkedItemRow).find(
      ([, value]) => value === 1.5
    )?.[0];

    expect(serializedSheets).toContain("M/M");
    expect(coefficientTotalLabel).not.toContain("M/M");
    expect(checkedCoefficientLabel).not.toContain("M/M");
  });

  it("does not use file download, DOM, repository, or API wiring", () => {
    const source = readFileSync(
      new URL("../src/utils/export/standardEffortWorkbook.js", import.meta.url),
      "utf8"
    );

    expect(source).not.toContain("Blob");
    expect(source).not.toContain("window");
    expect(source).not.toContain("document");
    expect(source).not.toContain("exportRepository");
    expect(source).not.toContain("useExportManager");
    expect(source).not.toContain("HeaderBar");
    expect(source).not.toContain("exportApiAdapter");
  });

  it("does not perform M/D to M/M conversion", () => {
    const source = readFileSync(
      new URL("../src/utils/export/standardEffortWorkbook.js", import.meta.url),
      "utf8"
    );

    expect(source).not.toMatch(/M\/D/i);
    expect(source).not.toContain("effort_md");
    expect(source).not.toContain("actual_effort_md");
    expect(source).not.toContain("base_md");
  });
});
