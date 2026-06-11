import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../src/services/api";
import { createStandardEffortApiAdapter } from "../src/services/adapters/api/standardEffortApiAdapter";

const apiMeta = {
  solutions: [
    {
      solution_code: "pbx",
      solution_name: "PBX",
      display_order: "10",
      active: true,
    },
  ],
  solutionVariants: [
    {
      solution_variant_id: "variant-pbx",
      solution_code: "pbx",
      variant_code: "avaya",
      variant_name: "Avaya",
      display_name: "PBX",
      display_order: "10",
      active: true,
    },
  ],
  baseEffortRows: [
    {
      solution_variant_id: "variant-pbx",
      phase_code: "analysis",
      phase_name: "Analysis",
      effort_mm: "6",
      display_order: 10,
      active: true,
    },
  ],
  itemRows: [
    {
      item_id: "item-a",
      excel_row_no: "16",
      category_l1: "Common",
      item_name: "Item A",
      display_order: 1,
      active: true,
    },
  ],
  coefficientRows: [
    {
      item_id: "item-a",
      solution_variant_id: "variant-pbx",
      coefficient: "1.25",
      active: true,
    },
  ],
};

const apiSelections = {
  projectSolutionSelections: [
    {
      project_id: "42",
      solution_variant_id: "variant-pbx",
      enabled: true,
      actual_effort_mm: "3.5",
    },
  ],
  projectItemSelections: [
    {
      project_id: "42",
      solution_variant_id: "variant-pbx",
      item_id: "item-a",
      checked: true,
    },
  ],
};

function createMockApiClient(results = []) {
  const get = vi.fn();
  const put = vi.fn();

  results.forEach((result) => {
    get.mockResolvedValueOnce(result);
  });

  return { get, put };
}

