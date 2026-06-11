import { describe, expect, it } from "vitest";

import {
  buildS1FixtureInput,
  buildStandardEffortSeedData,
} from "../scripts/generate-standard-effort-seed.mjs";
import { calculateStandardEffort } from "../src/shared/lib/standardEffortMath";

function sumBaseEffortByVariant(baseEffortRows) {
  return baseEffortRows.reduce((totals, row) => {
    const key = `${row.solution_code}:${row.variant_code}`;
    const nextTotal = (totals[key] || 0) + row.effort_mm;

    return {
      ...totals,
      [key]: Number(nextTotal.toFixed(10)),
    };
  }, {});
}

describe("standard effort seed fixture", () => {
  it("reads the expected metadata row counts from the Excel workbook", () => {
    const seedData = buildStandardEffortSeedData();

    expect(seedData.solutions).toHaveLength(9);
    expect(seedData.solutionVariants).toHaveLength(11);
    expect(seedData.baseEffortRows).toHaveLength(55);
    expect(seedData.itemRows).toHaveLength(67);
    expect(seedData.coefficientRows).toHaveLength(737);
  });

  it("matches the expected base effort totals", () => {
    const seedData = buildStandardEffortSeedData();
    const totals = sumBaseEffortByVariant(seedData.baseEffortRows);

    expect(totals).toMatchObject({
      "pbx:avaya": 6,
      "sbc:default": 3.5,
      "cti:v5": 6,
      "cti:v4": 2,
      "cms:avaya": 4,
      "ivr:v3_1": 5.75,
      "ivr:ep": 5.75,
      "oamp:v3_5": 2,
      "callbot:v3": 12,
      "stat:v2": 8,
      "wfm:v4": 8,
    });
  });

  it("matches the S1 project calculation fixture from the Excel simulation", () => {
    const result = calculateStandardEffort(buildS1FixtureInput());
    const resultByVariant = Object.fromEntries(
      result.map((row) => [row.solution_variant_id, row])
    );
    const total = result.reduce(
      (sum, row) => Number((sum + row.standard_effort_mm).toFixed(2)),
      0
    );

    expect(resultByVariant["pbx:avaya"].standard_effort_mm).toBe(7.68);
    expect(resultByVariant["cti:v4"].standard_effort_mm).toBe(9.06);
    expect(resultByVariant["cms:avaya"].standard_effort_mm).toBe(5.2);
    expect(total).toBe(50.02);
  });
});
