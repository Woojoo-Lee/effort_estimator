import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  buildStandardEffortSupabaseWorkbookFromInput,
  prepareStandardEffortSupabaseWorkbookExport,
} from "../src/services/export/standardEffortSupabaseExportWorkflow";

const sampleInput = {
  projectId: "7",
  projectName: "Supabase Project",
  solutionVariants: [{ solution_variant_id: "variant-wfm" }],
  itemRows: [{ item_id: "item-host" }],
  coefficientRows: [],
  projectSolutionSelections: [
    {
      project_id: "7",
      solution_variant_id: "variant-wfm",
      enabled: true,
      actual_effort_mm: 4.5,
    },
  ],
  projectItemSelections: [],
};

const sampleResults = [
  {
    solution_variant_id: "variant-wfm",
    display_name: "WFM",
    base_total_mm: 8,
    coefficient_total: 1.25,
    standard_effort_mm: 10,
    actual_effort_mm: 4.5,
    gap_mm: 5.5,
  },
];

const sampleExportData = {
  project: {
    project_id: "7",
    project_name: "Supabase Project",
  },
  standard_effort: {
    results: sampleResults,
    totals: {
      base_total_mm: 8,
      coefficient_total: 1.25,
      standard_effort_mm: 10,
      actual_effort_mm: 4.5,
      gap_mm: 5.5,
      solution_count: 1,
    },
  },
  checked_items: [],
  generated_at: "2026-06-10T00:00:00.000Z",
};

const sampleWorkbookOutput = {
  workbook: { SheetNames: ["Summary"] },
  buffer: new Uint8Array([1, 2, 3]),
  filename: "standard-effort.xlsx",
  sheets: [{ name: "Summary", rows: [] }],
};

function createDeps(overrides = {}) {
  return {
    fetchStandardEffortInput: vi.fn().mockResolvedValue(sampleInput),
    calculateStandardEffort: vi.fn().mockReturnValue(sampleResults),
    buildStandardEffortExportDataFromInput: vi
      .fn()
      .mockReturnValue(sampleExportData),
    buildStandardEffortWorkbookOutput: vi.fn().mockReturnValue(
      sampleWorkbookOutput
    ),
    ...overrides,
  };
}

function workflowSource() {
  return readFileSync(
    new URL(
      "../src/services/export/standardEffortSupabaseExportWorkflow.js",
      import.meta.url
    ),
    "utf8"
  );
}