describe("standard effort API adapter read path", () => {
  it("fetches and normalizes standard effort metadata", async () => {
    const apiClient = createMockApiClient([apiMeta]);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.fetchStandardEffortMeta();

    expect(apiClient.get).toHaveBeenCalledWith("/standard-effort/meta");
    expect(result).toEqual({
      solutions: [
        {
          solution_code: "pbx",
          solution_name: "PBX",
          display_order: 10,
          active: true,
        },
      ],
      solutionVariants: [
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          display_order: 10,
          active: true,
        }),
      ],
      baseEffortRows: [
        expect.objectContaining({
          effort_mm: 6,
          phase_code: "analysis",
        }),
      ],
      itemRows: [
        expect.objectContaining({
          item_id: "item-a",
          excel_row_no: 16,
        }),
      ],
      coefficientRows: [
        expect.objectContaining({
          coefficient: 1.25,
        }),
      ],
    });
  });

  it("fetches and normalizes project standard effort selections", async () => {
    const apiClient = createMockApiClient([apiSelections]);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.fetchProjectStandardSelections("42");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/projects/42/standard-effort"
    );
    expect(result).toEqual({
      projectSolutionSelections: [
        {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          enabled: true,
          actual_effort_mm: 3.5,
        },
      ],
      projectItemSelections: [
        {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          item_id: "item-a",
          checked: true,
        },
      ],
    });
  });

  it("builds standard effort input from a full API response", async () => {
    const apiClient = createMockApiClient([
      {
        ...apiMeta,
        ...apiSelections,
      },
    ]);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.fetchStandardEffortInput(42);

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/projects/42/standard-effort"
    );
    expect(result).toEqual(
      expect.objectContaining({
        projectId: 42,
        solutionVariants: [
          expect.objectContaining({
            solution_variant_id: "variant-pbx",
            solution_name: "PBX",
          }),
        ],
        baseEffortRows: [expect.objectContaining({ effort_mm: 6 })],
        projectSolutionSelections: [
          expect.objectContaining({ actual_effort_mm: 3.5 }),
        ],
      })
    );
  });

  it("combines project selections with metadata when project response has selections only", async () => {
    const apiClient = createMockApiClient([apiSelections, apiMeta]);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.fetchStandardEffortInput("42");

    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      "/projects/42/standard-effort"
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/standard-effort/meta");
    expect(result.projectId).toBe("42");
    expect(result.solutionVariants).toHaveLength(1);
    expect(result.projectSolutionSelections[0].actual_effort_mm).toBe(3.5);
  });

  it("requires VITE_API_BASE_URL at call time when no apiClient is injected", async () => {
    const adapter = createStandardEffortApiAdapter({ env: {} });

    await expect(adapter.fetchStandardEffortMeta()).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffort API adapter."
    );
  });

  it("uses createApiClient with env base URL and preserves projectId path", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, data: apiSelections }),
        headers: { get: () => null },
      })
    );
    const adapter = createStandardEffortApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    await adapter.fetchProjectStandardSelections("42");

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/standard-effort"
    );
  });

  it("upserts solution selections through the API write path", async () => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce({
      projectSolutionSelections: [
        {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          enabled: true,
          actual_effort_mm: "4.5",
        },
      ],
    });
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.upsertProjectSolutionSelections("42", [
      {
        solution_variant_id: "variant-pbx",
        enabled: true,
        actual_effort_mm: "4.5",
      },
    ]);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/projects/42/standard-effort/solutions",
      {
        body: {
          project_id: "42",
          selections: [
            {
              project_id: "42",
              solution_variant_id: "variant-pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
        },
      }
    );
    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "variant-pbx",
        enabled: true,
        actual_effort_mm: 4.5,
      },
    ]);
  });

  it("normalizes solution selection request rows without unit conversion", async () => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce(null);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.upsertProjectSolutionSelections(42, [
      {
        solution_variant_id: "variant-pbx",
        actual_effort_mm: "",
      },
      {
        solution_variant_id: "variant-cti",
        enabled: false,
        actual_effort_mm: null,
      },
      {
        solution_variant_id: "variant-cms",
        actual_effort_md: "7.25",
      },
    ]);

    expect(apiClient.put.mock.calls[0][1].body).toEqual({
      project_id: 42,
      selections: [
        {
          project_id: 42,
          solution_variant_id: "variant-pbx",
          enabled: true,
          actual_effort_mm: 0,
        },
        {
          project_id: 42,
          solution_variant_id: "variant-cti",
          enabled: false,
          actual_effort_mm: 0,
        },
        {
          project_id: 42,
          solution_variant_id: "variant-cms",
          enabled: true,
          actual_effort_mm: 7.25,
        },
      ],
    });
    expect(result).toEqual([
      {
        project_id: 42,
        solution_variant_id: "variant-pbx",
        enabled: true,
        actual_effort_mm: 0,
      },
      {
        project_id: 42,
        solution_variant_id: "variant-cti",
        enabled: false,
        actual_effort_mm: 0,
      },
      {
        project_id: 42,
        solution_variant_id: "variant-cms",
        enabled: true,
        actual_effort_mm: 7.25,
      },
    ]);
  });

  it.each([
    ["selections", { selections: [{ solution_variant_id: "variant-pbx" }] }],
    ["rows", { rows: [{ solution_variant_id: "variant-pbx" }] }],
    ["array", [{ solution_variant_id: "variant-pbx" }]],
  ])("normalizes solution selection response data from %s", async (_name, data) => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce(data);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.upsertProjectSolutionSelections("42", [
      {
        solution_variant_id: "variant-pbx",
        enabled: false,
        actual_effort_mm: 3,
      },
    ]);

    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "variant-pbx",
        enabled: true,
        actual_effort_mm: 0,
      },
    ]);
  });

  it("requires VITE_API_BASE_URL when calling the API solution write path", async () => {
    const adapter = createStandardEffortApiAdapter({ env: {} });

    await expect(
      adapter.upsertProjectSolutionSelections("42", [
        { solution_variant_id: "variant-pbx" },
      ])
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffort API adapter."
    );
  });

  it("upserts item selections through the API write path", async () => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce({
      projectItemSelections: [
        {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          item_id: "item-a",
          checked: "Y",
        },
      ],
    });
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.upsertProjectItemSelections("42", [
      {
        solution_variant_id: "variant-pbx",
        item_id: "item-a",
        checked: true,
      },
    ]);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/projects/42/standard-effort/items",
      {
        body: {
          project_id: "42",
          selections: [
            {
              project_id: "42",
              solution_variant_id: "variant-pbx",
              item_id: "item-a",
              checked: true,
            },
          ],
        },
      }
    );
    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "variant-pbx",
        item_id: "item-a",
        checked: true,
      },
    ]);
  });

  it("normalizes truthy item checked values without touching M/M fields", async () => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce(null);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.upsertProjectItemSelections(42, [
      { solution_variant_id: "variant-a", item_id: "item-a", checked: true },
      { solution_variant_id: "variant-b", item_id: "item-b", checked: 1 },
      { solution_variant_id: "variant-c", item_id: "item-c", checked: "1" },
      { solution_variant_id: "variant-d", item_id: "item-d", checked: "Y" },
      { solution_variant_id: "variant-e", item_id: "item-e", checked: "true" },
    ]);

    expect(apiClient.put.mock.calls[0][1].body).toEqual({
      project_id: 42,
      selections: [
        {
          project_id: 42,
          solution_variant_id: "variant-a",
          item_id: "item-a",
          checked: true,
        },
        {
          project_id: 42,
          solution_variant_id: "variant-b",
          item_id: "item-b",
          checked: true,
        },
        {
          project_id: 42,
          solution_variant_id: "variant-c",
          item_id: "item-c",
          checked: true,
        },
        {
          project_id: 42,
          solution_variant_id: "variant-d",
          item_id: "item-d",
          checked: true,
        },
        {
          project_id: 42,
          solution_variant_id: "variant-e",
          item_id: "item-e",
          checked: true,
        },
      ],
    });
    expect(result.every((row) => row.checked)).toBe(true);
  });

  it("normalizes falsy item checked values", async () => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce(null);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.upsertProjectItemSelections("42", [
      { solution_variant_id: "variant-a", item_id: "item-a", checked: false },
      { solution_variant_id: "variant-b", item_id: "item-b", checked: 0 },
      { solution_variant_id: "variant-c", item_id: "item-c", checked: "0" },
      { solution_variant_id: "variant-d", item_id: "item-d", checked: "N" },
      { solution_variant_id: "variant-e", item_id: "item-e", checked: "false" },
      { solution_variant_id: "variant-f", item_id: "item-f", checked: null },
      { solution_variant_id: "variant-g", item_id: "item-g" },
      { solution_variant_id: "variant-h", item_id: "item-h", checked: "" },
    ]);

    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "variant-a",
        item_id: "item-a",
        checked: false,
      },
      {
        project_id: "42",
        solution_variant_id: "variant-b",
        item_id: "item-b",
        checked: false,
      },
      {
        project_id: "42",
        solution_variant_id: "variant-c",
        item_id: "item-c",
        checked: false,
      },
      {
        project_id: "42",
        solution_variant_id: "variant-d",
        item_id: "item-d",
        checked: false,
      },
      {
        project_id: "42",
        solution_variant_id: "variant-e",
        item_id: "item-e",
        checked: false,
      },
      {
        project_id: "42",
        solution_variant_id: "variant-f",
        item_id: "item-f",
        checked: false,
      },
      {
        project_id: "42",
        solution_variant_id: "variant-g",
        item_id: "item-g",
        checked: false,
      },
      {
        project_id: "42",
        solution_variant_id: "variant-h",
        item_id: "item-h",
        checked: false,
      },
    ]);
  });

  it("requires solution_variant_id and item_id for item selections", async () => {
    const adapter = createStandardEffortApiAdapter({
      apiClient: createMockApiClient(),
    });

    await expect(
      adapter.upsertProjectItemSelections("42", [
        {
          item_id: "item-a",
          checked: true,
        },
      ])
    ).rejects.toThrow(
      "standardEffort API adapter item selection at index 0 requires solution_variant_id."
    );
    await expect(
      adapter.upsertProjectItemSelections("42", [
        {
          solution_variant_id: "variant-pbx",
          checked: true,
        },
      ])
    ).rejects.toThrow(
      "standardEffort API adapter item selection at index 0 requires item_id."
    );
  });

  it.each([
    [
      "projectItemSelections",
      {
        projectItemSelections: [
          { solution_variant_id: "variant-pbx", item_id: "item-a" },
        ],
      },
    ],
    [
      "project_item_selections",
      {
        project_item_selections: [
          { solution_variant_id: "variant-pbx", item_id: "item-a" },
        ],
      },
    ],
    [
      "selections",
      { selections: [{ solution_variant_id: "variant-pbx", item_id: "item-a" }] },
    ],
    ["rows", { rows: [{ solution_variant_id: "variant-pbx", item_id: "item-a" }] }],
    ["array", [{ solution_variant_id: "variant-pbx", item_id: "item-a" }]],
  ])("normalizes item selection response data from %s", async (_name, data) => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce(data);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.upsertProjectItemSelections("42", [
      {
        solution_variant_id: "variant-pbx",
        item_id: "item-a",
        checked: true,
      },
    ]);

    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "variant-pbx",
        item_id: "item-a",
        checked: false,
      },
    ]);
  });

  it("requires VITE_API_BASE_URL when calling the API item write path", async () => {
    const adapter = createStandardEffortApiAdapter({ env: {} });

    await expect(
      adapter.upsertProjectItemSelections("42", [
        {
          solution_variant_id: "variant-pbx",
          item_id: "item-a",
          checked: true,
        },
      ])
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffort API adapter."
    );
  });

  it("updates actual effort through the API write path", async () => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce({
      projectSolutionSelection: {
        project_id: "42",
        solution_variant_id: "variant-pbx",
        enabled: true,
        actual_effort_mm: "6.75",
      },
    });
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.updateProjectActualEffort(
      "42",
      "variant-pbx",
      "6.75"
    );

    expect(apiClient.put).toHaveBeenCalledWith(
      "/projects/42/standard-effort/actual-effort",
      {
        body: {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          actual_effort_mm: 6.75,
        },
      }
    );
    expect(result).toEqual({
      project_id: "42",
      solution_variant_id: "variant-pbx",
      enabled: true,
      actual_effort_mm: 6.75,
    });
  });

  it("normalizes actual_effort_mm input without unit conversion", async () => {
    const apiClient = createMockApiClient();
    apiClient.put
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const emptyStringResult = await adapter.updateProjectActualEffort(
      42,
      "variant-empty",
      ""
    );
    const nullResult = await adapter.updateProjectActualEffort(
      42,
      "variant-null",
      null
    );
    const undefinedResult = await adapter.updateProjectActualEffort(
      42,
      "variant-undefined",
      undefined
    );
    const mdFallbackResult = await adapter.updateProjectActualEffort(
      42,
      "variant-md",
      { actual_effort_md: "8.25" }
    );

    expect(apiClient.put.mock.calls.map((call) => call[1].body)).toEqual([
      {
        project_id: 42,
        solution_variant_id: "variant-empty",
        actual_effort_mm: 0,
      },
      {
        project_id: 42,
        solution_variant_id: "variant-null",
        actual_effort_mm: 0,
      },
      {
        project_id: 42,
        solution_variant_id: "variant-undefined",
        actual_effort_mm: 0,
      },
      {
        project_id: 42,
        solution_variant_id: "variant-md",
        actual_effort_mm: 8.25,
      },
    ]);
    expect(emptyStringResult.actual_effort_mm).toBe(0);
    expect(nullResult.actual_effort_mm).toBe(0);
    expect(undefinedResult.actual_effort_mm).toBe(0);
    expect(mdFallbackResult.actual_effort_mm).toBe(8.25);
  });

  it("requires solution_variant_id for actual effort updates", async () => {
    const adapter = createStandardEffortApiAdapter({
      apiClient: createMockApiClient(),
    });

    await expect(
      adapter.updateProjectActualEffort("42", "", 1)
    ).rejects.toThrow(
      "standardEffort API adapter updateProjectActualEffort requires solution_variant_id."
    );
  });

  it.each([
    [
      "projectSolutionSelection",
      {
        projectSolutionSelection: {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          enabled: false,
          actual_effort_mm: "7.5",
        },
      },
    ],
    [
      "project_solution_selection",
      {
        project_solution_selection: {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          enabled: false,
          actual_effort_mm: "7.5",
        },
      },
    ],
    [
      "row",
      {
        row: {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          enabled: false,
          actual_effort_mm: "7.5",
        },
      },
    ],
    [
      "rows",
      {
        rows: [
          {
            project_id: "42",
            solution_variant_id: "variant-pbx",
            enabled: false,
            actual_effort_mm: "7.5",
          },
        ],
      },
    ],
    [
      "selection",
      {
        selection: {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          enabled: false,
          actual_effort_mm: "7.5",
        },
      },
    ],
    [
      "direct object",
      {
        project_id: "42",
        solution_variant_id: "variant-pbx",
        enabled: false,
        actual_effort_mm: "7.5",
      },
    ],
    [
      "array",
      [
        {
          project_id: "42",
          solution_variant_id: "variant-pbx",
          enabled: false,
          actual_effort_mm: "7.5",
        },
      ],
    ],
  ])("normalizes actual effort response data from %s", async (_name, data) => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce(data);
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.updateProjectActualEffort(
      "42",
      "variant-pbx",
      3
    );

    expect(result).toEqual({
      project_id: "42",
      solution_variant_id: "variant-pbx",
      enabled: false,
      actual_effort_mm: 7.5,
    });
  });

  it("falls back to input values when actual effort API returns no row", async () => {
    const apiClient = createMockApiClient();
    apiClient.put.mockResolvedValueOnce({});
    const adapter = createStandardEffortApiAdapter({ apiClient });

    const result = await adapter.updateProjectActualEffort(
      "42",
      "variant-pbx",
      "2.5"
    );

    expect(result).toEqual({
      project_id: "42",
      solution_variant_id: "variant-pbx",
      enabled: true,
      actual_effort_mm: 2.5,
    });
  });

  it("requires VITE_API_BASE_URL when calling the API actual effort write path", async () => {
    const adapter = createStandardEffortApiAdapter({ env: {} });

    await expect(
      adapter.updateProjectActualEffort("42", "variant-pbx", 1)
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffort API adapter."
    );
  });

  it("passes API errors through from the API client", async () => {
    const apiError = new ApiError({
      code: "FORBIDDEN",
      message: "Access denied",
    });
    const adapter = createStandardEffortApiAdapter({
      apiClient: {
        get: vi.fn().mockRejectedValue(apiError),
      },
    });

    await expect(adapter.fetchStandardEffortMeta()).rejects.toBe(apiError);
  });
});
