import { describe, expect, it } from "vitest";

import { resolveStandardEffortMode } from "../src/features/estimator/lib/standardEffortMode";

describe("resolveStandardEffortMode", () => {
  it("falls back to legacy mode when the standard effort feature flag is false", () => {
    expect(
      resolveStandardEffortMode({
        VITE_FEATURE_STANDARD_EFFORT: "false",
        VITE_STANDARD_EFFORT_MODE: "standard",
      })
    ).toMatchObject({
      mode: "legacy",
      isStandardFeatureEnabled: false,
      showLegacyEstimator: true,
      showStandardEstimator: false,
      shouldHideLegacyRightSidebar: false,
    });
  });

  it("defaults to parallel mode when the feature flag is true and mode is empty", () => {
    expect(
      resolveStandardEffortMode({
        VITE_FEATURE_STANDARD_EFFORT: "true",
      })
    ).toMatchObject({
      mode: "parallel",
      isParallelMode: true,
      showLegacyEstimator: true,
      showStandardEstimator: true,
      shouldHideLegacyRightSidebar: false,
    });
  });

  it("resolves explicit legacy, parallel, and standard modes", () => {
    expect(
      resolveStandardEffortMode({
        VITE_FEATURE_STANDARD_EFFORT: "true",
        VITE_STANDARD_EFFORT_MODE: "legacy",
      })
    ).toMatchObject({
      mode: "legacy",
      showLegacyEstimator: true,
      showStandardEstimator: false,
    });
    expect(
      resolveStandardEffortMode({
        VITE_FEATURE_STANDARD_EFFORT: "true",
        VITE_STANDARD_EFFORT_MODE: "parallel",
      })
    ).toMatchObject({
      mode: "parallel",
      showLegacyEstimator: true,
      showStandardEstimator: true,
    });
    expect(
      resolveStandardEffortMode({
        VITE_FEATURE_STANDARD_EFFORT: "true",
        VITE_STANDARD_EFFORT_MODE: "standard",
      })
    ).toMatchObject({
      mode: "standard",
      isStandardMode: true,
      showLegacyEstimator: true,
      showStandardEstimator: true,
      shouldHideLegacyRightSidebar: true,
    });
  });

  it("uses parallel mode for unknown mode values", () => {
    expect(
      resolveStandardEffortMode({
        VITE_FEATURE_STANDARD_EFFORT: "true",
        VITE_STANDARD_EFFORT_MODE: "unknown",
      })
    ).toMatchObject({
      mode: "parallel",
      showLegacyEstimator: true,
      showStandardEstimator: true,
    });
  });
});
