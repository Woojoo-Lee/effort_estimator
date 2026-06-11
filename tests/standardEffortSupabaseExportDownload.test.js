import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  downloadPreparedStandardEffortSupabaseWorkbookOutput,
  downloadStandardEffortSupabaseWorkbookExport,
} from "../src/services/export/standardEffortSupabaseExportDownload";

const sampleExportData = {
  project: {
    project_id: "7",
    project_name: "Supabase Project",
  },
  standard_effort: {
    results: [
      {
        solution_variant_id: "variant-1",
        standard_effort_mm: 12.5,
        actual_effort_mm: 11,
        gap_mm: 1.5,
      },
    ],
  },
};

const sampleWorkbookOutput = {
  exportData: sampleExportData,
  workbook: { SheetNames: ["Summary"] },
  buffer: new Uint8Array([1, 2, 3]),
  filename: "standard-effort-supabase.xlsx",
  sheets: [{ name: "Summary", rows: [] }],
};

function source() {
  return readFileSync(
    new URL(
      "../src/services/export/standardEffortSupabaseExportDownload.js",
      import.meta.url
    ),
    "utf8"
  );
}

describe("standard effort Supabase export download workflow", () => {
  it("returns an error without prepare or download when projectId is missing", async () => {
    const prepareStandardEffortSupabaseWorkbookExport = vi.fn();
    const downloadWorkbookOutput = vi.fn();

    const result = await downloadStandardEffortSupabaseWorkbookExport("", {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(prepareStandardEffortSupabaseWorkbookExport).not.toHaveBeenCalled();
    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("projectId");
  });

  it("passes projectId and options through to prepare", async () => {
    const options = { includeCheckedItems: true };
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort-supabase.xlsx" });

    await downloadStandardEffortSupabaseWorkbookExport("7", options, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(prepareStandardEffortSupabaseWorkbookExport).toHaveBeenCalledWith(
      "7",
      options,
      expect.objectContaining({
        prepareStandardEffortSupabaseWorkbookExport,
        downloadWorkbookOutput,
      })
    );
  });

  it("passes numeric and string project ids through without uuid conversion", async () => {
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort-supabase.xlsx" });

    await downloadStandardEffortSupabaseWorkbookExport(7, {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });
    await downloadStandardEffortSupabaseWorkbookExport("0007", {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(prepareStandardEffortSupabaseWorkbookExport.mock.calls[0][0]).toBe(7);
    expect(prepareStandardEffortSupabaseWorkbookExport.mock.calls[1][0]).toBe(
      "0007"
    );
  });

  it("downloads the prepared workbook output after prepare succeeds", async () => {
    const options = { includeCheckedItems: true };
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "downloaded.xlsx" });

    const result = await downloadStandardEffortSupabaseWorkbookExport(
      "7",
      options,
      {
        prepareStandardEffortSupabaseWorkbookExport,
        downloadWorkbookOutput,
      }
    );

    expect(downloadWorkbookOutput).toHaveBeenCalledWith(
      sampleWorkbookOutput,
      options,
      expect.objectContaining({
        prepareStandardEffortSupabaseWorkbookExport,
        downloadWorkbookOutput,
      })
    );
    expect(result).toEqual({
      data: {
        filename: "downloaded.xlsx",
        exportData: sampleExportData,
        sheets: sampleWorkbookOutput.sheets,
      },
      error: null,
    });
    expect(result.data).not.toHaveProperty("workbook");
    expect(result.data).not.toHaveProperty("buffer");
  });

  it("does not download when prepare returns an error", async () => {
    const prepareError = new Error("prepare failed");
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: null, error: prepareError });
    const downloadWorkbookOutput = vi.fn();

    const result = await downloadStandardEffortSupabaseWorkbookExport("7", {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result).toEqual({ data: null, error: prepareError });
  });

  it("does not download when prepare returns no data", async () => {
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const downloadWorkbookOutput = vi.fn();

    const result = await downloadStandardEffortSupabaseWorkbookExport("7", {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it("returns an error when downloadWorkbookOutput returns ok false", async () => {
    const downloadError = new Error("download failed");
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: false, error: downloadError });

    const result = await downloadStandardEffortSupabaseWorkbookExport("7", {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(result).toEqual({ data: null, error: downloadError });
  });

  it("returns an error when downloadWorkbookOutput throws", async () => {
    const downloadError = new Error("download exploded");
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi.fn(() => {
      throw downloadError;
    });

    const result = await downloadStandardEffortSupabaseWorkbookExport("7", {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(result).toEqual({ data: null, error: downloadError });
  });

  it("downloads an already prepared workbook output", () => {
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "prepared.xlsx" });

    const result = downloadPreparedStandardEffortSupabaseWorkbookOutput(
      sampleWorkbookOutput,
      { includeCheckedItems: true },
      { downloadWorkbookOutput }
    );

    expect(downloadWorkbookOutput).toHaveBeenCalledWith(
      sampleWorkbookOutput,
      { includeCheckedItems: true },
      { downloadWorkbookOutput }
    );
    expect(result).toEqual({
      data: {
        filename: "prepared.xlsx",
        exportData: sampleExportData,
        sheets: sampleWorkbookOutput.sheets,
      },
      error: null,
    });
    expect(result.data).not.toHaveProperty("workbook");
    expect(result.data).not.toHaveProperty("buffer");
  });

  it("returns an error when prepared workbook output or buffer is missing", () => {
    const downloadWorkbookOutput = vi.fn();

    expect(
      downloadPreparedStandardEffortSupabaseWorkbookOutput(null, {}, {
        downloadWorkbookOutput,
      }).error
    ).toBeInstanceOf(Error);
    expect(
      downloadPreparedStandardEffortSupabaseWorkbookOutput(
        { filename: "standard-effort.xlsx" },
        {},
        { downloadWorkbookOutput }
      ).error.message
    ).toContain("buffer");
    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
  });

  it("preserves standard effort M/M fields in returned exportData", async () => {
    const prepareStandardEffortSupabaseWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort-supabase.xlsx" });

    const result = await downloadStandardEffortSupabaseWorkbookExport("7", {}, {
      prepareStandardEffortSupabaseWorkbookExport,
      downloadWorkbookOutput,
    });
    const [row] = result.data.exportData.standard_effort.results;

    expect(row.standard_effort_mm).toBe(12.5);
    expect(row.actual_effort_mm).toBe(11);
    expect(row.gap_mm).toBe(1.5);
  });

  it("does not directly use Blob, DOM, object URLs, xlsx, frontend audit, or legacy effort fields", () => {
    const fileSource = source();

    expect(fileSource).not.toContain("Blob");
    expect(fileSource).not.toContain("window");
    expect(fileSource).not.toContain("document");
    expect(fileSource).not.toContain("createObjectURL");
    expect(fileSource).not.toMatch(/from ["']xlsx["']/);
    expect(fileSource).not.toContain("createAuditLog");
    expect(fileSource).not.toMatch(/M\/D/i);
    expect(fileSource).not.toContain("effort_md");
    expect(fileSource).not.toContain("actual_effort_md");
    expect(fileSource).not.toContain("base_md");
  });
});
