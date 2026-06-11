import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  buildStandardEffortWorkbookFromExportData,
  prepareStandardEffortWorkbookExport,
} from "../src/services/export/standardEffortExportWorkflow";

const sampleExportData = {
  project: {
    id: "00000042",
    project_id: "00000042",
    project_name: "Standard Project",
  },
  standard_effort: {
    results: [
      {
        solution_variant_id: "variant-1",
        display_name: "PBX Avaya",
        base_total_mm: 10,
        standard_effort_mm: 12.5,
        actual_effort_mm: 11,
        gap_mm: 1.5,
      },
    ],
    totals: {
      base_total_mm: 10,
      standard_effort_mm: 12.5,
      actual_effort_mm: 11,
      gap_mm: 1.5,
      solution_count: 1,
    },
  },
  checked_items: [],
  generated_at: "2026-06-03T00:00:00.000Z",
};

const sampleWorkbookOutput = {
  workbook: { SheetNames: ["Summary"] },
  buffer: new Uint8Array([1, 2, 3]),
  filename: "standard-effort.xlsx",
  sheets: [{ name: "Summary", rows: [] }],
};

function workflowSource() {
  return readFileSync(
    new URL("../src/services/export/standardEffortExportWorkflow.js", import.meta.url),
    "utf8"
  );
}

describe("standard effort export workflow", () => {
  it("fetches export data with projectId and options", async () => {
    const options = { includeCheckedItems: false };
    const fetchStandardEffortExportData = vi
      .fn()
      .mockResolvedValue({ data: sampleExportData, error: null });
    const buildStandardEffortWorkbookOutput = vi.fn().mockReturnValue(sampleWorkbookOutput);

    await prepareStandardEffortWorkbookExport("00000042", options, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });

    expect(fetchStandardEffortExportData).toHaveBeenCalledWith("00000042", options);
  });

  it("passes numeric and string project ids through without uuid conversion", async () => {
    const fetchStandardEffortExportData = vi
      .fn()
      .mockResolvedValue({ data: sampleExportData, error: null });
    const buildStandardEffortWorkbookOutput = vi.fn().mockReturnValue(sampleWorkbookOutput);

    await prepareStandardEffortWorkbookExport(42, {}, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });
    await prepareStandardEffortWorkbookExport("00000042", {}, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });

    expect(fetchStandardEffortExportData.mock.calls[0][0]).toBe(42);
    expect(fetchStandardEffortExportData.mock.calls[1][0]).toBe("00000042");
  });

  it("builds workbook output after a successful fetch", async () => {
    const options = { includeCheckedItems: false };
    const fetchStandardEffortExportData = vi
      .fn()
      .mockResolvedValue({ data: sampleExportData, error: null });
    const buildStandardEffortWorkbookOutput = vi.fn().mockReturnValue(sampleWorkbookOutput);

    const result = await prepareStandardEffortWorkbookExport("00000042", options, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });

    expect(buildStandardEffortWorkbookOutput).toHaveBeenCalledWith(
      sampleExportData,
      options
    );
    expect(result).toEqual({
      data: {
        exportData: sampleExportData,
        ...sampleWorkbookOutput,
      },
      error: null,
    });
  });

  it("does not build workbook output when fetch returns an error", async () => {
    const fetchError = new Error("export failed");
    const fetchStandardEffortExportData = vi
      .fn()
      .mockResolvedValue({ data: null, error: fetchError });
    const buildStandardEffortWorkbookOutput = vi.fn();

    const result = await prepareStandardEffortWorkbookExport("00000042", {}, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });

    expect(buildStandardEffortWorkbookOutput).not.toHaveBeenCalled();
    expect(result).toEqual({ data: null, error: fetchError });
  });

  it("returns an error without fetching when projectId is missing", async () => {
    const fetchStandardEffortExportData = vi.fn();
    const buildStandardEffortWorkbookOutput = vi.fn();

    const result = await prepareStandardEffortWorkbookExport("", {}, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });

    expect(fetchStandardEffortExportData).not.toHaveBeenCalled();
    expect(buildStandardEffortWorkbookOutput).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("projectId");
  });

  it("returns an error when workbook output creation throws", async () => {
    const buildError = new Error("workbook failed");
    const fetchStandardEffortExportData = vi
      .fn()
      .mockResolvedValue({ data: sampleExportData, error: null });
    const buildStandardEffortWorkbookOutput = vi.fn(() => {
      throw buildError;
    });

    const result = await prepareStandardEffortWorkbookExport("00000042", {}, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });

    expect(result).toEqual({ data: null, error: buildError });
  });

  it("passes includeCheckedItems=false to both fetch and workbook helpers", async () => {
    const options = { includeCheckedItems: false };
    const fetchStandardEffortExportData = vi
      .fn()
      .mockResolvedValue({ data: sampleExportData, error: null });
    const buildStandardEffortWorkbookOutput = vi.fn().mockReturnValue(sampleWorkbookOutput);

    await prepareStandardEffortWorkbookExport("00000042", options, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });

    expect(fetchStandardEffortExportData).toHaveBeenCalledWith("00000042", options);
    expect(buildStandardEffortWorkbookOutput).toHaveBeenCalledWith(
      sampleExportData,
      options
    );
  });

  it("builds workbook output from existing export data", () => {
    const result = buildStandardEffortWorkbookFromExportData(sampleExportData, {
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    expect(result.error).toBeNull();
    expect(result.data.workbook.SheetNames).toHaveLength(3);
    expect(result.data.buffer.byteLength).toBeGreaterThan(0);
    expect(result.data.filename).toContain("Standard_Project_20260603.xlsx");
    expect(result.data.sheets).toHaveLength(3);
  });

  it("returns an error when export data is missing", () => {
    const result = buildStandardEffortWorkbookFromExportData(null);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("export data");
  });

  it("preserves standard effort M/M fields in output exportData", async () => {
    const fetchStandardEffortExportData = vi
      .fn()
      .mockResolvedValue({ data: sampleExportData, error: null });
    const buildStandardEffortWorkbookOutput = vi.fn().mockReturnValue(sampleWorkbookOutput);

    const result = await prepareStandardEffortWorkbookExport("00000042", {}, {
      fetchStandardEffortExportData,
      buildStandardEffortWorkbookOutput,
    });
    const [row] = result.data.exportData.standard_effort.results;

    expect(row.standard_effort_mm).toBe(12.5);
    expect(row.actual_effort_mm).toBe(11);
    expect(row.gap_mm).toBe(1.5);
  });

  it("does not use Blob, DOM, URL downloads, frontend audit, or M/D conversion", () => {
    const source = workflowSource();

    expect(source).not.toContain("Blob");
    expect(source).not.toContain("window");
    expect(source).not.toContain("document");
    expect(source).not.toContain("createObjectURL");
    expect(source).not.toContain("createAuditLog");
    expect(source).not.toMatch(/M\/D/i);
    expect(source).not.toContain("effort_md");
    expect(source).not.toContain("actual_effort_md");
    expect(source).not.toContain("base_md");
  });
});
