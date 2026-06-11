import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  downloadPreparedStandardEffortWorkbookOutput,
  downloadStandardEffortWorkbookExport,
} from "../src/services/export/standardEffortExportDownload";

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
  filename: "standard-effort.xlsx",
  sheets: [{ name: "Summary", rows: [] }],
};

function source() {
  return readFileSync(
    new URL("../src/services/export/standardEffortExportDownload.js", import.meta.url),
    "utf8"
  );
}

describe("standard effort export download workflow", () => {
  it("calls prepareStandardEffortWorkbookExport with projectId and options", async () => {
    const options = { includeCheckedItems: false };
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort.xlsx" });

    await downloadStandardEffortWorkbookExport("00000042", options, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(prepareStandardEffortWorkbookExport).toHaveBeenCalledWith(
      "00000042",
      options,
      expect.objectContaining({
        prepareStandardEffortWorkbookExport,
        downloadWorkbookOutput,
      })
    );
  });

  it("passes numeric and string project ids through without uuid conversion", async () => {
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort.xlsx" });

    await downloadStandardEffortWorkbookExport(42, {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });
    await downloadStandardEffortWorkbookExport("00000042", {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(prepareStandardEffortWorkbookExport.mock.calls[0][0]).toBe(42);
    expect(prepareStandardEffortWorkbookExport.mock.calls[1][0]).toBe("00000042");
  });

  it("downloads the prepared workbook output after prepare succeeds", async () => {
    const options = { includeCheckedItems: false };
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort.xlsx" });

    const result = await downloadStandardEffortWorkbookExport("00000042", options, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(downloadWorkbookOutput).toHaveBeenCalledWith(
      sampleWorkbookOutput,
      options,
      expect.objectContaining({
        prepareStandardEffortWorkbookExport,
        downloadWorkbookOutput,
      })
    );
    expect(result).toEqual({
      data: {
        filename: "standard-effort.xlsx",
        exportData: sampleExportData,
        sheets: sampleWorkbookOutput.sheets,
      },
      error: null,
    });
    expect(result.data).not.toHaveProperty("workbook");
    expect(result.data).not.toHaveProperty("buffer");
  });

  it("passes includeCheckedItems=false to prepare and download", async () => {
    const options = { includeCheckedItems: false };
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort.xlsx" });

    await downloadStandardEffortWorkbookExport("00000042", options, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(prepareStandardEffortWorkbookExport.mock.calls[0][1]).toBe(options);
    expect(downloadWorkbookOutput.mock.calls[0][1]).toBe(options);
  });

  it("returns an error without prepare or download when projectId is missing", async () => {
    const prepareStandardEffortWorkbookExport = vi.fn();
    const downloadWorkbookOutput = vi.fn();

    const result = await downloadStandardEffortWorkbookExport("", {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(prepareStandardEffortWorkbookExport).not.toHaveBeenCalled();
    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("projectId");
  });

  it("does not download when prepare returns an error", async () => {
    const prepareError = new Error("prepare failed");
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: null, error: prepareError });
    const downloadWorkbookOutput = vi.fn();

    const result = await downloadStandardEffortWorkbookExport("00000042", {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result).toEqual({ data: null, error: prepareError });
  });

  it("does not download when prepare returns no data", async () => {
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const downloadWorkbookOutput = vi.fn();

    const result = await downloadStandardEffortWorkbookExport("00000042", {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it("returns an error when downloadWorkbookOutput returns ok false", async () => {
    const downloadError = new Error("download failed");
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: false, error: downloadError });

    const result = await downloadStandardEffortWorkbookExport("00000042", {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(result).toEqual({ data: null, error: downloadError });
  });

  it("returns an error when downloadWorkbookOutput throws", async () => {
    const downloadError = new Error("download exploded");
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi.fn(() => {
      throw downloadError;
    });

    const result = await downloadStandardEffortWorkbookExport("00000042", {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });

    expect(result).toEqual({ data: null, error: downloadError });
  });

  it("downloads an already prepared workbook output", () => {
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort.xlsx" });

    const result = downloadPreparedStandardEffortWorkbookOutput(
      sampleWorkbookOutput,
      { mimeType: "application/test" },
      { downloadWorkbookOutput }
    );

    expect(downloadWorkbookOutput).toHaveBeenCalledWith(
      sampleWorkbookOutput,
      { mimeType: "application/test" },
      { downloadWorkbookOutput }
    );
    expect(result).toEqual({
      data: { filename: "standard-effort.xlsx" },
      error: null,
    });
  });

  it("returns an error when prepared workbook output is missing", () => {
    const downloadWorkbookOutput = vi.fn();

    const result = downloadPreparedStandardEffortWorkbookOutput(null, {}, {
      downloadWorkbookOutput,
    });

    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it("returns an error when prepared workbook output buffer is missing", () => {
    const downloadWorkbookOutput = vi.fn();

    const result = downloadPreparedStandardEffortWorkbookOutput(
      { filename: "standard-effort.xlsx" },
      {},
      { downloadWorkbookOutput }
    );

    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("buffer");
  });

  it("preserves standard effort M/M fields in returned exportData", async () => {
    const prepareStandardEffortWorkbookExport = vi
      .fn()
      .mockResolvedValue({ data: sampleWorkbookOutput, error: null });
    const downloadWorkbookOutput = vi
      .fn()
      .mockReturnValue({ ok: true, filename: "standard-effort.xlsx" });

    const result = await downloadStandardEffortWorkbookExport("00000042", {}, {
      prepareStandardEffortWorkbookExport,
      downloadWorkbookOutput,
    });
    const [row] = result.data.exportData.standard_effort.results;

    expect(row.standard_effort_mm).toBe(12.5);
    expect(row.actual_effort_mm).toBe(11);
    expect(row.gap_mm).toBe(1.5);
  });

  it("does not directly use Blob, DOM, object URLs, xlsx, frontend audit, or M/D conversion", () => {
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
