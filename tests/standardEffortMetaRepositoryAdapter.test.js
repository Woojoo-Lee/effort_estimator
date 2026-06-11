import { afterEach, describe, expect, it, vi } from "vitest";

import * as standardEffortMetaApiAdapter from "../src/services/adapters/api/standardEffortMetaApiAdapter";
import {
  assertRepositoryContract,
  selectStandardEffortMetaAdapter,
  STANDARD_EFFORT_META_REPOSITORY_METHODS,
} from "../src/services/adapters";
import * as standardEffortMetaSupabaseAdapter from "../src/services/adapters/supabase/standardEffortMetaSupabaseAdapter";
import * as standardEffortMetaRepository from "../src/services/standardEffortMetaRepository";

function createAdapter(name) {
  return STANDARD_EFFORT_META_REPOSITORY_METHODS.reduce(
    (adapter, methodName) => {
      adapter[methodName] = vi.fn(() => name);
      return adapter;
    },
    {}
  );
}

function createSupabaseUpsertClient(data = []) {
  const select = vi.fn(() => Promise.resolve({ data, error: null }));
  const upsert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ upsert }));

  return {
    client: { from },
    from,
    select,
    upsert,
  };
}

function createSupabaseUpdateClient(data = []) {
  const select = vi.fn(() => Promise.resolve({ data, error: null }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return {
    client: { from },
    eq,
    from,
    select,
    update,
  };
}

describe("standard effort meta repository adapter boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps the existing standard effort meta repository exports", () => {
    expect(Array.isArray(standardEffortMetaRepository.STANDARD_BASE_EFFORT_PHASES)).toBe(
      true
    );
    expect(
      standardEffortMetaRepository.STANDARD_BASE_EFFORT_PHASES.map(
        (phase) => phase.phase_code
      )
    ).toEqual(["analysis", "design", "implementation", "test", "deployment"]);

    [
      "fetchStandardEffortMetaAdmin",
      "upsertStandardBaseEffortRows",
      "upsertStandardCoefficientRows",
      "updateStandardSolutionVariantActive",
      "updateStandardItemActive",
      "buildStandardEffortMetaSummary",
    ].forEach((methodName) => {
      expect(typeof standardEffortMetaRepository[methodName]).toBe("function");
    });
  });

  it("selects the Supabase adapter by default", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectStandardEffortMetaAdapter({
        env: {},
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(supabaseAdapter);
  });

  it("selects the Supabase adapter in explicit supabase mode", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectStandardEffortMetaAdapter({
        env: { VITE_DATA_BACKEND: "supabase" },
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(supabaseAdapter);
  });

  it("selects the API adapter in api mode", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectStandardEffortMetaAdapter({
        env: { VITE_DATA_BACKEND: "api" },
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(apiAdapter);
  });

  it("selects the Supabase adapter when a client is injected, even in api mode", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectStandardEffortMetaAdapter({
        env: { VITE_DATA_BACKEND: "api" },
        client: { from: vi.fn() },
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(supabaseAdapter);
  });

  it("validates both standard effort meta adapters against the contract", () => {
    expect(
      assertRepositoryContract(
        standardEffortMetaSupabaseAdapter,
        STANDARD_EFFORT_META_REPOSITORY_METHODS,
        "standardEffortMetaSupabaseAdapter"
      )
    ).toBe(true);
    expect(
      assertRepositoryContract(
        standardEffortMetaApiAdapter,
        STANDARD_EFFORT_META_REPOSITORY_METHODS,
        "standardEffortMetaApiAdapter"
      )
    ).toBe(true);
  });

  it("uses the API adapter read path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              solutions: [],
              solutionVariants: [],
              baseEffortRows: [],
              itemRows: [],
              coefficientRows: [],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    await expect(
      standardEffortMetaRepository.fetchStandardEffortMetaAdmin()
    ).resolves.toEqual({
      solutions: [],
      solutionVariants: [],
      baseEffortRows: [],
      itemRows: [],
      coefficientRows: [],
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/standard-effort/admin/meta"
    );
  });

  it("uses the API adapter base effort write path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              rows: [
                {
                  solution_variant_id: "variant-pbx",
                  phase_code: "analysis",
                  phase_name: "Analysis",
                  effort_mm: "1.5",
                  display_order: 10,
                  active: true,
                },
              ],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await standardEffortMetaRepository.upsertStandardBaseEffortRows(
      "variant-pbx",
      [
        {
          phase_code: "analysis",
          phase_name: "Analysis",
          effort_mm: "1.5",
        },
      ]
    );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/standard-effort/admin/base-effort/variant-pbx"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
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
    });
    expect(result).toEqual([
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        phase_code: "analysis",
        effort_mm: 1.5,
      }),
    ]);
  });

  it("uses injected Supabase client for base effort writes even in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const { client, upsert } = createSupabaseUpsertClient([
      {
        solution_variant_id: "variant-pbx",
        phase_code: "analysis",
        phase_name: "Analysis",
        effort_mm: 1.5,
        display_order: 10,
        active: true,
      },
    ]);

    const result = await standardEffortMetaRepository.upsertStandardBaseEffortRows(
      "variant-pbx",
      [
        {
          phase_code: "analysis",
          phase_name: "Analysis",
          effort_mm: "1.5",
        },
      ],
      client
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          phase_code: "analysis",
          phase_name: "Analysis",
          effort_mm: 1.5,
          display_order: 10,
          active: true,
        }),
      ],
      { onConflict: "solution_variant_id,phase_code" }
    );
    expect(result).toEqual([
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        phase_code: "analysis",
        effort_mm: 1.5,
      }),
    ]);
  });

  it("uses the API adapter coefficient write path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              rows: [
                {
                  item_id: "item-a",
                  solution_variant_id: "variant-pbx",
                  coefficient: "1.75",
                  active: true,
                },
              ],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await standardEffortMetaRepository.upsertStandardCoefficientRows(
      "item-a",
      [
        {
          solution_variant_id: "variant-pbx",
          coefficient: "1.75",
        },
      ]
    );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/standard-effort/admin/coefficients/item-a"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      item_id: "item-a",
      coefficient_rows: [
        {
          solution_variant_id: "variant-pbx",
          coefficient: 1.75,
          active: true,
        },
      ],
    });
    expect(result).toEqual([
      {
        item_id: "item-a",
        solution_variant_id: "variant-pbx",
        coefficient: 1.75,
        active: true,
      },
    ]);
  });

  it("uses injected Supabase client for coefficient writes even in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const { client, upsert } = createSupabaseUpsertClient([
      {
        item_id: "item-a",
        solution_variant_id: "variant-pbx",
        coefficient: 1.75,
        active: true,
      },
    ]);

    const result = await standardEffortMetaRepository.upsertStandardCoefficientRows(
      "item-a",
      [
        {
          solution_variant_id: "variant-pbx",
          coefficient: "1.75",
        },
      ],
      client
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          item_id: "item-a",
          solution_variant_id: "variant-pbx",
          coefficient: 1.75,
          active: true,
        }),
      ],
      { onConflict: "item_id,solution_variant_id" }
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

  it("uses the API adapter solution variant active write path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              row: {
                solution_variant_id: "variant-pbx",
                active: false,
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result =
      await standardEffortMetaRepository.updateStandardSolutionVariantActive(
        "variant-pbx",
        false
      );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/standard-effort/admin/solution-variants/variant-pbx/active"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      solution_variant_id: "variant-pbx",
      active: false,
    });
    expect(result).toEqual(
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        active: false,
      })
    );
  });

  it("uses the API adapter standard item active write path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              row: {
                item_id: "item-a",
                active: false,
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await standardEffortMetaRepository.updateStandardItemActive(
      "item-a",
      false
    );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/standard-effort/admin/items/item-a/active"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      item_id: "item-a",
      active: false,
    });
    expect(result).toEqual(
      expect.objectContaining({
        item_id: "item-a",
        active: false,
      })
    );
  });

  it("uses injected Supabase client for active writes even in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const { client, update, eq } = createSupabaseUpdateClient([
      {
        solution_variant_id: "variant-pbx",
        active: false,
      },
    ]);

    const result =
      await standardEffortMetaRepository.updateStandardSolutionVariantActive(
        "variant-pbx",
        false,
        client
      );

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    expect(eq).toHaveBeenCalledWith("solution_variant_id", "variant-pbx");
    expect(result).toEqual(
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        active: false,
      })
    );
  });

  it("keeps buildStandardEffortMetaSummary as a pure facade export", () => {
    const summary = standardEffortMetaRepository.buildStandardEffortMetaSummary({
      solutions: [{ solution_code: "pbx" }],
      solutionVariants: [
        {
          solution_variant_id: "variant-pbx",
          solution_code: "pbx",
          display_name: "PBX",
          active: true,
        },
      ],
      baseEffortRows: [
        {
          solution_variant_id: "variant-pbx",
          phase_code: "analysis",
          effort_mm: 1.25,
        },
      ],
      itemRows: [],
      coefficientRows: [],
    });

    expect(summary).toEqual(
      expect.objectContaining({
        solution_count: 1,
        solution_variant_count: 1,
        base_effort_count: 1,
      })
    );
    expect(summary.base_total_by_variant).toEqual([
      expect.objectContaining({
        solution_variant_id: "variant-pbx",
        base_total_mm: 1.25,
      }),
    ]);
  });
});
