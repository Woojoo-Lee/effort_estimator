import { describe, expect, it, vi } from "vitest";

import { createExportApiAdapter } from "../src/services/adapters/api/exportApiAdapter";

function createResponse(payload, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: () => Promise.resolve(payload),
    headers: { get: () => null },
  };
}

function createAdapterWithData(data) {
  const apiClient = {
    get: vi.fn(() => Promise.resolve(data)),
  };

  return {
    adapter: createExportApiAdapter({ apiClient }),
    apiClient,
  };
}

describe("export API adapter", () => {
  it("fetchStandardEffortExportData calls GET /projects/{projectId}/standard-effort/export-data", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            project: { id: "00000042", project_id: "00000042" },
            standard_effort: {
              results: [{ solution_variant_id: "variant-1" }],
              totals: {},
            },
          },
        })
      )
    );
    const adapter = createExportApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.fetchStandardEffortExportData("00000042");

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/00000042/standard-effort/export-data"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("GET");
    expect(result.data.project.id).toBe("00000042");
    expect(result.error).toBeNull();
  });

  it("does not convert numeric project ids to UUIDs", async () => {
    const apiClient = {
      get: vi.fn(() => Promise.resolve({ project: { id: 42, project_id: 42 } })),
    };
    const adapter = createExportApiAdapter({ apiClient });

    const result = await adapter.fetchStandardEffortExportData(42);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/projects/42/standard-effort/export-data",
      { query: {} }
    );
    expect(result.data.project).toEqual({ id: 42, project_id: 42 });
  });

  it("sends include_checked_items=false only when includeCheckedItems is false", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {},
        })
      )
    );
    const adapter = createExportApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com" },
      fetchImpl,
    });

    await adapter.fetchStandardEffortExportData("42", {
      includeCheckedItems: false,
    });
    await adapter.fetchStandardEffortExportData("42", {
      includeCheckedItems: true,
    });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/standard-effort/export-data?include_checked_items=false"
    );
    expect(fetchImpl.mock.calls[1][0]).toBe(
      "https://api.example.com/projects/42/standard-effort/export-data"
    );
  });

  it("returns a base URL error without VITE_API_BASE_URL", async () => {
    const adapter = createExportApiAdapter({ env: {} });

    const result = await adapter.fetchStandardEffortExportData("42");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using export API adapter."
    );
  });

  it("returns missing projectId errors in the existing surface", async () => {
    const adapter = createExportApiAdapter({ apiClient: { get: vi.fn() } });

    const result = await adapter.fetchStandardEffortExportData("");

    expect(result.data).toBeNull();
    expect(result.error.message).toBe(
      "export API adapter fetchStandardEffortExportData requires projectId."
    );
  });

  it("returns API errors in the existing surface", async () => {
    const error = new Error("API failed");
    const adapter = createExportApiAdapter({
      apiClient: {
        get: vi.fn(() => Promise.reject(error)),
      },
    });

    await expect(adapter.fetchStandardEffortExportData("42")).resolves.toEqual({
      data: null,
      error,
    });
  });

  it.each([
    ["direct payload", { project: { id: "42" }, standard_effort: { results: [], totals: {} } }],
    [
      "exportData",
      { exportData: { project: { id: "43" }, standard_effort: { results: [], totals: {} } } },
    ],
    [
      "export_data",
      { export_data: { project: { id: "44" }, standard_effort: { results: [], totals: {} } } },
    ],
  ])("normalizes %s response payloads", async (_label, data) => {
    const { adapter } = createAdapterWithData(data);
    const expectedProject = data.exportData?.project || data.export_data?.project || data.project;

    await expect(adapter.fetchStandardEffortExportData("42")).resolves.toEqual({
      data: {
        ...((data.exportData || data.export_data || data)),
        project: expectedProject,
        standard_effort: {
          results: [],
          totals: {},
        },
        selections: {
          projectSolutionSelections: [],
          projectItemSelections: [],
        },
        checked_items: [],
      },
      error: null,
    });
  });

  it("normalizes camelCase standardEffort and checkedItems", async () => {
    const { adapter } = createAdapterWithData({
      project: { id: "42", project_id: "42" },
      standardEffort: {
        results: [
          {
            solution_variant_id: "variant-1",
            base_total_mm: "",
            coefficient_total: "1.25",
            standard_effort_mm: null,
            actual_effort_mm: undefined,
            gap_mm: "",
            base_md: 999,
          },
        ],
        totals: {
          base_total_mm: "",
          standard_effort_mm: "10",
          actual_effort_mm: null,
          gap_mm: undefined,
          solution_count: "1",
        },
      },
      selections: {
        project_solution_selections: [{ project_id: "42" }],
        project_item_selections: [{ item_id: "item-1" }],
      },
      checkedItems: [
        {
          solution_variant_id: "variant-1",
          item_id: "item-1",
          coefficient: "",
          checked: "Y",
          effort_md: 12,
        },
      ],
    });

    const result = await adapter.fetchStandardEffortExportData("42");

    expect(result.data.project).toEqual({ id: "42", project_id: "42" });
    expect(result.data.standard_effort.results).toEqual([
      {
        solution_variant_id: "variant-1",
        base_total_mm: 0,
        coefficient_total: 1.25,
        standard_effort_mm: 0,
        actual_effort_mm: 0,
        gap_mm: 0,
      },
    ]);
    expect(result.data.standard_effort.totals).toEqual({
      base_total_mm: 0,
      standard_effort_mm: 10,
      actual_effort_mm: 0,
      gap_mm: 0,
      solution_count: 1,
    });
    expect(result.data.selections.projectSolutionSelections).toEqual([
      { project_id: "42" },
    ]);
    expect(result.data.selections.projectItemSelections).toEqual([
      { item_id: "item-1" },
    ]);
    expect(result.data.checked_items).toEqual([
      {
        solution_variant_id: "variant-1",
        item_id: "item-1",
        coefficient: 0,
        checked: true,
      },
    ]);
  });

  it("normalizes results/totals/rows fallback payloads", async () => {
    const { adapter } = createAdapterWithData({
      project: { project_id: "42" },
      rows: [
        {
          solution_variant_id: "variant-1",
          base_total_mm: "5",
          coefficient_total: 2,
          standard_effort_mm: "10",
          actual_effort_mm: "6",
          gap_mm: "4",
        },
      ],
      totals: {
        base_total_mm: "5",
        standard_effort_mm: "10",
        actual_effort_mm: "6",
        gap_mm: "4",
      },
    });

    const result = await adapter.fetchStandardEffortExportData("42");

    expect(result.data.standard_effort.results).toEqual([
      {
        solution_variant_id: "variant-1",
        base_total_mm: 5,
        coefficient_total: 2,
        standard_effort_mm: 10,
        actual_effort_mm: 6,
        gap_mm: 4,
      },
    ]);
    expect(result.data.standard_effort.totals).toEqual({
      base_total_mm: 5,
      standard_effort_mm: 10,
      actual_effort_mm: 6,
      gap_mm: 4,
    });
  });

  it.each([
    ["true", true],
    ["1", true],
    ["Y", true],
    ["false", false],
    [0, false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("normalizes checked item checked=%s", async (checked, expected) => {
    const { adapter } = createAdapterWithData({
      checked_items: [{ item_id: "item-1", coefficient: 1, checked }],
    });

    const result = await adapter.fetchStandardEffortExportData("42");

    expect(result.data.checked_items[0].checked).toBe(expected);
  });

  it("keeps standard export payload separate from legacy md fields", async () => {
    const { adapter } = createAdapterWithData({
      standard_effort: {
        results: [
          {
            solution_variant_id: "variant-1",
            base_md: 1,
            effort_md: 2,
            base_total_mm: 3,
            coefficient_total: 4,
            standard_effort_mm: 5,
            actual_effort_mm: 6,
            gap_mm: 7,
          },
        ],
      },
      checked_items: [
        {
          item_id: "item-1",
          coefficient: 1,
          checked: true,
          default_base_md: 8,
        },
      ],
    });

    const result = await adapter.fetchStandardEffortExportData("42");

    expect(result.data.standard_effort.results[0]).not.toHaveProperty("base_md");
    expect(result.data.standard_effort.results[0]).not.toHaveProperty("effort_md");
    expect(result.data.checked_items[0]).not.toHaveProperty("default_base_md");
    expect(result.data.standard_effort.results[0].base_total_mm).toBe(3);
    expect(result.data.standard_effort.results[0].standard_effort_mm).toBe(5);
  });

  it("keeps legacy and file download exports as stubs", async () => {
    const adapter = createExportApiAdapter({ apiClient: { get: vi.fn() } });

    await expect(adapter.fetchLegacyExportData("42")).resolves.toMatchObject({
      data: null,
      error: expect.any(Error),
    });
    await expect(
      adapter.downloadStandardEffortExport("42")
    ).resolves.toMatchObject({
      data: null,
      error: expect.any(Error),
    });
    await expect(adapter.downloadLegacyExport("42")).resolves.toMatchObject({
      data: null,
      error: expect.any(Error),
    });
  });
});
