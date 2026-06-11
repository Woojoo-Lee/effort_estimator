import { describe, expect, it } from "vitest";

import {
  AUDIT_LOG_REPOSITORY_METHODS,
  PROJECT_REPOSITORY_METHODS,
  STANDARD_EFFORT_REPOSITORY_METHODS,
  assertRepositoryContract,
  getMissingRepositoryMethods,
} from "../src/services/adapters";

describe("repository contract helpers", () => {
  it("returns missing function names", () => {
    const repository = {
      fetchOne: () => {},
    };

    expect(
      getMissingRepositoryMethods(repository, ["fetchOne", "saveOne"])
    ).toEqual(["saveOne"]);
  });

  it("treats null repository as all methods missing", () => {
    expect(getMissingRepositoryMethods(null, ["fetchOne", "saveOne"])).toEqual(
      ["fetchOne", "saveOne"]
    );
  });

  it("treats non-functions as missing", () => {
    const repository = {
      fetchOne: true,
      saveOne: () => {},
    };

    expect(
      getMissingRepositoryMethods(repository, ["fetchOne", "saveOne"])
    ).toEqual(["fetchOne"]);
  });

  it("returns true for a complete repository", () => {
    const repository = {
      fetchOne: () => {},
      saveOne: () => {},
    };

    expect(
      assertRepositoryContract(repository, ["fetchOne", "saveOne"], "testRepo")
    ).toBe(true);
  });

  it("throws with repository name and missing methods", () => {
    const repository = {
      fetchOne: () => {},
    };

    expect(() =>
      assertRepositoryContract(repository, ["fetchOne", "saveOne"], "testRepo")
    ).toThrow("testRepo is missing repository methods: saveOne");
  });

  it("defines the current standard effort repository methods", () => {
    expect(STANDARD_EFFORT_REPOSITORY_METHODS).toEqual(
      expect.arrayContaining([
        "fetchStandardEffortMeta",
        "fetchProjectStandardSelections",
        "fetchStandardEffortInput",
        "upsertProjectSolutionSelections",
        "upsertProjectItemSelections",
        "updateProjectActualEffort",
      ])
    );
  });

  it("defines the current audit repository methods", () => {
    expect(AUDIT_LOG_REPOSITORY_METHODS).toEqual([
      "createAuditLog",
      "createAuditLogSafe",
    ]);
  });

  it("defines project repository methods from the current service surface", () => {
    expect(PROJECT_REPOSITORY_METHODS).toEqual(
      expect.arrayContaining([
        "fetchProjects",
        "fetchProjectById",
        "saveProject",
        "deleteProjectById",
        "restoreProjectById",
        "fetchProjectVersions",
        "fetchCommonCodeRows",
        "updateCommonCodeActive",
      ])
    );
  });
});
