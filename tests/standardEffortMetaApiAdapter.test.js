import { describe, expect, it, vi } from "vitest";

import { createStandardEffortMetaApiAdapter } from "../src/services/adapters/api/standardEffortMetaApiAdapter";

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
      active: false,
    },
  ],
  baseEffortRows: [
    {
      base_effort_id: "base-1",
      solution_variant_id: "variant-pbx",
      phase_code: "analysis",
      phase_name: "Analysis",
      effort_mm: "",
      display_order: "10",
      active: true,
    },
    {
      base_effort_id: "base-2",
      solution_variant_id: "variant-pbx",
      phase_code: "design",
      phase_name: "Design",
      effort_md: "2.5",
      display_order: null,
      active: false,
    },
  ],
  itemRows: [
    {
      item_id: "item-a",
      excel_row_no: "16",
      category_l1: "Common",
      item_name: "Item A",
      item_option: null,
      display_order: undefined,
      active: false,
    },
  ],
  coefficientRows: [
    {
      item_id: "item-a",
      solution_variant_id: "variant-pbx",
      coefficient: "",
      active: false,
    },
  ],
  summary: {
    ignored_by_frontend_repository_shape: true,
  },
};

function createMockApiClient(data) {
  return {
    get: vi.fn().mockResolvedValue(data),
  };
}

