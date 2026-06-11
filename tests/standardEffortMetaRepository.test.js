import { describe, expect, it, vi } from "vitest";

import {
  buildStandardEffortMetaSummary,
  fetchStandardEffortMetaAdmin,
  updateStandardItemActive,
  updateStandardSolutionVariantActive,
  upsertStandardCoefficientRows,
  upsertStandardBaseEffortRows,
} from "../src/services/standardEffortMetaRepository";
import { buildStandardEffortSeedData } from "../scripts/generate-standard-effort-seed.mjs";

function createQuery(table, data, error = null) {
  const query = {
    table,
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn(() => {
      throw new Error("fetchStandardEffortMetaAdmin should not filter active rows.");
    }),
    then: (resolve, reject) =>
      Promise.resolve({ data, error }).then(resolve, reject),
  };

  return query;
}

function createClient(tableData = {}) {
  const queries = [];
  const client = {
    queries,
    from: vi.fn((table) => {
      const query = createQuery(table, tableData[table] || []);
      queries.push(query);
      return query;
    }),
  };

  return client;
}

function createUpsertClient({ data = null, error = null } = {}) {
  const query = {
    select: vi.fn(() =>
      Promise.resolve({
        data: data || query.rows,
        error,
      })
    ),
  };
  const table = {
    upsert: vi.fn((rows, options) => {
      query.rows = rows;
      query.options = options;
      return query;
    }),
  };

  return {
    table,
    query,
    from: vi.fn(() => table),
  };
}

function createUpdateClient({ data = null, error = null } = {}) {
  const query = {
    eq: vi.fn(() => query),
    select: vi.fn(() =>
      Promise.resolve({
        data: data || query.data || [],
        error,
      })
    ),
  };
  const table = {
    update: vi.fn((payload) => {
      query.payload = payload;
      query.data = [{ ...payload }];
      return query;
    }),
  };

  return {
    table,
    query,
    from: vi.fn(() => table),
  };
}

function variantKey(solutionCode, variantCode) {
  return `${solutionCode}:${variantCode}`;
}

function buildSeedMeta() {
  const seedData = buildStandardEffortSeedData();
  const solutionVariants = seedData.solutionVariants.map((variant) => ({
    ...variant,
    solution_variant_id: variantKey(
      variant.solution_code,
      variant.variant_code
    ),
  }));

  return {
    solutions: seedData.solutions,
    solutionVariants,
    baseEffortRows: seedData.baseEffortRows.map((row) => ({
      ...row,
      solution_variant_id: variantKey(row.solution_code, row.variant_code),
    })),
    itemRows: seedData.itemRows,
    coefficientRows: seedData.coefficientRows.map((row) => ({
      item_id: row.item_id,
      solution_variant_id: variantKey(row.solution_code, row.variant_code),
      coefficient: row.coefficient,
      active: row.active,
    })),
  };
}

