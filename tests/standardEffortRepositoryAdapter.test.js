import { afterEach, describe, expect, it, vi } from "vitest";

import * as standardEffortApiAdapter from "../src/services/adapters/api/standardEffortApiAdapter";
import {
  selectStandardEffortAdapter,
  STANDARD_EFFORT_REPOSITORY_METHODS,
  assertRepositoryContract,
} from "../src/services/adapters";
import * as standardEffortSupabaseAdapter from "../src/services/adapters/supabase/standardEffortSupabaseAdapter";
import * as standardEffortRepository from "../src/services/standardEffortRepository";

const FIXED_NOW_ISO = "2026-06-08T09:10:11.123Z";

function useFixedSystemTime() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_NOW_ISO));
}

function createAdapter(name) {
  return STANDARD_EFFORT_REPOSITORY_METHODS.reduce((adapter, methodName) => {
    adapter[methodName] = vi.fn(() => name);
    return adapter;
  }, {});
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

function createSupabaseActualEffortClient(data = [], insertData = null) {
  const select = vi.fn(() => Promise.resolve({ data, error: null }));
  const secondEq = vi.fn(() => ({ select }));
  const firstEq = vi.fn(() => ({ eq: secondEq }));
  const update = vi.fn(() => ({ eq: firstEq }));
  const single = vi.fn(() =>
    Promise.resolve({
      data:
        insertData || {
          project_id: "42",
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 0,
        },
      error: null,
    })
  );
  const insertSelect = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: insertSelect }));
  const from = vi.fn(() => ({ update, insert }));

  return {
    client: { from },
    from,
    update,
    firstEq,
    secondEq,
    select,
    insert,
    insertSelect,
    single,
  };
}