describe("standard effort Supabase export workflow", () => {
  it("returns an error without fetching when projectId is missing", async () => {
    const deps = createDeps();

    const result = await prepareStandardEffortSupabaseWorkbookExport("", {}, deps);

    expect(deps.fetchStandardEffortInput).not.toHaveBeenCalled();
    expect(deps.calculateStandardEffort).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("projectId");
  });

  it("passes number and string project ids through to the repository facade", async () => {
    const deps = createDeps();

    await prepareStandardEffortSupabaseWorkbookExport(7, {}, deps);
    await prepareStandardEffortSupabaseWorkbookExport("0007", {}, deps);

    expect(deps.fetchStandardEffortInput.mock.calls[0][0]).toBe(7);
    expect(deps.fetchStandardEffortInput.mock.calls[1][0]).toBe("0007");
  });

  it("passes an injected client to fetchStandardEffortInput", async () => {
    const deps = createDeps();
    const client = { from: vi.fn() };

    await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      { client },
      deps
    );

    expect(deps.fetchStandardEffortInput).toHaveBeenCalledWith("7", client);
  });

  it("orchestrates fetch, calculate, export-data mapper, and workbook output", async () => {
    const options = {
      generatedAt: "2026-06-10T00:00:00.000Z",
      generatedBy: { email: "user@example.com" },
      includeUnchecked: true,
      includeCheckedItems: true,
      projectName: "Project Name From Options",
    };
    const deps = createDeps();

    const result = await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      options,
      deps
    );

    expect(deps.fetchStandardEffortInput).toHaveBeenCalledWith("7", undefined);
    expect(deps.calculateStandardEffort).toHaveBeenCalledWith(sampleInput);
    expect(deps.buildStandardEffortExportDataFromInput).toHaveBeenCalledWith({
      project: {
        project_id: "7",
        project_name: "Project Name From Options",
      },
      input: sampleInput,
      results: sampleResults,
      generatedBy: options.generatedBy,
      generatedAt: options.generatedAt,
      options,
    });
    expect(deps.buildStandardEffortWorkbookOutput).toHaveBeenCalledWith(
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

  it("builds workbook output from an already fetched input", () => {
    const deps = createDeps();
    const options = {
      project: { id: "7", project_name: "Explicit Project" },
      generatedAt: "2026-06-10T00:00:00.000Z",
      generatedBy: { email: "user@example.com" },
      includeUnchecked: true,
    };

    const output = buildStandardEffortSupabaseWorkbookFromInput(
      sampleInput,
      options,
      deps
    );

    expect(deps.fetchStandardEffortInput).not.toHaveBeenCalled();
    expect(deps.calculateStandardEffort).toHaveBeenCalledWith(sampleInput);
    expect(deps.buildStandardEffortExportDataFromInput).toHaveBeenCalledWith({
      project: { id: "7", project_name: "Explicit Project" },
      input: sampleInput,
      results: sampleResults,
      generatedBy: options.generatedBy,
      generatedAt: options.generatedAt,
      options,
    });
    expect(output).toEqual({
      exportData: sampleExportData,
      ...sampleWorkbookOutput,
    });
  });

  it("keeps actual_effort_mm in output data", async () => {
    const deps = createDeps();

    const result = await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      {},
      deps
    );

    expect(
      result.data.exportData.standard_effort.results[0].actual_effort_mm
    ).toBe(4.5);
    expect(JSON.stringify(result.data.exportData)).not.toContain(
      "actual_effort_md"
    );
  });

  it("returns an error when fetch throws", async () => {
    const fetchError = new Error("fetch failed");
    const deps = createDeps({
      fetchStandardEffortInput: vi.fn(() => {
        throw fetchError;
      }),
    });

    const result = await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      {},
      deps
    );

    expect(result).toEqual({ data: null, error: fetchError });
    expect(deps.calculateStandardEffort).not.toHaveBeenCalled();
  });

  it("returns an error when fetch returns an error result", async () => {
    const fetchError = new Error("fetch failed");
    const deps = createDeps({
      fetchStandardEffortInput: vi
        .fn()
        .mockResolvedValue({ data: null, error: fetchError }),
    });

    const result = await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      {},
      deps
    );

    expect(result).toEqual({ data: null, error: fetchError });
    expect(deps.calculateStandardEffort).not.toHaveBeenCalled();
  });

  it("returns an error when fetch returns empty data", async () => {
    const deps = createDeps({
      fetchStandardEffortInput: vi.fn().mockResolvedValue(null),
    });

    const result = await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      {},
      deps
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("input");
    expect(deps.calculateStandardEffort).not.toHaveBeenCalled();
  });

  it("returns an error when calculation throws", async () => {
    const calculateError = new Error("calculate failed");
    const deps = createDeps({
      calculateStandardEffort: vi.fn(() => {
        throw calculateError;
      }),
    });

    const result = await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      {},
      deps
    );

    expect(result).toEqual({ data: null, error: calculateError });
    expect(deps.buildStandardEffortWorkbookOutput).not.toHaveBeenCalled();
  });

  it("returns an error when workbook build throws", async () => {
    const workbookError = new Error("workbook failed");
    const deps = createDeps({
      buildStandardEffortWorkbookOutput: vi.fn(() => {
        throw workbookError;
      }),
    });

    const result = await prepareStandardEffortSupabaseWorkbookExport(
      "7",
      {},
      deps
    );

    expect(result).toEqual({ data: null, error: workbookError });
  });

  it("does not call a download helper", async () => {
    const downloadWorkbookOutput = vi.fn();
    const deps = createDeps({ downloadWorkbookOutput });

    await prepareStandardEffortSupabaseWorkbookExport("7", {}, deps);

    expect(downloadWorkbookOutput).not.toHaveBeenCalled();
  });

  it("does not use DOM, download, xlsx, API adapter, audit, or legacy effort fields", () => {
    const source = workflowSource();

    expect(source).not.toContain("downloadWorkbookOutput");
    expect(source).not.toContain("standardEffortExportDownload");
    expect(source).not.toMatch(/from ["']xlsx["']/);
    expect(source).not.toContain("Blob");
    expect(source).not.toContain("window");
    expect(source).not.toContain("document");
    expect(source).not.toContain("createObjectURL");
    expect(source).not.toContain("exportApiAdapter");
    expect(source).not.toContain("createAuditLog");
    expect(source).not.toMatch(/M\/D/i);
    expect(source).not.toContain("actual_effort_md");
    expect(source).not.toContain("standard_effort_md");
    expect(source).not.toContain("effort_md");
  });
});
