import { describe, expect, it } from "vitest";

import { calculateStandardEffort } from "../src/shared/lib/standardEffortMath";

function makeVariant(overrides = {}) {
  return {
    solution_variant_id: "pbx-avaya",
    solution_code: "pbx",
    solution_name: "PBX",
    variant_code: "avaya",
    variant_name: "Avaya",
    display_name: "PBX",
    display_order: 1,
    active: true,
    ...overrides,
  };
}

function makeItem(overrides = {}) {
  return {
    item_id: "item-1",
    category_l1: "common",
    category_l2: "type",
    item_name: "Item",
    item_option: "",
    display_order: 1,
    active: true,
    ...overrides,
  };
}

describe("calculateStandardEffort", () => {
  it("calculates base totals, checked coefficient totals, standard effort, and gap by solution_variant_id", () => {
    const result = calculateStandardEffort({
      projectId: "project-1",
      solutionVariants: [
        makeVariant({
          solution_variant_id: "ivr-ep",
          solution_code: "ivr",
          solution_name: "IVR",
          variant_code: "ep",
          variant_name: "EP",
          display_name: "IVR EP",
          display_order: 4,
        }),
        makeVariant({
          solution_variant_id: "cti-v4",
          solution_code: "cti",
          solution_name: "CTI",
          variant_code: "v4",
          variant_name: "4.0",
          display_name: "CTI v4",
          display_order: 2,
        }),
        makeVariant({
          solution_variant_id: "cti-v5",
          solution_code: "cti",
          solution_name: "CTI",
          variant_code: "v5",
          variant_name: "5.0",
          display_name: "CTI v5",
          display_order: 1,
        }),
        makeVariant({
          solution_variant_id: "ivr-31",
          solution_code: "ivr",
          solution_name: "IVR",
          variant_code: "3.1",
          variant_name: "3.1",
          display_name: "IVR 3.1",
          display_order: 3,
        }),
        makeVariant({
          solution_variant_id: "disabled",
          display_name: "Disabled",
          display_order: 5,
        }),
        makeVariant({
          solution_variant_id: "inactive",
          display_name: "Inactive",
          display_order: 6,
          active: false,
        }),
      ],
      baseEffortRows: [
        { solution_variant_id: "cti-v5", effort_mm: 1, active: true },
        { solution_variant_id: "cti-v5", effort_mm: "2", active: true },
        { solution_variant_id: "cti-v5", effort_mm: 99, active: false },
        { solution_variant_id: "cti-v4", effort_mm: 4, active: true },
        { solution_variant_id: "ivr-31", effort_mm: 5, active: true },
        { solution_variant_id: "ivr-ep", effort_mm: 6, active: true },
        { solution_variant_id: "inactive", effort_mm: 100, active: true },
      ],
      itemRows: [
        makeItem({ item_id: "item-a", display_order: 1 }),
        makeItem({ item_id: "item-b", display_order: 2 }),
        makeItem({ item_id: "inactive-item", display_order: 3, active: false }),
      ],
      coefficientRows: [
        { solution_variant_id: "cti-v5", item_id: "item-a", coefficient: 0.2 },
        { solution_variant_id: "cti-v5", item_id: "item-b", coefficient: 0.3 },
        {
          solution_variant_id: "cti-v5",
          item_id: "item-b",
          coefficient: 99,
          active: false,
        },
        {
          solution_variant_id: "cti-v5",
          item_id: "inactive-item",
          coefficient: 99,
        },
        { solution_variant_id: "cti-v4", item_id: "item-a", coefficient: 1.5 },
        { solution_variant_id: "cti-v4", item_id: "item-b", coefficient: 0.75 },
        { solution_variant_id: "ivr-31", item_id: "item-a", coefficient: 2 },
        { solution_variant_id: "ivr-ep", item_id: "item-a", coefficient: 3 },
      ],
      projectSolutionSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "cti-v5",
          enabled: true,
          actual_effort_mm: 1,
        },
        {
          project_id: "project-1",
          solution_variant_id: "cti-v4",
          enabled: true,
          actual_effort_mm: 2,
        },
        {
          project_id: "project-1",
          solution_variant_id: "ivr-31",
          enabled: true,
          actual_effort_mm: 0,
        },
        {
          project_id: "project-1",
          solution_variant_id: "ivr-ep",
          enabled: true,
          actual_effort_mm: 10,
        },
        {
          project_id: "project-1",
          solution_variant_id: "disabled",
          enabled: false,
          actual_effort_mm: 0,
        },
        {
          project_id: "project-1",
          solution_variant_id: "inactive",
          enabled: true,
          actual_effort_mm: 0,
        },
      ],
      projectItemSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "cti-v5",
          item_id: "item-a",
          checked: true,
        },
        {
          project_id: "project-1",
          solution_variant_id: "cti-v5",
          item_id: "item-b",
          checked: false,
        },
        {
          project_id: "project-1",
          solution_variant_id: "cti-v5",
          item_id: "inactive-item",
          checked: true,
        },
        {
          project_id: "project-1",
          solution_variant_id: "cti-v4",
          item_id: "item-a",
          checked: "Y",
        },
        {
          project_id: "project-1",
          solution_variant_id: "cti-v4",
          item_id: "item-b",
          checked: "1",
        },
        {
          project_id: "project-1",
          solution_variant_id: "ivr-31",
          item_id: "item-a",
          checked: 1,
        },
        {
          project_id: "project-1",
          solution_variant_id: "ivr-ep",
          item_id: "item-a",
          checked: true,
        },
      ],
    });

    expect(result.map((row) => row.solution_variant_id)).toEqual([
      "cti-v5",
      "cti-v4",
      "ivr-31",
      "ivr-ep",
    ]);

    expect(result[0]).toMatchObject({
      solution_variant_id: "cti-v5",
      solution_code: "cti",
      variant_code: "v5",
      base_total_mm: 3,
      coefficient_total: 0.2,
      standard_effort_mm: 0.6,
      actual_effort_mm: 1,
      gap_mm: -0.4,
    });

    expect(result[1]).toMatchObject({
      solution_variant_id: "cti-v4",
      solution_code: "cti",
      variant_code: "v4",
      base_total_mm: 4,
      coefficient_total: 2.25,
      standard_effort_mm: 9,
      actual_effort_mm: 2,
      gap_mm: 7,
    });

    expect(result[2]).toMatchObject({
      solution_variant_id: "ivr-31",
      solution_code: "ivr",
      variant_code: "3.1",
      base_total_mm: 5,
      coefficient_total: 2,
      standard_effort_mm: 10,
      gap_mm: 10,
    });

    expect(result[3]).toMatchObject({
      solution_variant_id: "ivr-ep",
      solution_code: "ivr",
      variant_code: "ep",
      base_total_mm: 6,
      coefficient_total: 3,
      standard_effort_mm: 18,
      actual_effort_mm: 10,
      gap_mm: 8,
    });
  });

  it("treats null, undefined, and empty numeric values as zero", () => {
    const result = calculateStandardEffort({
      projectId: "project-1",
      solutionVariants: [makeVariant()],
      baseEffortRows: [
        { solution_variant_id: "pbx-avaya", effort_mm: null },
        { solution_variant_id: "pbx-avaya", effort_mm: undefined },
        { solution_variant_id: "pbx-avaya", effort_mm: "" },
      ],
      itemRows: [
        makeItem({ item_id: "item-null" }),
        makeItem({ item_id: "item-undefined" }),
        makeItem({ item_id: "item-empty" }),
      ],
      coefficientRows: [
        {
          solution_variant_id: "pbx-avaya",
          item_id: "item-null",
          coefficient: null,
        },
        {
          solution_variant_id: "pbx-avaya",
          item_id: "item-undefined",
          coefficient: undefined,
        },
        {
          solution_variant_id: "pbx-avaya",
          item_id: "item-empty",
          coefficient: "",
        },
      ],
      projectSolutionSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          enabled: true,
          actual_effort_mm: "",
        },
      ],
      projectItemSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          item_id: "item-null",
          checked: true,
        },
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          item_id: "item-undefined",
          checked: true,
        },
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          item_id: "item-empty",
          checked: true,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      base_total_mm: 0,
      coefficient_total: 0,
      standard_effort_mm: 0,
      actual_effort_mm: 0,
      gap_mm: 0,
    });
  });

  it("reads legacy md input fields as M/M without unit conversion", () => {
    const result = calculateStandardEffort({
      projectId: "project-1",
      solutionVariants: [makeVariant()],
      baseEffortRows: [{ solution_variant_id: "pbx-avaya", effort_md: 10 }],
      itemRows: [makeItem()],
      coefficientRows: [
        {
          solution_variant_id: "pbx-avaya",
          item_id: "item-1",
          coefficient: 0.5,
        },
      ],
      projectSolutionSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          enabled: true,
          actual_effort_md: 2,
        },
      ],
      projectItemSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          item_id: "item-1",
          checked: true,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      base_total_mm: 10,
      standard_effort_mm: 5,
      actual_effort_mm: 2,
      gap_mm: 3,
    });
    expect(result[0]).not.toHaveProperty("base_total_md");
    expect(result[0]).not.toHaveProperty("standard_effort_md");
    expect(result[0]).not.toHaveProperty("actual_effort_md");
    expect(result[0]).not.toHaveProperty("gap_md");
  });

  it("reads legacy actual_effort input as M/M without unit conversion", () => {
    const result = calculateStandardEffort({
      projectId: "project-1",
      solutionVariants: [makeVariant()],
      baseEffortRows: [{ solution_variant_id: "pbx-avaya", effort_mm: 10 }],
      itemRows: [makeItem()],
      coefficientRows: [
        {
          solution_variant_id: "pbx-avaya",
          item_id: "item-1",
          coefficient: 0.5,
        },
      ],
      projectSolutionSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          enabled: true,
          actual_effort: 1.5,
        },
      ],
      projectItemSelections: [
        {
          project_id: "project-1",
          solution_variant_id: "pbx-avaya",
          item_id: "item-1",
          checked: true,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      standard_effort_mm: 5,
      actual_effort_mm: 1.5,
      gap_mm: 3.5,
    });
  });

  it.each([true, 1, "1", "Y", " y "])(
    "treats %p as checked",
    (checkedValue) => {
      const result = calculateStandardEffort({
        projectId: "project-1",
        solutionVariants: [makeVariant()],
        baseEffortRows: [{ solution_variant_id: "pbx-avaya", effort_mm: 10 }],
        itemRows: [makeItem()],
        coefficientRows: [
          {
            solution_variant_id: "pbx-avaya",
            item_id: "item-1",
            coefficient: 0.5,
          },
        ],
        projectSolutionSelections: [
          {
            project_id: "project-1",
            solution_variant_id: "pbx-avaya",
            enabled: true,
            actual_effort_mm: 0,
          },
        ],
        projectItemSelections: [
          {
            project_id: "project-1",
            solution_variant_id: "pbx-avaya",
            item_id: "item-1",
            checked: checkedValue,
          },
        ],
      });

      expect(result[0].coefficient_total).toBe(0.5);
      expect(result[0].standard_effort_mm).toBe(5);
    }
  );

  it.each([false, 0, "0", "N", " n ", null, undefined, ""])(
    "treats %p as unchecked",
    (checkedValue) => {
      const result = calculateStandardEffort({
        projectId: "project-1",
        solutionVariants: [makeVariant()],
        baseEffortRows: [{ solution_variant_id: "pbx-avaya", effort_mm: 10 }],
        itemRows: [makeItem()],
        coefficientRows: [
          {
            solution_variant_id: "pbx-avaya",
            item_id: "item-1",
            coefficient: 0.5,
          },
        ],
        projectSolutionSelections: [
          {
            project_id: "project-1",
            solution_variant_id: "pbx-avaya",
            enabled: true,
            actual_effort_mm: 0,
          },
        ],
        projectItemSelections: [
          {
            project_id: "project-1",
            solution_variant_id: "pbx-avaya",
            item_id: "item-1",
            checked: checkedValue,
          },
        ],
      });

      expect(result[0].coefficient_total).toBe(0);
      expect(result[0].standard_effort_mm).toBe(0);
    }
  );

  it("matches representative Excel standard-effort examples with fixture data", () => {
    const variants = [
      makeVariant({
        solution_variant_id: "pbx-avaya",
        solution_code: "pbx",
        solution_name: "PBX",
        variant_code: "avaya",
        variant_name: "Avaya",
        display_name: "PBX",
        display_order: 1,
      }),
      makeVariant({
        solution_variant_id: "cti-v4",
        solution_code: "cti",
        solution_name: "CTI",
        variant_code: "v4",
        variant_name: "4.0",
        display_name: "CTI v4",
        display_order: 2,
      }),
      makeVariant({
        solution_variant_id: "cms-avaya",
        solution_code: "cms",
        solution_name: "CMS",
        variant_code: "avaya",
        variant_name: "Avaya",
        display_name: "CMS",
        display_order: 3,
      }),
      makeVariant({
        solution_variant_id: "callbot-30",
        solution_code: "callbot",
        solution_name: "CallBot",
        variant_code: "3.0",
        variant_name: "3.0",
        display_name: "CallBot",
        display_order: 4,
      }),
      makeVariant({
        solution_variant_id: "stat-20",
        solution_code: "stat",
        solution_name: "STAT",
        variant_code: "2.0",
        variant_name: "2.0",
        display_name: "STAT",
        display_order: 5,
      }),
    ];
    const baseEffortRows = [
      ...[1, 1, 2, 1, 1].map((effort_mm) => ({
        solution_variant_id: "pbx-avaya",
        effort_mm,
      })),
      ...[0.25, 0.25, 0.5, 0.5, 0.5].map((effort_mm) => ({
        solution_variant_id: "cti-v4",
        effort_mm,
      })),
      ...[0.25, 0.25, 2, 1, 0.5].map((effort_mm) => ({
        solution_variant_id: "cms-avaya",
        effort_mm,
      })),
      ...[1, 1, 9, 0.75, 0.25].map((effort_mm) => ({
        solution_variant_id: "callbot-30",
        effort_mm,
      })),
      ...[1.5, 1.5, 3, 1, 1].map((effort_mm) => ({
        solution_variant_id: "stat-20",
        effort_mm,
      })),
    ];
    const itemRows = variants.map((variant, index) =>
      makeItem({
        item_id: `excel-item-${index + 1}`,
        display_order: index + 1,
      })
    );
    const coefficients = [
      ["pbx-avaya", "excel-item-1", 1.28],
      ["cti-v4", "excel-item-2", 4.53],
      ["cms-avaya", "excel-item-3", 1.3],
      ["callbot-30", "excel-item-4", 1.1],
      ["stat-20", "excel-item-5", 1.86],
    ];
    const result = calculateStandardEffort({
      projectId: "project-1",
      solutionVariants: variants,
      baseEffortRows,
      itemRows,
      coefficientRows: coefficients.map(
        ([solution_variant_id, item_id, coefficient]) => ({
          solution_variant_id,
          item_id,
          coefficient,
        })
      ),
      projectSolutionSelections: variants.map((variant) => ({
        project_id: "project-1",
        solution_variant_id: variant.solution_variant_id,
        enabled: true,
        actual_effort_mm: 0,
      })),
      projectItemSelections: coefficients.map(
        ([solution_variant_id, item_id]) => ({
          project_id: "project-1",
          solution_variant_id,
          item_id,
          checked: 1,
        })
      ),
    });

    const standardByVariant = Object.fromEntries(
      result.map((row) => [row.solution_variant_id, row.standard_effort_mm])
    );
    const total = result.reduce(
      (sum, row) => Number((sum + row.standard_effort_mm).toFixed(2)),
      0
    );

    expect(standardByVariant["pbx-avaya"]).toBe(7.68);
    expect(standardByVariant["cti-v4"]).toBe(9.06);
    expect(standardByVariant["cms-avaya"]).toBe(5.2);
    expect(total).toBe(50.02);
  });
});
