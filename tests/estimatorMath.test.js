import { describe, expect, it } from "vitest";
import {
  calcSolutionTotals,
  calcGrandBaseTotal,
  calcScaledTotal,
  calcRiskAppliedTotal,
  calcMgmtMd,
  calcFinalTotal,
} from "../src/utils/estimatorMath";

describe("estimatorMath", () => {
  it("솔루션별 합계를 계산한다", () => {
    const itemsBySolution = {
      pbx: [
        { name: "업무1", baseMd: 10, difficulty: 1, complexity: 1 },
        { name: "업무2", baseMd: 5, difficulty: 2, complexity: 1 },
      ],
      ivr: [{ name: "업무3", baseMd: 8, difficulty: 1, complexity: 2 }],
    };

    const result = calcSolutionTotals(itemsBySolution);

    expect(result.pbx).toBeDefined();
    expect(result.ivr).toBeDefined();
  });

  it("Grand Base Total을 계산한다", () => {
    const solutionTotals = {
      pbx: 20,
      ivr: 30,
      cti: 10,
    };

    const result = calcGrandBaseTotal(solutionTotals);

    expect(result).toBe(60);
  });

  it("Scale 적용 값을 계산한다", () => {
    expect(calcScaledTotal(100, 1.2)).toBe(120);
  });

  it("Risk 적용 값을 계산한다", () => {
    expect(calcRiskAppliedTotal(120, 1.1)).toBe(132);
  });

  it("Management MD를 계산한다", () => {
    expect(calcMgmtMd(100, 10)).toBe(10);
  });

  it("최종 합계를 계산한다", () => {
    expect(calcFinalTotal(100, 15)).toBe(115);
  });
});