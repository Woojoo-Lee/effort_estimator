import { describe, expect, it } from "vitest";

import {
  DEFAULT_FRONTEND_AUDIT_MODE,
  FRONTEND_AUDIT_MODES,
  decorateAuditMetadata,
  normalizeFrontendAuditMode,
  resolveFrontendAuditPolicy,
  shouldWriteFrontendAudit,
  shouldWriteShadowAudit,
} from "../src/features/audit";

describe("frontend audit policy", () => {
  it("uses auto mode by default", () => {
    const normalized = normalizeFrontendAuditMode();
    const policy = resolveFrontendAuditPolicy({});

    expect(normalized.mode).toBe(DEFAULT_FRONTEND_AUDIT_MODE);
    expect(policy.mode).toBe(FRONTEND_AUDIT_MODES.AUTO);
    expect(policy.dataBackend).toBe("supabase");
  });

  it("enables frontend audit for auto mode with the Supabase backend", () => {
    const policy = resolveFrontendAuditPolicy({
      VITE_FRONTEND_AUDIT_MODE: "auto",
      VITE_DATA_BACKEND: "supabase",
    });

    expect(policy.shouldWrite).toBe(true);
    expect(policy.isShadow).toBe(false);
  });

  it("disables frontend audit for auto mode with the API backend", () => {
    const policy = resolveFrontendAuditPolicy({
      VITE_FRONTEND_AUDIT_MODE: "auto",
      VITE_DATA_BACKEND: "api",
    });

    expect(policy.shouldWrite).toBe(false);
    expect(policy.isShadow).toBe(false);
  });

  it("allows enabled mode to write even with the API backend", () => {
    const policy = resolveFrontendAuditPolicy({
      VITE_FRONTEND_AUDIT_MODE: "enabled",
      VITE_DATA_BACKEND: "api",
    });

    expect(policy.shouldWrite).toBe(true);
    expect(policy.isShadow).toBe(false);
  });

  it("allows disabled mode to suppress writes even with the Supabase backend", () => {
    const policy = resolveFrontendAuditPolicy({
      VITE_FRONTEND_AUDIT_MODE: "disabled",
      VITE_DATA_BACKEND: "supabase",
    });

    expect(policy.shouldWrite).toBe(false);
    expect(policy.isShadow).toBe(false);
  });

  it("marks shadow mode as writable shadow audit", () => {
    const policy = resolveFrontendAuditPolicy({
      VITE_FRONTEND_AUDIT_MODE: "shadow",
      VITE_DATA_BACKEND: "api",
    });

    expect(policy.shouldWrite).toBe(true);
    expect(policy.isShadow).toBe(true);
    expect(policy.metadata).toEqual({
      audit_source: "frontend",
      data_backend: "api",
      frontend_shadow: true,
    });
  });

  it("adds frontend shadow metadata in shadow mode", () => {
    const metadata = decorateAuditMetadata(
      { section: "actual_effort", unit: "M/M" },
      {
        VITE_FRONTEND_AUDIT_MODE: "shadow",
        VITE_DATA_BACKEND: "api",
      }
    );

    expect(metadata).toEqual({
      section: "actual_effort",
      unit: "M/M",
      audit_source: "frontend",
      data_backend: "api",
      frontend_shadow: true,
    });
  });

  it("adds frontend source metadata in enabled mode", () => {
    const metadata = decorateAuditMetadata(
      { section: "coefficient" },
      {
        VITE_FRONTEND_AUDIT_MODE: "enabled",
        VITE_DATA_BACKEND: "supabase",
      }
    );

    expect(metadata).toEqual({
      section: "coefficient",
      audit_source: "frontend",
      data_backend: "supabase",
    });
  });

  it("falls back to auto mode for unknown mode values with a warning", () => {
    const policy = resolveFrontendAuditPolicy({
      VITE_FRONTEND_AUDIT_MODE: "mystery",
      VITE_DATA_BACKEND: "api",
    });

    expect(policy.mode).toBe(FRONTEND_AUDIT_MODES.AUTO);
    expect(policy.isFallback).toBe(true);
    expect(policy.shouldWrite).toBe(false);
    expect(policy.warnings).toEqual([
      'Unknown VITE_FRONTEND_AUDIT_MODE "mystery". Falling back to auto.',
    ]);
  });

  it("normalizes case and whitespace for mode values", () => {
    const normalized = normalizeFrontendAuditMode("  ShAdOw  ");

    expect(normalized.mode).toBe(FRONTEND_AUDIT_MODES.SHADOW);
    expect(normalized.isFallback).toBe(false);
  });

  it("preserves existing audit metadata fields", () => {
    const metadata = decorateAuditMetadata(
      {
        section: "base_effort",
        unit: "M/M",
        coefficient_unit: "unitless",
      },
      {
        VITE_FRONTEND_AUDIT_MODE: "enabled",
        VITE_DATA_BACKEND: "supabase",
      }
    );

    expect(metadata.section).toBe("base_effort");
    expect(metadata.unit).toBe("M/M");
    expect(metadata.coefficient_unit).toBe("unitless");
  });

  it("does not mutate the original metadata object", () => {
    const original = {
      section: "item_selection",
      frontend_shadow: true,
    };
    const metadata = decorateAuditMetadata(original, {
      VITE_FRONTEND_AUDIT_MODE: "enabled",
      VITE_DATA_BACKEND: "supabase",
    });

    expect(original).toEqual({
      section: "item_selection",
      frontend_shadow: true,
    });
    expect(metadata).toEqual({
      section: "item_selection",
      audit_source: "frontend",
      data_backend: "supabase",
    });
  });

  it("reads shouldWrite from an already resolved policy", () => {
    expect(
      shouldWriteFrontendAudit({
        shouldWrite: false,
        isShadow: false,
      })
    ).toBe(false);
  });

  it("resolves shouldWrite from an env object", () => {
    expect(
      shouldWriteFrontendAudit({
        VITE_FRONTEND_AUDIT_MODE: "enabled",
        VITE_DATA_BACKEND: "api",
      })
    ).toBe(true);
  });

  it("resolves shadow state from a policy or env object", () => {
    expect(
      shouldWriteShadowAudit({
        shouldWrite: true,
        isShadow: true,
      })
    ).toBe(true);
    expect(
      shouldWriteShadowAudit({
        VITE_FRONTEND_AUDIT_MODE: "shadow",
        VITE_DATA_BACKEND: "api",
      })
    ).toBe(true);
  });

  it("does not convert M/M-related metadata values", () => {
    const metadata = decorateAuditMetadata(
      {
        unit: "M/M",
        effort_mm: "1.25",
      },
      {
        VITE_FRONTEND_AUDIT_MODE: "shadow",
        VITE_DATA_BACKEND: "api",
      }
    );

    expect(metadata.unit).toBe("M/M");
    expect(metadata.effort_mm).toBe("1.25");
  });
});
