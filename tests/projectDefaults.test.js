import { describe, expect, it } from "vitest";

import { buildDefaultProjectState } from "../src/shared/lib/projectDefaults";

const codebooks = [
  {
    group_code: "SOLUTION",
    code: "pbx",
    code_name: "PBX",
    code_value: "pbx",
    sort_order: 1,
    is_active: true,
  },
  {
    group_code: "SOLUTION",
    code: "cti",
    code_name: "CTI",
    code_value: "cti",
    sort_order: 2,
    is_active: true,
  },
];

describe("projectDefaults", () => {
  it("policy 값을 기본 프로젝트 상태에 반영한다", () => {
    const state = buildDefaultProjectState({
      codebooks,
      policy: {
        DEFAULT_ACTIVE_TAB: "cti",
        DEFAULT_SCALE_FACTOR: "1.2",
        DEFAULT_RISK_FACTOR: "1.1",
        DEFAULT_MGMT_RATE: "15",
      },
    });

    expect(state.activeTab).toBe("cti");
    expect(state.scaleFactor).toBe(1.2);
    expect(state.riskFactor).toBe(1.1);
    expect(state.mgmtRate).toBe(15);
  });

  it("itemMeta와 codebooks 기준으로 모든 솔루션 키를 보장한다", () => {
    const state = buildDefaultProjectState({
      codebooks,
      itemMeta: [
        {
          solution_code: "pbx",
          item_code: "PBX_LOGIN",
          item_name: "로그인 연동",
          default_base_md: "2.00",
          default_difficulty: 1,
          default_complexity: 2,
          sort_order: 1,
          is_active: true,
        },
      ],
    });

    expect(Object.keys(state.itemsBySolution)).toEqual(["pbx", "cti"]);
    expect(state.itemsBySolution.pbx).toHaveLength(1);
    expect(state.itemsBySolution.cti).toEqual([]);
  });

  it("itemMeta와 codebooks가 없으면 fallback 기본 업무를 사용한다", () => {
    const state = buildDefaultProjectState();

    expect(state.itemsBySolution.pbx.length).toBeGreaterThan(0);
  });
  it("stats fallback keeps four default items when meta is partial", () => {
    const state = buildDefaultProjectState({
      itemMeta: [
        {
          solution_code: "stats",
          item_code: "STATS_DASHBOARD",
          item_name: "Dashboard",
          default_base_md: "4.00",
          sort_order: 1,
          is_active: true,
        },
      ],
    });

    expect(state.itemsBySolution.stats.map((item) => item.item_code)).toEqual([
      "STATS_DASHBOARD",
      "STATS_HISTORY",
      "STATS_REPORT",
      "STATS_BATCH",
    ]);
  });
});