describe("standard effort meta API adapter read path", () => {
  it("fetches admin metadata from the API endpoint", async () => {
    const apiClient = createMockApiClient(apiMeta);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    await adapter.fetchStandardEffortMetaAdmin();

    expect(apiClient.get).toHaveBeenCalledWith("/standard-effort/admin/meta");
  });

  it("normalizes direct metadata arrays and keeps inactive rows", async () => {
    const apiClient = createMockApiClient(apiMeta);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.fetchStandardEffortMetaAdmin();

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
          solution_name: "PBX",
          display_order: 10,
          active: false,
        }),
      ],
      baseEffortRows: [
        expect.objectContaining({
          phase_code: "analysis",
          effort_mm: 0,
          display_order: 10,
          active: true,
        }),
        expect.objectContaining({
          phase_code: "design",
          effort_mm: 2.5,
          display_order: 0,
          active: false,
        }),
      ],
      itemRows: [
        expect.objectContaining({
          item_id: "item-a",
          excel_row_no: 16,
          display_order: 0,
          active: false,
        }),
      ],
      coefficientRows: [
        expect.objectContaining({
          item_id: "item-a",
          coefficient: 0,
          active: false,
        }),
      ],
    });
    expect(result.summary).toBeUndefined();
  });

  it("normalizes metadata arrays nested under data.meta", async () => {
    const apiClient = createMockApiClient({
      meta: apiMeta,
      summary: { ignored: true },
    });
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.fetchStandardEffortMetaAdmin();

    expect(result.solutionVariants[0].active).toBe(false);
    expect(result.baseEffortRows[1].effort_mm).toBe(2.5);
    expect(result.coefficientRows[0].coefficient).toBe(0);
  });

  it("normalizes snake_case response keys", async () => {
    const apiClient = createMockApiClient({
      solutions: apiMeta.solutions,
      solution_variants: apiMeta.solutionVariants,
      base_effort_rows: apiMeta.baseEffortRows,
      item_rows: apiMeta.itemRows,
      coefficient_rows: apiMeta.coefficientRows,
    });
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.fetchStandardEffortMetaAdmin();

    expect(result.solutionVariants).toHaveLength(1);
    expect(result.baseEffortRows).toHaveLength(2);
    expect(result.itemRows[0].active).toBe(false);
    expect(result.coefficientRows[0].active).toBe(false);
  });

  it("requires VITE_API_BASE_URL at call time when no apiClient is injected", async () => {
    const adapter = createStandardEffortMetaApiAdapter({ env: {} });

    await expect(adapter.fetchStandardEffortMetaAdmin()).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffortMeta API adapter."
    );
  });

  it("uses createApiClient with env base URL", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, data: apiMeta }),
        headers: { get: () => null },
      })
    );
    const adapter = createStandardEffortMetaApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    await adapter.fetchStandardEffortMetaAdmin();

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/standard-effort/admin/meta"
    );
  });

  it("upserts base effort rows through the API write path", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce({
      baseEffortRows: [
        {
          solution_variant_id: "variant-pbx",
          phase_code: "analysis",
          phase_name: "Analysis",
          effort_mm: "1.5",
          display_order: "10",
          active: true,
        },
      ],
    });
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.upsertStandardBaseEffortRows("variant-pbx", [
      {
        phase_code: "analysis",
        phase_name: "Analysis",
        effort_mm: "1.5",
        display_order: 10,
        active: true,
      },
    ]);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/standard-effort/admin/base-effort/variant-pbx",
      {
        body: {
          solution_variant_id: "variant-pbx",
          phase_rows: [
            {
              phase_code: "analysis",
              phase_name: "Analysis",
              effort_mm: 1.5,
              display_order: 10,
              active: true,
            },
          ],
        },
      }
    );
    expect(result).toEqual([
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        phase_code: "analysis",
        effort_mm: 1.5,
        display_order: 10,
        active: true,
      }),
    ]);
  });

  it("normalizes base effort request rows without M/M unit conversion", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(null);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.upsertStandardBaseEffortRows("variant-pbx", [
      {
        phase_code: "analysis",
        phase_name: "Analysis",
        effort_mm: null,
      },
      {
        phase_code: "design",
        phase_name: "Design",
        effort_mm: undefined,
        active: false,
      },
      {
        phase_code: "implementation",
        phase_name: "Implementation",
        effort_mm: "",
      },
      {
        phase_code: "test",
        phase_name: "Test",
        effort_md: "2.25",
      },
      {
        phase_code: "deployment",
        phase_name: "Deployment",
        effort_mm: "3.5",
      },
    ]);

    expect(apiClient.put.mock.calls[0][1].body.phase_rows).toEqual([
      {
        phase_code: "analysis",
        phase_name: "Analysis",
        effort_mm: 0,
        display_order: 10,
        active: true,
      },
      {
        phase_code: "design",
        phase_name: "Design",
        effort_mm: 0,
        display_order: 20,
        active: false,
      },
      {
        phase_code: "implementation",
        phase_name: "Implementation",
        effort_mm: 0,
        display_order: 30,
        active: true,
      },
      {
        phase_code: "test",
        phase_name: "Test",
        effort_mm: 2.25,
        display_order: 40,
        active: true,
      },
      {
        phase_code: "deployment",
        phase_name: "Deployment",
        effort_mm: 3.5,
        display_order: 50,
        active: true,
      },
    ]);
    expect(result).toEqual([
      expect.objectContaining({ phase_code: "analysis", effort_mm: 0 }),
      expect.objectContaining({ phase_code: "design", effort_mm: 0 }),
      expect.objectContaining({ phase_code: "implementation", effort_mm: 0 }),
      expect.objectContaining({ phase_code: "test", effort_mm: 2.25 }),
      expect.objectContaining({ phase_code: "deployment", effort_mm: 3.5 }),
    ]);
  });

  it("rejects invalid base effort write payloads before calling the API", async () => {
    const adapter = createStandardEffortMetaApiAdapter({
      apiClient: createMockApiClient(apiMeta),
    });

    await expect(
      adapter.upsertStandardBaseEffortRows("", [])
    ).rejects.toThrow(
      "standardEffortMeta API adapter upsertStandardBaseEffortRows requires solution_variant_id."
    );
    await expect(
      adapter.upsertStandardBaseEffortRows("variant-pbx", null)
    ).rejects.toThrow(
      "standardEffortMeta API adapter upsertStandardBaseEffortRows requires phase_rows to be an array."
    );
    await expect(
      adapter.upsertStandardBaseEffortRows("variant-pbx", [
        { phase_name: "Analysis", effort_mm: 1 },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter base effort phase row at index 0 requires phase_code."
    );
    await expect(
      adapter.upsertStandardBaseEffortRows("variant-pbx", [
        { phase_code: "analysis", effort_mm: 1 },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter base effort phase row at index 0 requires phase_name."
    );
    await expect(
      adapter.upsertStandardBaseEffortRows("variant-pbx", [
        { phase_code: "unknown", phase_name: "Unknown", effort_mm: 1 },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter base effort phase row at index 0 has unsupported phase_code: unknown."
    );
    await expect(
      adapter.upsertStandardBaseEffortRows("variant-pbx", [
        { phase_code: "analysis", phase_name: "Analysis", effort_mm: -1 },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter base effort row effort_mm must be 0 or greater."
    );
    await expect(
      adapter.upsertStandardBaseEffortRows("variant-pbx", [
        { phase_code: "analysis", phase_name: "Analysis", effort_mm: "abc" },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter base effort row effort_mm must be a number."
    );
  });

  it.each([
    [
      "baseEffortRows",
      {
        baseEffortRows: [
          {
            phase_code: "analysis",
            phase_name: "Analysis",
            effort_mm: "1.5",
          },
        ],
      },
    ],
    [
      "base_effort_rows",
      {
        base_effort_rows: [
          {
            phase_code: "analysis",
            phase_name: "Analysis",
            effort_mm: "1.5",
          },
        ],
      },
    ],
    [
      "phaseRows",
      {
        phaseRows: [
          {
            phase_code: "analysis",
            phase_name: "Analysis",
            effort_mm: "1.5",
          },
        ],
      },
    ],
    [
      "phase_rows",
      {
        phase_rows: [
          {
            phase_code: "analysis",
            phase_name: "Analysis",
            effort_mm: "1.5",
          },
        ],
      },
    ],
    [
      "rows",
      {
        rows: [
          {
            phase_code: "analysis",
            phase_name: "Analysis",
            effort_mm: "1.5",
          },
        ],
      },
    ],
    [
      "array",
      [
        {
          phase_code: "analysis",
          phase_name: "Analysis",
          effort_mm: "1.5",
        },
      ],
    ],
  ])("normalizes base effort response data from %s", async (_name, data) => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(data);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.upsertStandardBaseEffortRows("variant-pbx", [
      {
        phase_code: "analysis",
        phase_name: "Analysis",
        effort_mm: 3,
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        phase_code: "analysis",
        effort_mm: 1.5,
      }),
    ]);
  });

  it("requires VITE_API_BASE_URL when calling the API base effort write path", async () => {
    const adapter = createStandardEffortMetaApiAdapter({ env: {} });

    await expect(
      adapter.upsertStandardBaseEffortRows("variant-pbx", [
        {
          phase_code: "analysis",
          phase_name: "Analysis",
          effort_mm: 1,
        },
      ])
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffortMeta API adapter."
    );
  });

  it("upserts coefficient rows through the API write path", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce({
      coefficientRows: [
        {
          item_id: "item-a",
          solution_variant_id: "variant-pbx",
          coefficient: "1.75",
          active: true,
        },
      ],
    });
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.upsertStandardCoefficientRows("item-a", [
      {
        solution_variant_id: "variant-pbx",
        coefficient: "1.75",
        active: true,
      },
    ]);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/standard-effort/admin/coefficients/item-a",
      {
        body: {
          item_id: "item-a",
          coefficient_rows: [
            {
              solution_variant_id: "variant-pbx",
              coefficient: 1.75,
              active: true,
            },
          ],
        },
      }
    );
    expect(result).toEqual([
      {
        item_id: "item-a",
        solution_variant_id: "variant-pbx",
        coefficient: 1.75,
        active: true,
      },
    ]);
  });

  it("normalizes coefficient request rows without effort fields", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(null);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.upsertStandardCoefficientRows("item-a", [
      {
        solution_variant_id: "variant-a",
        coefficient: null,
      },
      {
        solution_variant_id: "variant-b",
        coefficient: undefined,
        active: false,
      },
      {
        solution_variant_id: "variant-c",
        coefficient: "",
      },
      {
        solution_variant_id: "variant-d",
        coefficient: "2.25",
      },
    ]);

    expect(apiClient.put.mock.calls[0][1].body).toEqual({
      item_id: "item-a",
      coefficient_rows: [
        {
          solution_variant_id: "variant-a",
          coefficient: 0,
          active: true,
        },
        {
          solution_variant_id: "variant-b",
          coefficient: 0,
          active: false,
        },
        {
          solution_variant_id: "variant-c",
          coefficient: 0,
          active: true,
        },
        {
          solution_variant_id: "variant-d",
          coefficient: 2.25,
          active: true,
        },
      ],
    });
    expect(apiClient.put.mock.calls[0][1].body.coefficient_rows[0]).not.toHaveProperty(
      "effort_mm"
    );
    expect(apiClient.put.mock.calls[0][1].body.coefficient_rows[0]).not.toHaveProperty(
      "actual_effort_mm"
    );
    expect(result).toEqual([
      {
        item_id: "item-a",
        solution_variant_id: "variant-a",
        coefficient: 0,
        active: true,
      },
      {
        item_id: "item-a",
        solution_variant_id: "variant-b",
        coefficient: 0,
        active: false,
      },
      {
        item_id: "item-a",
        solution_variant_id: "variant-c",
        coefficient: 0,
        active: true,
      },
      {
        item_id: "item-a",
        solution_variant_id: "variant-d",
        coefficient: 2.25,
        active: true,
      },
    ]);
  });

  it("rejects invalid coefficient write payloads before calling the API", async () => {
    const adapter = createStandardEffortMetaApiAdapter({
      apiClient: createMockApiClient(apiMeta),
    });

    await expect(
      adapter.upsertStandardCoefficientRows("", [])
    ).rejects.toThrow(
      "standardEffortMeta API adapter upsertStandardCoefficientRows requires item_id."
    );
    await expect(
      adapter.upsertStandardCoefficientRows("item-a", null)
    ).rejects.toThrow(
      "standardEffortMeta API adapter upsertStandardCoefficientRows requires coefficient_rows to be an array."
    );
    await expect(
      adapter.upsertStandardCoefficientRows("item-a", [
        { coefficient: 1 },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter coefficient row at index 0 requires solution_variant_id."
    );
    await expect(
      adapter.upsertStandardCoefficientRows("item-a", [
        { solution_variant_id: "variant-pbx", coefficient: -1 },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter coefficient row coefficient must be 0 or greater."
    );
    await expect(
      adapter.upsertStandardCoefficientRows("item-a", [
        { solution_variant_id: "variant-pbx", coefficient: "abc" },
      ])
    ).rejects.toThrow(
      "standardEffortMeta API adapter coefficient row coefficient must be a number."
    );
  });

  it.each([
    [
      "coefficientRows",
      {
        coefficientRows: [
          {
            solution_variant_id: "variant-pbx",
            coefficient: "1.5",
          },
        ],
      },
    ],
    [
      "coefficient_rows",
      {
        coefficient_rows: [
          {
            solution_variant_id: "variant-pbx",
            coefficient: "1.5",
          },
        ],
      },
    ],
    [
      "rows",
      {
        rows: [
          {
            solution_variant_id: "variant-pbx",
            coefficient: "1.5",
          },
        ],
      },
    ],
    [
      "coefficients",
      {
        coefficients: [
          {
            solution_variant_id: "variant-pbx",
            coefficient: "1.5",
          },
        ],
      },
    ],
    [
      "array",
      [
        {
          solution_variant_id: "variant-pbx",
          coefficient: "1.5",
        },
      ],
    ],
  ])("normalizes coefficient response data from %s", async (_name, data) => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(data);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.upsertStandardCoefficientRows("item-a", [
      {
        solution_variant_id: "variant-pbx",
        coefficient: 3,
      },
    ]);

    expect(result).toEqual([
      {
        item_id: "item-a",
        solution_variant_id: "variant-pbx",
        coefficient: 1.5,
        active: true,
      },
    ]);
  });

  it("requires VITE_API_BASE_URL when calling the API coefficient write path", async () => {
    const adapter = createStandardEffortMetaApiAdapter({ env: {} });

    await expect(
      adapter.upsertStandardCoefficientRows("item-a", [
        {
          solution_variant_id: "variant-pbx",
          coefficient: 1,
        },
      ])
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffortMeta API adapter."
    );
  });

  it("updates solution variant active state through the API write path", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce({
      solutionVariant: {
        solution_variant_id: "variant-pbx",
        active: false,
      },
    });
    const activeAdapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await activeAdapter.updateStandardSolutionVariantActive(
      "variant-pbx",
      false
    );

    expect(apiClient.put).toHaveBeenCalledWith(
      "/standard-effort/admin/solution-variants/variant-pbx/active",
      {
        body: {
          solution_variant_id: "variant-pbx",
          active: false,
        },
      }
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("effort_mm");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("coefficient");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "actual_effort_mm"
    );
    expect(result).toEqual(
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        active: false,
      })
    );
  });

  it("rejects invalid solution variant active payloads before calling the API", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn();
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    await expect(
      adapter.updateStandardSolutionVariantActive("", true)
    ).rejects.toThrow(
      "standardEffortMeta API adapter updateStandardSolutionVariantActive requires solution_variant_id."
    );
    await expect(
      adapter.updateStandardSolutionVariantActive("variant-pbx", "false")
    ).rejects.toThrow(
      "standardEffortMeta API adapter active updates require active to be boolean."
    );
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it.each([
    [
      "solutionVariant",
      {
        solutionVariant: {
          solution_variant_id: "variant-pbx",
          active: false,
        },
      },
    ],
    [
      "solution_variant",
      {
        solution_variant: {
          solution_variant_id: "variant-pbx",
          active: false,
        },
      },
    ],
    [
      "row",
      {
        row: {
          solution_variant_id: "variant-pbx",
          active: false,
        },
      },
    ],
    [
      "rows",
      {
        rows: [
          {
            solution_variant_id: "variant-pbx",
            active: false,
          },
        ],
      },
    ],
    [
      "variant",
      {
        variant: {
          solution_variant_id: "variant-pbx",
          active: false,
        },
      },
    ],
    [
      "direct object",
      {
        solution_variant_id: "variant-pbx",
        active: false,
      },
    ],
    [
      "array",
      [
        {
          solution_variant_id: "variant-pbx",
          active: false,
        },
      ],
    ],
  ])("normalizes solution variant active response data from %s", async (_name, data) => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(data);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.updateStandardSolutionVariantActive(
      "variant-pbx",
      true
    );

    expect(result).toEqual(
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        active: false,
      })
    );
  });

  it("falls back to input values when the solution variant active response has no data", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(null);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.updateStandardSolutionVariantActive(
      "variant-pbx",
      false
    );

    expect(result).toEqual(
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        active: false,
      })
    );
  });

  it("updates standard item active state through the API write path", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce({
      item: {
        item_id: "item-a",
        active: false,
      },
    });
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.updateStandardItemActive("item-a", false);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/standard-effort/admin/items/item-a/active",
      {
        body: {
          item_id: "item-a",
          active: false,
        },
      }
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("effort_mm");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("coefficient");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "actual_effort_mm"
    );
    expect(result).toEqual(
      expect.objectContaining({
        item_id: "item-a",
        active: false,
      })
    );
  });

  it("rejects invalid standard item active payloads before calling the API", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn();
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    await expect(adapter.updateStandardItemActive("", true)).rejects.toThrow(
      "standardEffortMeta API adapter updateStandardItemActive requires item_id."
    );
    await expect(
      adapter.updateStandardItemActive("item-a", "false")
    ).rejects.toThrow(
      "standardEffortMeta API adapter active updates require active to be boolean."
    );
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it.each([
    [
      "item",
      {
        item: {
          item_id: "item-a",
          active: false,
        },
      },
    ],
    [
      "standardItem",
      {
        standardItem: {
          item_id: "item-a",
          active: false,
        },
      },
    ],
    [
      "standard_item",
      {
        standard_item: {
          item_id: "item-a",
          active: false,
        },
      },
    ],
    [
      "row",
      {
        row: {
          item_id: "item-a",
          active: false,
        },
      },
    ],
    [
      "rows",
      {
        rows: [
          {
            item_id: "item-a",
            active: false,
          },
        ],
      },
    ],
    [
      "direct object",
      {
        item_id: "item-a",
        active: false,
      },
    ],
    [
      "array",
      [
        {
          item_id: "item-a",
          active: false,
        },
      ],
    ],
  ])("normalizes standard item active response data from %s", async (_name, data) => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(data);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.updateStandardItemActive("item-a", true);

    expect(result).toEqual(
      expect.objectContaining({
        item_id: "item-a",
        active: false,
      })
    );
  });

  it("falls back to input values when the standard item active response has no data", async () => {
    const apiClient = createMockApiClient(apiMeta);
    apiClient.put = vi.fn().mockResolvedValueOnce(null);
    const adapter = createStandardEffortMetaApiAdapter({ apiClient });

    const result = await adapter.updateStandardItemActive("item-a", false);

    expect(result).toEqual(
      expect.objectContaining({
        item_id: "item-a",
        active: false,
      })
    );
  });

  it("requires VITE_API_BASE_URL when calling active write paths", async () => {
    const adapter = createStandardEffortMetaApiAdapter({ env: {} });

    await expect(
      adapter.updateStandardSolutionVariantActive("variant-pbx", false)
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffortMeta API adapter."
    );
    await expect(
      adapter.updateStandardItemActive("item-a", false)
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffortMeta API adapter."
    );
  });
});