describe("standardEffortMetaRepository", () => {
  it("fetches admin metadata including inactive rows without active filters", async () => {
    const client = createClient({
      estimation_solution: [
        {
          solution_code: "pbx",
          solution_name: "PBX",
          display_order: 10,
          active: true,
        },
      ],
      estimation_solution_variant: [
        {
          solution_variant_id: "variant-pbx",
          solution_code: "pbx",
          variant_code: "avaya",
          variant_name: "Avaya",
          display_name: "PBX",
          display_order: 10,
          active: false,
        },
      ],
      estimation_standard_base_effort_meta: [
        {
          base_effort_id: "base-1",
          solution_variant_id: "variant-pbx",
          phase_code: "analysis",
          phase_name: "분석",
          effort_mm: "1.25",
          display_order: 10,
          active: true,
        },
      ],
      estimation_standard_item_meta: [
        {
          item_id: "item-1",
          category_l1: "공통정보",
          item_name: "업종",
          item_option: "금융",
          display_order: 10,
          active: false,
        },
      ],
      estimation_item_solution_coefficient_meta: [
        {
          item_id: "item-1",
          solution_variant_id: "variant-pbx",
          coefficient: "0.5",
          active: false,
        },
      ],
    });

    const meta = await fetchStandardEffortMetaAdmin(client);

    expect(meta.solutionVariants[0]).toMatchObject({
      solution_variant_id: "variant-pbx",
      solution_name: "PBX",
      active: false,
    });
    expect(meta.itemRows[0].active).toBe(false);
    expect(meta.coefficientRows[0].active).toBe(false);
    expect(client.queries.every((query) => query.eq.mock.calls.length === 0)).toBe(
      true
    );
  });

  it("builds row counts and base totals from effort_mm", () => {
    const summary = buildStandardEffortMetaSummary({
      solutions: [{ solution_code: "pbx" }],
      solutionVariants: [
        {
          solution_variant_id: "variant-pbx",
          display_name: "PBX",
          display_order: 10,
          active: true,
        },
        {
          solution_variant_id: "variant-cti",
          display_name: "CTI v4",
          display_order: 20,
          active: false,
        },
      ],
      baseEffortRows: [
        { solution_variant_id: "variant-pbx", effort_mm: "1.5" },
        { solution_variant_id: "variant-pbx", effort_mm: "4.5" },
        { solution_variant_id: "variant-cti", effort_mm: "2" },
      ],
      itemRows: [{ item_id: "item-1", active: true }],
      coefficientRows: [
        { item_id: "item-1", solution_variant_id: "variant-pbx", active: true },
        { item_id: "item-1", solution_variant_id: "variant-cti", active: false },
      ],
    });

    expect(summary).toMatchObject({
      solution_count: 1,
      solution_variant_count: 2,
      base_effort_count: 3,
      item_count: 1,
      coefficient_count: 2,
      active_solution_variant_count: 1,
      active_item_count: 1,
      active_coefficient_count: 1,
    });
    expect(summary.base_total_by_variant).toEqual([
      {
        solution_variant_id: "variant-pbx",
        display_name: "PBX",
        base_total_mm: 6,
      },
      {
        solution_variant_id: "variant-cti",
        display_name: "CTI v4",
        base_total_mm: 2,
      },
    ]);
  });

  it("falls back to effort_md while emitting base_total_mm", () => {
    const summary = buildStandardEffortMetaSummary({
      solutionVariants: [
        {
          solution_variant_id: "variant-wfm",
          display_name: "WFM",
        },
      ],
      baseEffortRows: [
        { solution_variant_id: "variant-wfm", effort_md: "3" },
        { solution_variant_id: "variant-wfm", effort_mm: "" },
      ],
    });

    expect(summary.base_total_by_variant[0]).toEqual({
      solution_variant_id: "variant-wfm",
      display_name: "WFM",
      base_total_mm: 3,
    });
  });

  it("builds validation checks for seed row counts, coefficient completeness, and S1 preview", () => {
    const summary = buildStandardEffortMetaSummary(buildSeedMeta());
    const countByKey = Object.fromEntries(
      summary.row_count_checks.map((row) => [row.key, row])
    );
    const s1ByKey = Object.fromEntries(
      summary.s1_fixture_preview.rows.map((row) => [row.key, row])
    );

    expect(countByKey.solution_count).toMatchObject({
      actual: 9,
      expected: 9,
      status: "정상",
    });
    expect(countByKey.coefficient_count).toMatchObject({
      actual: 737,
      expected: 737,
      status: "정상",
    });
    expect(summary.coefficient_matrix_check).toMatchObject({
      expected_row_count: 737,
      actual_row_count: 737,
      missing_count: 0,
      duplicate_count: 0,
      completeness_percentage: 100,
      active_expected_row_count: 737,
      active_missing_count: 0,
      active_completeness_percentage: 100,
      status: "정상",
    });
    expect(s1ByKey["pbx:avaya"]).toMatchObject({
      expected_standard_effort_mm: 7.68,
      current_standard_effort_mm: 7.68,
      status: "일치",
    });
    expect(s1ByKey["cti:v4"]).toMatchObject({
      expected_standard_effort_mm: 9.06,
      current_standard_effort_mm: 9.06,
      status: "일치",
    });
    expect(s1ByKey["cms:avaya"]).toMatchObject({
      expected_standard_effort_mm: 5.2,
      current_standard_effort_mm: 5.2,
      status: "일치",
    });
    expect(summary.s1_fixture_preview).toMatchObject({
      expected_total_mm: 50.02,
      current_total_mm: 50.02,
      difference_mm: 0,
      status: "일치",
    });
  });

  it("marks seed differences as changed or warning instead of failing validation", () => {
    const meta = buildSeedMeta();
    const changedMeta = {
      ...meta,
      coefficientRows: meta.coefficientRows
        .filter(
          (row) =>
            !(
              row.item_id === "excel-row-16" &&
              row.solution_variant_id === "pbx:avaya"
            )
        )
        .concat({
          item_id: "excel-row-16",
          solution_variant_id: "pbx:avaya",
          coefficient: 999,
          active: true,
        }),
    };
    const summary = buildStandardEffortMetaSummary(changedMeta);
    const s1Pbx = summary.s1_fixture_preview.rows.find(
      (row) => row.key === "pbx:avaya"
    );

    expect(s1Pbx.status).toBe("변경됨");
    expect(summary.s1_fixture_preview.status).toBe("변경됨");
  });

  it("calculates coefficient completeness with missing and duplicate rows", () => {
    const summary = buildStandardEffortMetaSummary({
      solutionVariants: [
        { solution_variant_id: "variant-a", active: true },
        { solution_variant_id: "variant-b", active: false },
      ],
      itemRows: [
        { item_id: "item-1", active: true },
        { item_id: "item-2", active: false },
      ],
      coefficientRows: [
        {
          item_id: "item-1",
          solution_variant_id: "variant-a",
          coefficient: 1,
          active: true,
        },
        {
          item_id: "item-1",
          solution_variant_id: "variant-a",
          coefficient: 1,
          active: true,
        },
      ],
    });

    expect(summary.coefficient_matrix_check).toMatchObject({
      expected_row_count: 4,
      actual_row_count: 2,
      unique_row_count: 1,
      missing_count: 3,
      duplicate_count: 1,
      completeness_percentage: 25,
      active_expected_row_count: 1,
      active_unique_row_count: 1,
      active_missing_count: 0,
      active_duplicate_count: 1,
      active_completeness_percentage: 100,
      status: "주의",
      active_status: "주의",
    });
  });

  it("upserts standard base effort rows with effort_mm payload", async () => {
    const client = createUpsertClient();

    const result = await upsertStandardBaseEffortRows(
      "variant-pbx",
      [
        {
          phase_code: "analysis",
          phase_name: "분석",
          effort_mm: "1.25",
          display_order: 10,
          active: true,
        },
        {
          phase_code: "design",
          phase_name: "설계",
          effort_mm: "",
        },
      ],
      client
    );

    expect(client.from).toHaveBeenCalledWith(
      "estimation_standard_base_effort_meta"
    );
    expect(client.table.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          phase_code: "analysis",
          phase_name: "분석",
          effort_mm: 1.25,
          display_order: 10,
          active: true,
        }),
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          phase_code: "design",
          phase_name: "설계",
          effort_mm: 0,
          display_order: 20,
          active: true,
        }),
      ]),
      { onConflict: "solution_variant_id,phase_code" }
    );
    expect(client.query.rows[0]).not.toHaveProperty("effort_md");
    expect(result[0].effort_mm).toBe(1.25);
  });

  it("rejects invalid base effort payloads before upsert", async () => {
    const client = createUpsertClient();

    await expect(
      upsertStandardBaseEffortRows("", [], client)
    ).rejects.toThrow("solutionVariantId");
    await expect(
      upsertStandardBaseEffortRows("variant-pbx", null, client)
    ).rejects.toThrow("phaseRows");
    await expect(
      upsertStandardBaseEffortRows(
        "variant-pbx",
        [{ phase_code: "unknown", phase_name: "Unknown", effort_mm: 1 }],
        client
      )
    ).rejects.toThrow("phase_code");
    await expect(
      upsertStandardBaseEffortRows(
        "variant-pbx",
        [{ phase_code: "analysis", phase_name: "분석", effort_mm: -1 }],
        client
      )
    ).rejects.toThrow("0 이상");
    await expect(
      upsertStandardBaseEffortRows(
        "variant-pbx",
        [{ phase_code: "analysis", phase_name: "분석", effort_mm: "abc" }],
        client
      )
    ).rejects.toThrow("숫자");
    expect(client.table.upsert).not.toHaveBeenCalled();
  });

  it("throws when Supabase upsert returns an error", async () => {
    const client = createUpsertClient({
      error: new Error("upsert failed"),
    });

    await expect(
      upsertStandardBaseEffortRows(
        "variant-pbx",
        [{ phase_code: "analysis", phase_name: "분석", effort_mm: 1 }],
        client
      )
    ).rejects.toThrow("upsert failed");
  });

  it("upserts standard coefficient rows with coefficient payload", async () => {
    const client = createUpsertClient();

    const result = await upsertStandardCoefficientRows(
      "item-1",
      [
        {
          solution_variant_id: "variant-pbx",
          coefficient: "0.25",
          active: true,
        },
        {
          solution_variant_id: "variant-wfm",
          coefficient: "",
        },
      ],
      client
    );

    expect(client.from).toHaveBeenCalledWith(
      "estimation_item_solution_coefficient_meta"
    );
    expect(client.table.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          item_id: "item-1",
          solution_variant_id: "variant-pbx",
          coefficient: 0.25,
          active: true,
        }),
        expect.objectContaining({
          item_id: "item-1",
          solution_variant_id: "variant-wfm",
          coefficient: 0,
          active: true,
        }),
      ]),
      { onConflict: "item_id,solution_variant_id" }
    );
    expect(client.query.rows[0]).not.toHaveProperty("effort_mm");
    expect(client.query.rows[0]).not.toHaveProperty("actual_effort_mm");
    expect(result[0].coefficient).toBe(0.25);
  });

  it("rejects invalid coefficient payloads before upsert", async () => {
    const client = createUpsertClient();

    await expect(
      upsertStandardCoefficientRows("", [], client)
    ).rejects.toThrow("itemId");
    await expect(
      upsertStandardCoefficientRows("item-1", null, client)
    ).rejects.toThrow("coefficientRows");
    await expect(
      upsertStandardCoefficientRows(
        "item-1",
        [{ coefficient: 1 }],
        client
      )
    ).rejects.toThrow("solution_variant_id");
    await expect(
      upsertStandardCoefficientRows(
        "item-1",
        [{ solution_variant_id: "variant-pbx", coefficient: -1 }],
        client
      )
    ).rejects.toThrow("0 이상");
    await expect(
      upsertStandardCoefficientRows(
        "item-1",
        [{ solution_variant_id: "variant-pbx", coefficient: "abc" }],
        client
      )
    ).rejects.toThrow("숫자");
    expect(client.table.upsert).not.toHaveBeenCalled();
  });

  it("throws when coefficient upsert returns an error", async () => {
    const client = createUpsertClient({
      error: new Error("coefficient upsert failed"),
    });

    await expect(
      upsertStandardCoefficientRows(
        "item-1",
        [{ solution_variant_id: "variant-pbx", coefficient: 1 }],
        client
      )
    ).rejects.toThrow("coefficient upsert failed");
  });

  it("updates only solution variant active", async () => {
    const client = createUpdateClient({
      data: [
        {
          solution_variant_id: "variant-pbx",
          solution_code: "pbx",
          variant_code: "avaya",
          active: false,
        },
      ],
    });

    const result = await updateStandardSolutionVariantActive(
      "variant-pbx",
      false,
      client
    );

    expect(client.from).toHaveBeenCalledWith("estimation_solution_variant");
    expect(client.table.update).toHaveBeenCalledWith({
      active: false,
      updated_at: expect.any(String),
    });
    expect(client.query.eq).toHaveBeenCalledWith(
      "solution_variant_id",
      "variant-pbx"
    );
    expect(client.query.payload).not.toHaveProperty("effort_mm");
    expect(client.query.payload).not.toHaveProperty("actual_effort_mm");
    expect(client.query.payload).not.toHaveProperty("coefficient");
    expect(result.active).toBe(false);
  });

  it("rejects invalid solution variant active updates before update", async () => {
    const client = createUpdateClient();

    await expect(
      updateStandardSolutionVariantActive("", true, client)
    ).rejects.toThrow("solutionVariantId");
    await expect(
      updateStandardSolutionVariantActive("variant-pbx", "false", client)
    ).rejects.toThrow("boolean");
    expect(client.table.update).not.toHaveBeenCalled();
  });

  it("throws when solution variant active update fails or returns no row", async () => {
    await expect(
      updateStandardSolutionVariantActive(
        "variant-pbx",
        true,
        createUpdateClient({ error: new Error("variant update failed") })
      )
    ).rejects.toThrow("variant update failed");
    await expect(
      updateStandardSolutionVariantActive(
        "variant-pbx",
        true,
        createUpdateClient({ data: [] })
      )
    ).rejects.toThrow("solution variant");
  });

  it("updates only standard item active", async () => {
    const client = createUpdateClient({
      data: [
        {
          item_id: "item-1",
          category_l1: "공통정보",
          item_name: "업종",
          active: false,
        },
      ],
    });

    const result = await updateStandardItemActive("item-1", false, client);

    expect(client.from).toHaveBeenCalledWith("estimation_standard_item_meta");
    expect(client.table.update).toHaveBeenCalledWith({
      active: false,
      updated_at: expect.any(String),
    });
    expect(client.query.eq).toHaveBeenCalledWith("item_id", "item-1");
    expect(client.query.payload).not.toHaveProperty("effort_mm");
    expect(client.query.payload).not.toHaveProperty("actual_effort_mm");
    expect(client.query.payload).not.toHaveProperty("coefficient");
    expect(result.active).toBe(false);
  });

  it("rejects invalid standard item active updates before update", async () => {
    const client = createUpdateClient();

    await expect(updateStandardItemActive("", true, client)).rejects.toThrow(
      "itemId"
    );
    await expect(
      updateStandardItemActive("item-1", "false", client)
    ).rejects.toThrow("boolean");
    expect(client.table.update).not.toHaveBeenCalled();
  });

  it("throws when standard item active update fails or returns no row", async () => {
    await expect(
      updateStandardItemActive(
        "item-1",
        true,
        createUpdateClient({ error: new Error("item update failed") })
      )
    ).rejects.toThrow("item update failed");
    await expect(
      updateStandardItemActive("item-1", true, createUpdateClient({ data: [] }))
    ).rejects.toThrow("standard item");
  });
});