describe("standard effort repository adapter boundary", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps the existing standard effort repository exports", () => {
    STANDARD_EFFORT_REPOSITORY_METHODS.forEach((methodName) => {
      expect(typeof standardEffortRepository[methodName]).toBe("function");
    });
  });

  it("selects the Supabase adapter by default", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectStandardEffortAdapter({
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
      selectStandardEffortAdapter({
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
      selectStandardEffortAdapter({
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
      selectStandardEffortAdapter({
        env: { VITE_DATA_BACKEND: "api" },
        client: { from: vi.fn() },
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(supabaseAdapter);
  });

  it("validates both standard effort adapters against the contract", () => {
    expect(
      assertRepositoryContract(
        standardEffortSupabaseAdapter,
        STANDARD_EFFORT_REPOSITORY_METHODS,
        "standardEffortSupabaseAdapter"
      )
    ).toBe(true);
    expect(
      assertRepositoryContract(
        standardEffortApiAdapter,
        STANDARD_EFFORT_REPOSITORY_METHODS,
        "standardEffortApiAdapter"
      )
    ).toBe(true);
  });

  it("uses injected Supabase client through the facade without uuid conversion", async () => {
    useFixedSystemTime();
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const { client, upsert } = createSupabaseUpsertClient([
      {
        project_id: "42",
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 3.5,
      },
    ]);

    const result = await standardEffortRepository.upsertProjectSolutionSelections(
      "42",
      [
        {
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 3.5,
        },
      ],
      client
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        {
          project_id: "42",
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 3.5,
          updated_at: FIXED_NOW_ISO,
        },
      ],
      { onConflict: "project_id,solution_variant_id" }
    );
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("actual_effort_md");
    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 3.5,
      },
    ]);
  });

  it("uses injected Supabase client for item writes even in api mode", async () => {
    useFixedSystemTime();
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const { client, upsert } = createSupabaseUpsertClient([
      {
        project_id: "42",
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: true,
      },
    ]);

    const result = await standardEffortRepository.upsertProjectItemSelections(
      "42",
      [
        {
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: "Y",
        },
      ],
      client
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        {
          project_id: "42",
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: true,
          updated_at: FIXED_NOW_ISO,
        },
      ],
      { onConflict: "project_id,solution_variant_id,item_id" }
    );
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("effort_mm");
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("actual_effort_mm");
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("actual_effort_md");
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty(
      "standard_effort_mm"
    );
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("gap_mm");
    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: true,
      },
    ]);
  });

  it("uses injected Supabase client for actual effort writes even in api mode", async () => {
    useFixedSystemTime();
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const { client, update, firstEq, secondEq } =
      createSupabaseActualEffortClient([
        {
          project_id: "42",
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 4.5,
        },
      ]);

    const result = await standardEffortRepository.updateProjectActualEffort(
      "42",
      "pbx",
      "4.5",
      client
    );

    expect(update).toHaveBeenCalledWith({
      actual_effort_mm: 4.5,
      updated_at: FIXED_NOW_ISO,
    });
    expect(update.mock.calls[0][0]).not.toHaveProperty("actual_effort_md");
    expect(firstEq).toHaveBeenCalledWith("project_id", "42");
    expect(secondEq).toHaveBeenCalledWith("solution_variant_id", "pbx");
    expect(result).toEqual({
      project_id: "42",
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 4.5,
    });
  });

  it("adds updated_at to the Supabase actual effort insert fallback", async () => {
    useFixedSystemTime();
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const { client, insert } = createSupabaseActualEffortClient([], {
      project_id: "42",
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 0,
    });

    const result = await standardEffortRepository.updateProjectActualEffort(
      "42",
      "pbx",
      "",
      client
    );

    expect(insert).toHaveBeenCalledWith({
      project_id: "42",
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 0,
      updated_at: FIXED_NOW_ISO,
    });
    expect(insert.mock.calls[0][0]).not.toHaveProperty("actual_effort_md");
    expect(result).toEqual({
      project_id: "42",
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 0,
    });
  });

  it("adds row history updater to Supabase solution and item selection writes when a user is provided", async () => {
    useFixedSystemTime();
    const solutionClient = createSupabaseUpsertClient();
    const itemClient = createSupabaseUpsertClient();

    await standardEffortRepository.upsertProjectSolutionSelections(
      "42",
      [
        {
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 3.5,
        },
      ],
      solutionClient.client,
      { currentUser: { user_id: "user-1", email: "ignored@example.com" } }
    );
    await standardEffortRepository.upsertProjectItemSelections(
      "42",
      [
        {
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: true,
        },
      ],
      itemClient.client,
      { currentUser: { user_id: "user-1" } }
    );

    expect(solutionClient.upsert.mock.calls[0][0][0]).toMatchObject({
      project_id: "42",
      solution_variant_id: "pbx",
      updated_at: FIXED_NOW_ISO,
      updated_by: "user-1",
    });
    expect(solutionClient.upsert.mock.calls[0][0][0]).not.toHaveProperty(
      "created_by"
    );
    expect(solutionClient.upsert.mock.calls[0][0][0]).not.toHaveProperty(
      "email"
    );
    expect(itemClient.upsert.mock.calls[0][0][0]).toMatchObject({
      project_id: "42",
      solution_variant_id: "pbx",
      item_id: "item-a",
      updated_at: FIXED_NOW_ISO,
      updated_by: "user-1",
    });
    expect(itemClient.upsert.mock.calls[0][0][0]).not.toHaveProperty(
      "created_by"
    );
  });

  it("adds row history fields to actual effort update and insert fallback when a user is provided", async () => {
    useFixedSystemTime();
    const updateClient = createSupabaseActualEffortClient([
      {
        project_id: "42",
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 4.5,
      },
    ]);
    const insertClient = createSupabaseActualEffortClient([], {
      project_id: "42",
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 0,
    });

    await standardEffortRepository.updateProjectActualEffort(
      "42",
      "pbx",
      "4.5",
      updateClient.client,
      { currentUser: { user_id: "user-1" } }
    );
    await standardEffortRepository.updateProjectActualEffort(
      "42",
      "pbx",
      "",
      insertClient.client,
      { currentUser: { user_id: "user-1" } }
    );

    expect(updateClient.update).toHaveBeenCalledWith({
      actual_effort_mm: 4.5,
      updated_at: FIXED_NOW_ISO,
      updated_by: "user-1",
    });
    expect(updateClient.update.mock.calls[0][0]).not.toHaveProperty(
      "created_by"
    );
    expect(insertClient.insert).toHaveBeenCalledWith({
      project_id: "42",
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 0,
      updated_at: FIXED_NOW_ISO,
      created_by: "user-1",
      updated_by: "user-1",
    });
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
      standardEffortRepository.fetchStandardEffortMeta()
    ).resolves.toEqual({
      solutions: [],
      solutionVariants: [],
      baseEffortRows: [],
      itemRows: [],
      coefficientRows: [],
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/standard-effort/meta"
    );
  });

  it("uses the API adapter solution write path through the facade in api mode", async () => {
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
              selections: [
                {
                  project_id: "42",
                  solution_variant_id: "pbx",
                  enabled: true,
                  actual_effort_mm: "3.5",
                },
              ],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await standardEffortRepository.upsertProjectSolutionSelections(
      "42",
      [
        {
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 3.5,
        },
      ]
    );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/standard-effort/solutions"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
      selections: [
        {
          project_id: "42",
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 3.5,
        },
      ],
    });
    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 3.5,
      },
    ]);
  });

  it("uses the API adapter item write path through the facade in api mode", async () => {
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
              selections: [
                {
                  project_id: "42",
                  solution_variant_id: "pbx",
                  item_id: "item-a",
                  checked: "Y",
                },
              ],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await standardEffortRepository.upsertProjectItemSelections(
      "42",
      [
        {
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: true,
        },
      ]
    );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/standard-effort/items"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
      selections: [
        {
          project_id: "42",
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: true,
        },
      ],
    });
    expect(result).toEqual([
      {
        project_id: "42",
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: true,
      },
    ]);
  });

  it("uses the API adapter actual effort write path through the facade in api mode", async () => {
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
                project_id: "42",
                solution_variant_id: "pbx",
                enabled: true,
                actual_effort_mm: "4.5",
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await standardEffortRepository.updateProjectActualEffort(
      "42",
      "pbx",
      "4.5"
    );

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/standard-effort/actual-effort"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
      solution_variant_id: "pbx",
      actual_effort_mm: 4.5,
    });
    expect(result).toEqual({
      project_id: "42",
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 4.5,
    });
  });


  it("throws a base URL error through the facade in api mode when VITE_API_BASE_URL is missing", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");

    await expect(
      standardEffortRepository.fetchStandardEffortMeta()
    ).rejects.toThrow(
      "VITE_API_BASE_URL is required when using standardEffort API adapter."
    );
  });
});
