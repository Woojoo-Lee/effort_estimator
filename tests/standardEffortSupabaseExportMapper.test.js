import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildCheckedItemsFromStandardEffortInput,
  buildStandardEffortExportDataFromInput,
  buildStandardEffortTotals,
  normalizeExportResult,
  toExportBoolean,
  toExportNumber,
} from "../src/utils/export/standardEffortSupabaseExportMapper";

const sampleInput = {
  projectId: "7",
  solutionVariants: [
    {
      solution_variant_id: "variant-wfm",
      solution_code: "WFM",
      solution_name: "Workforce",
      variant_code: "basic",
      variant_name: "Basic",
      display_name: "WFM",
      display_order: 2,
    },
    {
      solution_variant_id: "variant-pbx",
      solution_code: "PBX",
      solution_name: "PBX",
      variant_code: "avaya",
      variant_name: "Avaya",
      display_name: "PBX Avaya",
      display_order: 1,
    },
  ],
  itemRows: [
    {
      item_id: "item-host",
      category_l1: "Infra",
      category_l2: "Server",
      item_name: "Host relay",
      item_option: "Client",
      display_order: 2,
      effort_mm: 99,
      actual_effort_mm: 88,
    },
    {
      item_id: "item-ivr",
      category_l1: "Channel",
      category_l2: "Voice",
      item_name: "IVR",
      item_option: "Basic",
      display_order: 1,
    },
  ],
  coefficientRows: [
    {
      item_id: "item-host",
      solution_variant_id: "variant-wfm",
      coefficient: "1.25",
    },
  ],
  projectSolutionSelections: [
    {
      project_id: "7",
      solution_variant_id: "variant-wfm",
      enabled: true,
      actual_effort_mm: "4.5",
      actual_effort_md: 123,
    },
  ],
  projectItemSelections: [
    {
      project_id: "7",
      solution_variant_id: "variant-wfm",
      item_id: "item-host",
      checked: "Y",
    },
    {
      project_id: "7",
      solution_variant_id: "variant-pbx",
      item_id: "item-ivr",
      checked: "",
    },
  ],
};

