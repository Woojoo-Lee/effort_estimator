import { describe, expect, it } from "vitest";

import {
  buildItemsBySolution,
  getRiskOptions,
  getScaleOptions,
  getSolutionOptions,
} from "../src/shared/lib/estimatorMeta";

describe("estimatorMeta", () => {
  it("SOLUTION codebook rows를 솔루션 옵션으로 변환한다", () => {
    const options = getSolutionOptions([
      {
        group_code: "SOLUTION",
        code: "pbx",
        code_name: "PBX",
        code_value: "pbx",
        sort_order: 1,
        is_active: true,
      },
    ]);

    expect(options).toEqual([
      {
        key: "pbx",
        label: "PBX",
        icon: null,
      },
    ]);
  });

  it("SCALE/RISK codebook rows를 숫자 옵션으로 변환한다", () => {
    const codebooks = [
      {
        group_code: "SCALE",
        code: "1.2",
        code_name: "중형규모",
        code_value: "1.2",
        sort_order: 1,
        is_active: true,
      },
      {
        group_code: "RISK",
        code: "1.1",
        code_name: "보통",
        code_value: "1.1",
        sort_order: 1,
        is_active: true,
      },
    ];

    expect(getScaleOptions(codebooks)).toEqual([
      {
        value: 1.2,
        label: "중형규모 (1.2)",
      },
    ]);
    expect(getRiskOptions(codebooks)).toEqual([
      {
        value: 1.1,
        label: "보통 (1.1)",
      },
    ]);
  });

  it("estimation_item_meta rows를 기본 업무 목록으로 변환한다", () => {
    const itemsBySolution = buildItemsBySolution([
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
    ]);

    expect(itemsBySolution.pbx).toEqual([
      {
        itemCode: "PBX_LOGIN",
        name: "로그인 연동",
        baseMd: 2,
        difficulty: 0.8,
        complexity: 1,
        note: "",
      },
    ]);
  });
});
