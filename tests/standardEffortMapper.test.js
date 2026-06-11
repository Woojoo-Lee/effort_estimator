import { describe, expect, it } from "vitest";

import {
  buildStandardEffortInput,
  normalizeBaseEffortRow,
  normalizeCoefficientRow,
  normalizeProjectItemSelection,
  normalizeProjectSolutionSelection,
  toBooleanChecked,
  toNumberOrZero,
} from "../src/shared/lib/standardEffortMapper";

describe("standardEffortMapper", () => {
  it.each([
    [null, 0],
    [undefined, 0],
    ["", 0],
    [Number.NaN, 0],
    ["1.25", 1.25],
    [3, 3],
  ])("toNumberOrZero maps %p to %p", (input, expected) => {
    expect(toNumberOrZero(input)).toBe(expected);
  });

  it.each([true, 1, "1", "Y", "y", "true", "TRUE"])(
    "toBooleanChecked maps %p to true",
    (input) => {
      expect(toBooleanChecked(input)).toBe(true);
    }
  );

  it.each([
    false,
    0,
    "0",
    "N",
    "n",
    "false",
    "FALSE",
    null,
    undefined,
    "",
  ])("toBooleanChecked maps %p to false", (input) => {
    expect(toBooleanChecked(input)).toBe(false);
  });

  it("normalizes base effort rows", () => {
    expect(
      normalizeBaseEffortRow({
        base_effort_id: "base-1",
        solution_variant_id: "variant-1",
        phase_code: "ANALYSIS",
        phase_name: "Analysis",
        effort_mm: "1.25",
        display_order: null,
      })
    ).toEqual({
      base_effort_id: "base-1",
      solution_variant_id: "variant-1",
      phase_code: "ANALYSIS",
      phase_name: "Analysis",
      effort_mm: 1.25,
      display_order: 0,
      active: true,
    });
  });

  it("normalizes legacy effort_md into effort_mm", () => {
    expect(
      normalizeBaseEffortRow({
        solution_variant_id: "variant-1",
        effort_md: "2.5",
      })
    ).toMatchObject({
      effort_mm: 2.5,
    });
  });

  it("normalizes coefficient rows", () => {
    expect(
      normalizeCoefficientRow({
        item_id: "item-1",
        solution_variant_id: "variant-1",
        coefficient: null,
        active: false,
      })
    ).toEqual({
      item_id: "item-1",
      solution_variant_id: "variant-1",
      coefficient: 0,
      active: false,
    });

    expect(
      normalizeCoefficientRow({
        item_id: "item-2",
        solution_variant_id: "variant-1",
        coefficient: "",
      }).coefficient
    ).toBe(0);
  });

  it("normalizes project solution selections", () => {
    expect(
      normalizeProjectSolutionSelection({
        project_id: "project-1",
        solution_variant_id: "variant-1",
        actual_effort_mm: null,
      })
    ).toEqual({
      project_id: "project-1",
      solution_variant_id: "variant-1",
      enabled: true,
      actual_effort_mm: 0,
    });

    expect(
      normalizeProjectSolutionSelection({
        project_id: "project-1",
        solution_variant_id: "variant-1",
        enabled: false,
        actual_effort_mm: "",
      })
    ).toMatchObject({
      enabled: false,
      actual_effort_mm: 0,
    });

    expect(
      normalizeProjectSolutionSelection({
        project_id: "project-1",
        solution_variant_id: "variant-1",
        actual_effort_md: "3.5",
      })
    ).toMatchObject({
      actual_effort_mm: 3.5,
    });

    expect(
      normalizeProjectSolutionSelection({
        project_id: "project-1",
        solution_variant_id: "variant-1",
        actual_effort: "4.5",
      })
    ).toMatchObject({
      actual_effort_mm: 4.5,
    });
  });

  it("normalizes project item selections", () => {
    expect(
      normalizeProjectItemSelection({
        project_id: "project-1",
        solution_variant_id: "variant-1",
        item_id: "item-1",
        checked: "Y",
      })
    ).toMatchObject({
      checked: true,
    });

    expect(
      normalizeProjectItemSelection({
        project_id: "project-1",
        solution_variant_id: "variant-1",
        item_id: "item-1",
        checked: "",
      })
    ).toMatchObject({
      checked: false,
    });
  });

  it("builds calculateStandardEffort-compatible input", () => {
    const result = buildStandardEffortInput({
      projectId: "project-1",
      meta: {
        solutions: [
          {
            solution_code: "cti",
            solution_name: "CTI",
          },
        ],
        solutionVariants: [
          {
            solution_variant_id: "cti-v4",
            solution_code: "cti",
            variant_code: "v4",
            variant_name: "4.0",
            display_name: "CTI v4",
            display_order: "2",
          },
        ],
      },
      selections: {
        projectSolutionSelections: [
          {
            project_id: "project-1",
            solution_variant_id: "cti-v4",
            enabled: true,
            actual_effort_mm: "9.1",
          },
        ],
      },
    });

    expect(Object.keys(result)).toEqual([
      "projectId",
      "solutionVariants",
      "baseEffortRows",
      "itemRows",
      "coefficientRows",
      "projectSolutionSelections",
      "projectItemSelections",
    ]);
    expect(result.projectId).toBe("project-1");
    expect(result.solutionVariants).toEqual([
      {
        solution_variant_id: "cti-v4",
        solution_code: "cti",
        solution_name: "CTI",
        variant_code: "v4",
        variant_name: "4.0",
        display_name: "CTI v4",
        display_order: 2,
        active: true,
      },
    ]);
    expect(result.baseEffortRows).toEqual([]);
    expect(result.itemRows).toEqual([]);
    expect(result.coefficientRows).toEqual([]);
    expect(result.projectSolutionSelections[0].actual_effort_mm).toBe(9.1);
    expect(result.projectItemSelections).toEqual([]);
  });

  it("builds empty arrays when meta or selections are missing", () => {
    expect(buildStandardEffortInput({ projectId: "project-1" })).toEqual({
      projectId: "project-1",
      solutionVariants: [],
      baseEffortRows: [],
      itemRows: [],
      coefficientRows: [],
      projectSolutionSelections: [],
      projectItemSelections: [],
    });
  });
});