describe("standard effort Supabase export mapper", () => {
  it("normalizes export numbers without unit conversion", () => {
    expect(toExportNumber(null)).toBe(0);
    expect(toExportNumber(undefined)).toBe(0);
    expect(toExportNumber("")).toBe(0);
    expect(toExportNumber("12.5")).toBe(12.5);
    expect(toExportNumber("abc")).toBe(0);
    expect(toExportNumber(Number.NaN)).toBe(0);
    expect(toExportNumber(Infinity)).toBe(0);
    expect(toExportNumber(-Infinity)).toBe(0);
    expect(toExportNumber(-3)).toBe(-3);
  });

  it("normalizes export booleans conservatively", () => {
    expect(toExportBoolean(true)).toBe(true);
    expect(toExportBoolean(1)).toBe(true);
    expect(toExportBoolean("1")).toBe(true);
    expect(toExportBoolean("Y")).toBe(true);
    expect(toExportBoolean("y")).toBe(true);
    expect(toExportBoolean("true")).toBe(true);
    expect(toExportBoolean("TRUE")).toBe(true);
    expect(toExportBoolean(false)).toBe(false);
    expect(toExportBoolean(0)).toBe(false);
    expect(toExportBoolean("0")).toBe(false);
    expect(toExportBoolean("N")).toBe(false);
    expect(toExportBoolean("n")).toBe(false);
    expect(toExportBoolean("false")).toBe(false);
    expect(toExportBoolean("FALSE")).toBe(false);
    expect(toExportBoolean(null)).toBe(false);
    expect(toExportBoolean(undefined)).toBe(false);
    expect(toExportBoolean("")).toBe(false);
    expect(toExportBoolean("unknown")).toBe(false);
  });

  it("normalizes snake_case result rows and excludes legacy M/D fields", () => {
    const normalized = normalizeExportResult({
      solution_variant_id: "variant-wfm",
      solution_code: "WFM",
      variant_code: "basic",
      solution_name: "Workforce",
      display_name: "WFM",
      base_total_mm: "8",
      coefficient_total: "1.25",
      standard_effort_mm: "10",
      actual_effort_mm: "4.5",
      gap_mm: "5.5",
      actual_effort_md: 99,
      standard_effort_md: 100,
      effort_md: 101,
    });

    expect(normalized).toEqual({
      solution_variant_id: "variant-wfm",
      solution_code: "WFM",
      variant_code: "basic",
      solution_name: "Workforce",
      variant_name: undefined,
      display_name: "WFM",
      base_total_mm: 8,
      coefficient_total: 1.25,
      standard_effort_mm: 10,
      actual_effort_mm: 4.5,
      gap_mm: 5.5,
    });
    expect(normalized).not.toHaveProperty("actual_effort_md");
    expect(normalized).not.toHaveProperty("standard_effort_md");
    expect(normalized).not.toHaveProperty("effort_md");
  });

  it("normalizes camelCase result rows", () => {
    expect(
      normalizeExportResult({
        solutionVariantId: "variant-wfm",
        solutionCode: "WFM",
        variantCode: "basic",
        solutionName: "Workforce",
        variantName: "Basic",
        displayName: "WFM",
        baseTotalMm: "8",
        coefficientTotal: "1.25",
        standardEffortMm: "10",
        actualEffortMm: "4.5",
        gapMm: "-5.5",
      })
    ).toEqual({
      solution_variant_id: "variant-wfm",
      solution_code: "WFM",
      variant_code: "basic",
      solution_name: "Workforce",
      variant_name: "Basic",
      display_name: "WFM",
      base_total_mm: 8,
      coefficient_total: 1.25,
      standard_effort_mm: 10,
      actual_effort_mm: 4.5,
      gap_mm: -5.5,
    });
  });

  it("builds totals with M/M field names and allows negative gaps", () => {
    const totals = buildStandardEffortTotals([
      {
        base_total_mm: "8",
        coefficient_total: "1.25",
        standard_effort_mm: "10",
        actual_effort_mm: "12",
        gap_mm: "-2",
      },
      {
        base_total_mm: "",
        coefficient_total: null,
        standard_effort_mm: "5",
        actual_effort_mm: undefined,
        gap_mm: "5",
      },
    ]);

    expect(totals).toEqual({
      base_total_mm: 8,
      coefficient_total: 1.25,
      standard_effort_mm: 15,
      actual_effort_mm: 12,
      gap_mm: 3,
      solution_count: 2,
    });
    expect(totals).not.toHaveProperty("base_md");
    expect(totals).not.toHaveProperty("standard_effort_md");
    expect(totals).not.toHaveProperty("gap_md");
  });

  it("builds checked_items from checked selections by default", () => {
    const checkedItems = buildCheckedItemsFromStandardEffortInput(sampleInput);

    expect(checkedItems).toEqual([
      {
        solution_variant_id: "variant-wfm",
        solution_code: "WFM",
        solution_name: "Workforce",
        variant_code: "basic",
        variant_name: "Basic",
        display_name: "WFM",
        item_id: "item-host",
        category_l1: "Infra",
        category_l2: "Server",
        item_name: "Host relay",
        item_option: "Client",
        coefficient: 1.25,
        checked: true,
      },
    ]);
    expect(checkedItems[0]).not.toHaveProperty("effort_mm");
    expect(checkedItems[0]).not.toHaveProperty("actual_effort_mm");
  });

  it("can include unchecked rows when requested", () => {
    const checkedItems = buildCheckedItemsFromStandardEffortInput(sampleInput, {
      includeUnchecked: true,
    });

    expect(checkedItems).toHaveLength(2);
    expect(checkedItems[0]).toMatchObject({
      solution_variant_id: "variant-pbx",
      item_id: "item-ivr",
      coefficient: 0,
      checked: false,
    });
    expect(checkedItems[1]).toMatchObject({
      solution_variant_id: "variant-wfm",
      item_id: "item-host",
      coefficient: 1.25,
      checked: true,
    });
  });

  it("builds export data from input and provided results", () => {
    const exportData = buildStandardEffortExportDataFromInput({
      input: sampleInput,
      results: [
        {
          solution_variant_id: "variant-wfm",
          solution_code: "WFM",
          solution_name: "Workforce",
          variant_code: "basic",
          display_name: "WFM",
          base_total_mm: "8",
          coefficient_total: "1.25",
          standard_effort_mm: "10",
          actual_effort_mm: "4.5",
          gap_mm: "5.5",
          actual_effort_md: 123,
          standard_effort_md: 456,
          gap_md: 789,
        },
      ],
      generatedBy: { email: "user@example.com" },
      generatedAt: "2026-06-10T00:00:00.000Z",
    });

    expect(exportData.project).toEqual({ project_id: "7" });
    expect(exportData.generated_at).toBe("2026-06-10T00:00:00.000Z");
    expect(exportData.generated_by).toEqual({ email: "user@example.com" });
    expect(exportData.standard_effort.results[0]).toMatchObject({
      solution_variant_id: "variant-wfm",
      actual_effort_mm: 4.5,
      gap_mm: 5.5,
    });
    expect(exportData.standard_effort.totals).toMatchObject({
      base_total_mm: 8,
      coefficient_total: 1.25,
      standard_effort_mm: 10,
      actual_effort_mm: 4.5,
      gap_mm: 5.5,
      solution_count: 1,
    });
    expect(exportData.selections.projectSolutionSelections).toEqual([
      {
        project_id: "7",
        solution_variant_id: "variant-wfm",
        enabled: true,
        actual_effort_mm: 4.5,
      },
    ]);
    expect(exportData.selections.projectItemSelections).toEqual([
      {
        project_id: "7",
        solution_variant_id: "variant-wfm",
        item_id: "item-host",
        checked: true,
      },
      {
        project_id: "7",
        solution_variant_id: "variant-pbx",
        item_id: "item-ivr",
        checked: false,
      },
    ]);
    expect(exportData.checked_items).toHaveLength(1);
    expect(JSON.stringify(exportData)).not.toContain("actual_effort_md");
    expect(JSON.stringify(exportData)).not.toContain("standard_effort_md");
    expect(JSON.stringify(exportData)).not.toContain("gap_md");
  });

  it("preserves provided project fields and project_id pass-through", () => {
    const exportData = buildStandardEffortExportDataFromInput({
      project: { id: "0007", project_name: "Demo" },
      input: { projectId: "0007" },
      generatedAt: "2026-06-10T00:00:00.000Z",
    });

    expect(exportData.project).toEqual({
      id: "0007",
      project_name: "Demo",
      project_id: "0007",
    });
  });

  it("handles empty input without side effects", () => {
    const exportData = buildStandardEffortExportDataFromInput({
      generatedAt: "2026-06-10T00:00:00.000Z",
    });

    expect(exportData.project).toEqual({});
    expect(exportData.standard_effort.results).toEqual([]);
    expect(exportData.standard_effort.totals).toEqual({
      base_total_mm: 0,
      coefficient_total: 0,
      standard_effort_mm: 0,
      actual_effort_mm: 0,
      gap_mm: 0,
      solution_count: 0,
    });
    expect(exportData.selections.projectSolutionSelections).toEqual([]);
    expect(exportData.selections.projectItemSelections).toEqual([]);
    expect(exportData.checked_items).toEqual([]);
    expect(exportData.generated_by).toBeNull();
  });

  it("does not import repository, math, workbook, download, DOM, or xlsx APIs", () => {
    const source = readFileSync(
      new URL(
        "../src/utils/export/standardEffortSupabaseExportMapper.js",
        import.meta.url
      ),
      "utf8"
    );

    expect(source).not.toContain("fetchStandardEffortInput");
    expect(source).not.toContain("calculateStandardEffort");
    expect(source).not.toContain("standardEffortRepository");
    expect(source).not.toContain("standardEffortWorkbook");
    expect(source).not.toContain("browserDownload");
    expect(source).not.toMatch(/from ["']xlsx["']/);
    expect(source).not.toContain("Blob");
    expect(source).not.toContain("window");
    expect(source).not.toContain("document");
    expect(source).not.toMatch(/M\/D/i);
    expect(source).not.toContain("actual_effort_md");
    expect(source).not.toContain("standard_effort_md");
    expect(source).not.toContain("effort_md");
  });
});
