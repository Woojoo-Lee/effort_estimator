// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import { useExportManager } from "../src/hooks/useExportManager";
import { useEstimatorStore } from "../src/store/useEstimatorStore";

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn((rows) => ({ rows })),
    book_new: vi.fn(() => ({ sheets: [] })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

const baseProjectState = {
  projectId: "00000042",
  projectName: "Standard Project",
  activeTab: "pbx",
  itemsBySolution: {
    pbx: [
      {
        name: "IVR",
        baseMd: 1,
        difficulty: 1,
        complexity: 1,
        note: "",
      },
    ],
  },
  scaleFactor: 1,
  riskFactor: 1,
  mgmtRate: 0,
  savedAt: "",
};

const baseCalcState = {
  solutionTotals: { pbx: 1 },
  grandBaseTotal: 1,
  scaledTotal: 1,
  riskAppliedTotal: 1,
  mgmtMd: 0,
  finalTotal: 1,
};

const standardExportData = {
  standard_effort: {
    results: [
      {
        standard_effort_mm: 12.5,
        actual_effort_mm: 11,
        gap_mm: 1.5,
      },
    ],
  },
};

function createEnv(mode, backend = "api") {
  return {
    VITE_FEATURE_STANDARD_EFFORT: "true",
    VITE_STANDARD_EFFORT_MODE: mode,
    VITE_DATA_BACKEND: backend,
    VITE_API_BASE_URL: backend === "api" ? "https://api.example.test" : "",
  };
}

function createStandardDownloadResult(filename = "standard-effort.xlsx") {
  return {
    data: {
      filename,
      exportData: standardExportData,
      sheets: [{ name: "Summary", rows: [] }],
    },
    error: null,
  };
}

function renderManager({
  projectState = baseProjectState,
  calcState = baseCalcState,
  env = createEnv("legacy"),
  downloadStandardEffortWorkbookExport = vi.fn(),
  downloadStandardEffortSupabaseWorkbookExport = vi.fn(),
} = {}) {
  const showToast = vi.fn();

  useEstimatorStore.setState({ showToast });

  const hook = renderHook(() =>
    useExportManager({
      projectState,
      calcState,
      setters: {},
      env,
      downloadStandardEffortWorkbookExport,
      downloadStandardEffortSupabaseWorkbookExport,
    })
  );

  return {
    ...hook,
    showToast,
    downloadStandardEffortWorkbookExport,
    downloadStandardEffortSupabaseWorkbookExport,
  };
}

function source() {
  return readFileSync("src/hooks/useExportManager.js", "utf8");
}

describe("useExportManager mode-aware Excel export", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps legacy Excel export in legacy mode", () => {
    const apiDownload = vi.fn();
    const supabaseDownload = vi.fn();
    const { result, showToast } = renderManager({
      env: createEnv("legacy", "api"),
      downloadStandardEffortWorkbookExport: apiDownload,
      downloadStandardEffortSupabaseWorkbookExport: supabaseDownload,
    });

    act(() => {
      result.current.downloadExcel();
    });

    expect(apiDownload).not.toHaveBeenCalled();
    expect(supabaseDownload).not.toHaveBeenCalled();
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(expect.any(Array));
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "Standard Project.xlsx"
    );
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "emerald");
  });

  it("keeps legacy Excel export in parallel mode", () => {
    const apiDownload = vi.fn();
    const supabaseDownload = vi.fn();
    const { result } = renderManager({
      env: createEnv("parallel", "api"),
      downloadStandardEffortWorkbookExport: apiDownload,
      downloadStandardEffortSupabaseWorkbookExport: supabaseDownload,
    });

    act(() => {
      result.current.downloadExcel();
    });

    expect(apiDownload).not.toHaveBeenCalled();
    expect(supabaseDownload).not.toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
  });

  it("uses standard effort export in standard mode with API backend", async () => {
    const apiDownload = vi.fn().mockResolvedValue(
      createStandardDownloadResult("standard-effort.xlsx")
    );
    const supabaseDownload = vi.fn();
    const { result, showToast } = renderManager({
      env: createEnv("standard", "api"),
      downloadStandardEffortWorkbookExport: apiDownload,
      downloadStandardEffortSupabaseWorkbookExport: supabaseDownload,
    });
    let downloadResult;

    await act(async () => {
      downloadResult = await result.current.downloadExcel();
    });

    expect(apiDownload).toHaveBeenCalledWith("00000042", {
      includeCheckedItems: true,
    });
    expect(supabaseDownload).not.toHaveBeenCalled();
    expect(XLSX.writeFile).not.toHaveBeenCalled();
    expect(downloadResult.data.filename).toBe("standard-effort.xlsx");
    expect(
      downloadResult.data.exportData.standard_effort.results[0].standard_effort_mm
    ).toBe(12.5);
    expect(
      downloadResult.data.exportData.standard_effort.results[0].actual_effort_mm
    ).toBe(11);
    expect(downloadResult.data.exportData.standard_effort.results[0].gap_mm).toBe(
      1.5
    );
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "emerald");
  });

  it("uses Supabase standard effort export in standard mode with Supabase backend", async () => {
    const apiDownload = vi.fn();
    const supabaseDownload = vi.fn().mockResolvedValue(
      createStandardDownloadResult("standard-effort-supabase.xlsx")
    );
    const { result, showToast } = renderManager({
      env: createEnv("standard", "supabase"),
      downloadStandardEffortWorkbookExport: apiDownload,
      downloadStandardEffortSupabaseWorkbookExport: supabaseDownload,
    });
    let downloadResult;

    await act(async () => {
      downloadResult = await result.current.downloadExcel();
    });

    expect(apiDownload).not.toHaveBeenCalled();
    expect(supabaseDownload).toHaveBeenCalledWith("00000042", {
      includeCheckedItems: true,
    });
    expect(XLSX.writeFile).not.toHaveBeenCalled();
    expect(downloadResult.data.filename).toBe("standard-effort-supabase.xlsx");
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "emerald");
  });

  it("does not call any standard export when projectId is missing", async () => {
    const apiDownload = vi.fn();
    const supabaseDownload = vi.fn();
    const { result, showToast } = renderManager({
      projectState: { ...baseProjectState, projectId: "" },
      env: createEnv("standard", "supabase"),
      downloadStandardEffortWorkbookExport: apiDownload,
      downloadStandardEffortSupabaseWorkbookExport: supabaseDownload,
    });
    let downloadResult;

    await act(async () => {
      downloadResult = await result.current.downloadExcel();
    });

    expect(apiDownload).not.toHaveBeenCalled();
    expect(supabaseDownload).not.toHaveBeenCalled();
    expect(XLSX.writeFile).not.toHaveBeenCalled();
    expect(downloadResult.data).toBeNull();
    expect(downloadResult.error).toBeInstanceOf(Error);
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "red");
  });

  it("handles API standard effort export failures", async () => {
    const exportError = new Error("standard export failed");
    const apiDownload = vi.fn().mockResolvedValue({
      data: null,
      error: exportError,
    });
    const supabaseDownload = vi.fn();
    const { result, showToast } = renderManager({
      env: createEnv("standard", "api"),
      downloadStandardEffortWorkbookExport: apiDownload,
      downloadStandardEffortSupabaseWorkbookExport: supabaseDownload,
    });
    let downloadResult;

    await act(async () => {
      downloadResult = await result.current.downloadExcel();
    });

    expect(downloadResult).toEqual({ data: null, error: exportError });
    expect(supabaseDownload).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "red");
  });

  it("handles Supabase standard effort export failures", async () => {
    const exportError = new Error("supabase export failed");
    const apiDownload = vi.fn();
    const supabaseDownload = vi.fn().mockResolvedValue({
      data: null,
      error: exportError,
    });
    const { result, showToast } = renderManager({
      env: createEnv("standard", "supabase"),
      downloadStandardEffortWorkbookExport: apiDownload,
      downloadStandardEffortSupabaseWorkbookExport: supabaseDownload,
    });
    let downloadResult;

    await act(async () => {
      downloadResult = await result.current.downloadExcel();
    });

    expect(apiDownload).not.toHaveBeenCalled();
    expect(supabaseDownload).toHaveBeenCalledWith("00000042", {
      includeCheckedItems: true,
    });
    expect(XLSX.writeFile).not.toHaveBeenCalled();
    expect(downloadResult).toEqual({ data: null, error: exportError });
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "red");
  });

  it("does not wire frontend audit, repository side effects, or legacy effort fields into export manager", () => {
    const fileSource = source();

    expect(fileSource).not.toContain("createAuditLog");
    expect(fileSource).not.toContain("projectService");
    expect(fileSource).not.toContain("standardEffortRepository");
    expect(fileSource).not.toMatch(/M\/D/i);
    expect(fileSource).not.toContain("effort_md");
    expect(fileSource).not.toContain("actual_effort_md");
  });
});
