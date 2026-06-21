// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const standardEffortRepositoryMock = vi.hoisted(() => ({
  fetchStandardEffortInput: vi.fn(),
  fetchStandardEffortLastChange: vi.fn(),
  fetchStandardEffortMeta: vi.fn(),
  updateProjectActualEffort: vi.fn(),
  upsertProjectItemSelections: vi.fn(),
  upsertProjectSolutionSelections: vi.fn(),
}));

vi.mock("../src/services/standardEffortRepository", () => ({
  ...standardEffortRepositoryMock,
}));

import { useEstimatorStore } from "../src/store/useEstimatorStore";

const standardEffortMeta = {
  solutions: [],
  solutionVariants: [
    {
      solution_variant_id: "pbx",
      solution_code: "pbx",
      solution_name: "PBX",
      variant_code: "avaya",
      variant_name: "Avaya",
      display_name: "PBX",
      display_order: 10,
      active: true,
    },
    {
      solution_variant_id: "cti",
      solution_code: "cti",
      solution_name: "CTI",
      variant_code: "v4",
      variant_name: "v4",
      display_name: "CTI v4",
      display_order: 20,
      active: true,
    },
  ],
  baseEffortRows: [
    { solution_variant_id: "pbx", effort_mm: 10, active: true },
    { solution_variant_id: "cti", effort_mm: 5, active: true },
  ],
  itemRows: [
    {
      item_id: "item-a",
      category_l1: "common",
      item_name: "Item A",
      display_order: 1,
      active: true,
    },
  ],
  coefficientRows: [
    {
      solution_variant_id: "pbx",
      item_id: "item-a",
      coefficient: 0.5,
      active: true,
    },
    {
      solution_variant_id: "cti",
      item_id: "item-a",
      coefficient: 1,
      active: true,
    },
  ],
};

const refreshedStandardEffortInput = {
  projectId: 42,
  solutionVariants: [
    {
      solution_variant_id: "pbx",
      solution_code: "pbx",
      solution_name: "PBX",
      variant_code: "avaya",
      variant_name: "Avaya",
      display_name: "PBX",
      display_order: 10,
      active: true,
    },
  ],
  baseEffortRows: [
    {
      solution_variant_id: "pbx",
      phase_code: "analysis",
      effort_mm: 20,
      active: true,
    },
  ],
  itemRows: [
    {
      item_id: "item-a",
      category_l1: "common",
      item_name: "Item A",
      display_order: 1,
      active: true,
    },
  ],
  coefficientRows: [
    {
      solution_variant_id: "pbx",
      item_id: "item-a",
      coefficient: 2,
      active: true,
    },
  ],
  projectSolutionSelections: [
    {
      project_id: 42,
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 5,
    },
  ],
  projectItemSelections: [
    {
      project_id: 42,
      solution_variant_id: "pbx",
      item_id: "item-a",
      checked: true,
    },
  ],
};

function resetStandardEffortState() {
  useEstimatorStore.setState({
    projectId: 42,
    standardEffortMeta,
    standardProjectSolutionSelections: [
      {
        project_id: 42,
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 1,
      },
      {
        project_id: 42,
        solution_variant_id: "cti",
        enabled: true,
        actual_effort_mm: 2,
      },
      {
        project_id: 7,
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 99,
      },
    ],
    standardProjectItemSelections: [
      {
        project_id: 42,
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: true,
      },
      {
        project_id: 42,
        solution_variant_id: "cti",
        item_id: "item-a",
        checked: true,
      },
      {
        project_id: 7,
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: true,
      },
    ],
    standardEffortResults: [],
    standardEffortLoading: false,
    standardEffortError: null,
    standardEffortLoadedProjectId: 42,
    standardEffortLastChange: null,
    standardEffortLastChangeLoading: false,
    standardEffortLastChangeError: "",
  });
}

describe("standard effort store smoke behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    standardEffortRepositoryMock.fetchStandardEffortLastChange.mockResolvedValue({
      project_id: 42,
      updated_at: "2026-06-14T08:18:00.000Z",
      updated_by_login_id: "admin01",
      updated_by_display_name: "관리자",
      source: "project_solution_selection",
    });
    resetStandardEffortState();
  });

  it("merges saved solution selections by project and solution variant", async () => {
    standardEffortRepositoryMock.upsertProjectSolutionSelections.mockResolvedValue(
      [
        {
          project_id: 42,
          solution_variant_id: "pbx",
          enabled: false,
          actual_effort_mm: 3,
        },
      ]
    );

    await useEstimatorStore
      .getState()
      .saveStandardProjectSolutionSelections(42, [
        {
          solution_variant_id: "pbx",
          enabled: false,
          actual_effort_mm: 3,
        },
      ]);

    expect(
      useEstimatorStore.getState().standardProjectSolutionSelections
    ).toEqual([
      {
        project_id: 42,
        solution_variant_id: "pbx",
        enabled: false,
        actual_effort_mm: 3,
      },
      {
        project_id: 42,
        solution_variant_id: "cti",
        enabled: true,
        actual_effort_mm: 2,
      },
      {
        project_id: 7,
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 99,
      },
    ]);
  });

  it("merges saved item selections by project, solution variant, and item", async () => {
    standardEffortRepositoryMock.upsertProjectItemSelections.mockResolvedValue([
      {
        project_id: 42,
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: false,
      },
    ]);

    await useEstimatorStore.getState().saveStandardProjectItemSelections(42, [
      {
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: false,
      },
    ]);

    expect(useEstimatorStore.getState().standardProjectItemSelections).toEqual([
      {
        project_id: 42,
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: false,
      },
      {
        project_id: 42,
        solution_variant_id: "cti",
        item_id: "item-a",
        checked: true,
      },
      {
        project_id: 7,
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: true,
      },
    ]);
  });

  it("updates actual effort without dropping other solution selections", async () => {
    standardEffortRepositoryMock.updateProjectActualEffort.mockResolvedValue({
      project_id: 42,
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 8,
    });

    await useEstimatorStore
      .getState()
      .updateStandardActualEffort(42, "pbx", 8);

    expect(
      useEstimatorStore.getState().standardProjectSolutionSelections
    ).toEqual([
      {
        project_id: 42,
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 8,
      },
      {
        project_id: 42,
        solution_variant_id: "cti",
        enabled: true,
        actual_effort_mm: 2,
      },
      {
        project_id: 7,
        solution_variant_id: "pbx",
        enabled: true,
        actual_effort_mm: 99,
      },
    ]);
  });

  it("passes row history options to standard effort repository writes", async () => {
    const options = { currentUser: { user_id: "user-1" } };
    standardEffortRepositoryMock.upsertProjectSolutionSelections.mockResolvedValue(
      [
        {
          project_id: 42,
          solution_variant_id: "pbx",
          enabled: false,
          actual_effort_mm: 3,
        },
      ]
    );
    standardEffortRepositoryMock.upsertProjectItemSelections.mockResolvedValue([
      {
        project_id: 42,
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: false,
      },
    ]);
    standardEffortRepositoryMock.updateProjectActualEffort.mockResolvedValue({
      project_id: 42,
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 8,
    });

    await useEstimatorStore
      .getState()
      .saveStandardProjectSolutionSelections(
        42,
        [
          {
            solution_variant_id: "pbx",
            enabled: false,
            actual_effort_mm: 3,
          },
        ],
        options
      );
    await useEstimatorStore.getState().saveStandardProjectItemSelections(
      42,
      [
        {
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: false,
        },
      ],
      options
    );
    await useEstimatorStore
      .getState()
      .updateStandardActualEffort(42, "pbx", 8, options);

    expect(
      standardEffortRepositoryMock.upsertProjectSolutionSelections
    ).toHaveBeenCalledWith(
      42,
      [
        {
          solution_variant_id: "pbx",
          enabled: false,
          actual_effort_mm: 3,
        },
      ],
      undefined,
      options
    );
    expect(
      standardEffortRepositoryMock.upsertProjectItemSelections
    ).toHaveBeenCalledWith(
      42,
      [
        {
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: false,
        },
      ],
      undefined,
      options
    );
    expect(
      standardEffortRepositoryMock.updateProjectActualEffort
    ).toHaveBeenCalledWith(42, "pbx", 8, undefined, options);
  });

  it("refreshes standard effort last-change after standard effort writes", async () => {
    standardEffortRepositoryMock.upsertProjectSolutionSelections.mockResolvedValue(
      [
        {
          project_id: 42,
          solution_variant_id: "pbx",
          enabled: false,
          actual_effort_mm: 3,
        },
      ]
    );
    standardEffortRepositoryMock.upsertProjectItemSelections.mockResolvedValue([
      {
        project_id: 42,
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: false,
      },
    ]);
    standardEffortRepositoryMock.updateProjectActualEffort.mockResolvedValue({
      project_id: 42,
      solution_variant_id: "pbx",
      enabled: true,
      actual_effort_mm: 8,
    });

    await useEstimatorStore
      .getState()
      .saveStandardProjectSolutionSelections(42, [
        {
          solution_variant_id: "pbx",
          enabled: false,
          actual_effort_mm: 3,
        },
      ]);
    await useEstimatorStore.getState().saveStandardProjectItemSelections(42, [
      {
        solution_variant_id: "pbx",
        item_id: "item-a",
        checked: false,
      },
    ]);
    await useEstimatorStore
      .getState()
      .updateStandardActualEffort(42, "pbx", 8);

    expect(
      standardEffortRepositoryMock.fetchStandardEffortLastChange
    ).toHaveBeenCalledTimes(3);
    expect(
      standardEffortRepositoryMock.fetchStandardEffortLastChange
    ).toHaveBeenCalledWith(42);
  });

  it("refreshes standard effort even when loadedProjectId already matches", async () => {
    standardEffortRepositoryMock.fetchStandardEffortInput.mockResolvedValue(
      refreshedStandardEffortInput
    );

    const result = await useEstimatorStore
      .getState()
      .refreshProjectStandardEffort(42);

    expect(result).toBe(true);
    expect(
      standardEffortRepositoryMock.fetchStandardEffortInput
    ).toHaveBeenCalledWith(42);
    expect(useEstimatorStore.getState().standardEffortLoadedProjectId).toBe(42);
    expect(useEstimatorStore.getState().standardEffortMeta.baseEffortRows).toEqual(
      refreshedStandardEffortInput.baseEffortRows
    );
    expect(useEstimatorStore.getState().standardProjectSolutionSelections).toEqual(
      refreshedStandardEffortInput.projectSolutionSelections
    );
    expect(useEstimatorStore.getState().standardProjectItemSelections).toEqual(
      refreshedStandardEffortInput.projectItemSelections
    );
    expect(useEstimatorStore.getState().standardEffortResults).toEqual([
      expect.objectContaining({
        solution_variant_id: "pbx",
        base_total_mm: 20,
        coefficient_total: 2,
        standard_effort_mm: 40,
        actual_effort_mm: 5,
        gap_mm: 35,
      }),
    ]);
  });

  it("sets standardEffortError when refresh fails", async () => {
    standardEffortRepositoryMock.fetchStandardEffortInput.mockRejectedValue(
      new Error("refresh failed")
    );

    const result = await useEstimatorStore
      .getState()
      .refreshProjectStandardEffort(42);

    expect(result).toBe(false);
    expect(useEstimatorStore.getState().standardEffortError).toBe(
      "refresh failed"
    );
    expect(useEstimatorStore.getState().standardEffortLoading).toBe(false);
  });
});
