import { describe, expect, it } from "vitest";

import {
  AUDIT_EVENT_RESULTS,
  AUDIT_EVENT_TYPES,
  AUDIT_TARGET_TYPES,
  buildAuditLogPayload,
  toAuditJson,
} from "../src/features/audit";

describe("auditLogUtils", () => {
  it("builds an app_audit_logs snake_case payload", () => {
    const payload = buildAuditLogPayload({
      eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_ACTUAL_EFFORT_UPDATE,
      actorUserId: "user-1",
      actorEmail: "user@example.com",
      targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT,
      targetId: 42,
      projectId: "1001",
      before: { actual_effort_mm: 1.5 },
      after: { actual_effort_mm: 2.25 },
      metadata: { unit: "M/M", coefficient: 0.5 },
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      requestId: "request-1",
    });

    expect(payload).toEqual({
      event_type: AUDIT_EVENT_TYPES.STANDARD_EFFORT_ACTUAL_EFFORT_UPDATE,
      event_result: AUDIT_EVENT_RESULTS.SUCCESS,
      actor_user_id: "user-1",
      actor_email: "user@example.com",
      target_type: AUDIT_TARGET_TYPES.STANDARD_EFFORT,
      target_id: "42",
      project_id: "1001",
      before_json: { actual_effort_mm: 1.5 },
      after_json: { actual_effort_mm: 2.25 },
      metadata_json: { unit: "M/M", coefficient: 0.5 },
      ip_address: "127.0.0.1",
      user_agent: "vitest",
      request_id: "request-1",
    });
  });

  it("requires eventType and targetType", () => {
    expect(() =>
      buildAuditLogPayload({ targetType: AUDIT_TARGET_TYPES.PROJECT })
    ).toThrow("eventType");
    expect(() =>
      buildAuditLogPayload({ eventType: AUDIT_EVENT_TYPES.PROJECT_UPDATE })
    ).toThrow("targetType");
  });

  it("accepts success and failure event results only", () => {
    expect(
      buildAuditLogPayload({
        eventType: AUDIT_EVENT_TYPES.PROJECT_UPDATE,
        eventResult: AUDIT_EVENT_RESULTS.FAILURE,
        targetType: AUDIT_TARGET_TYPES.PROJECT,
      }).event_result
    ).toBe(AUDIT_EVENT_RESULTS.FAILURE);

    expect(() =>
      buildAuditLogPayload({
        eventType: AUDIT_EVENT_TYPES.PROJECT_UPDATE,
        eventResult: "ignored",
        targetType: AUDIT_TARGET_TYPES.PROJECT,
      })
    ).toThrow("success or failure");
  });

  it("normalizes targetId and projectId without changing numeric values", () => {
    expect(
      buildAuditLogPayload({
        eventType: AUDIT_EVENT_TYPES.PROJECT_UPDATE,
        targetType: AUDIT_TARGET_TYPES.PROJECT,
        targetId: 123,
        projectId: 456,
      })
    ).toMatchObject({
      target_id: "123",
      project_id: 456,
    });

    expect(
      buildAuditLogPayload({
        eventType: AUDIT_EVENT_TYPES.PROJECT_UPDATE,
        targetType: AUDIT_TARGET_TYPES.PROJECT,
        projectId: "456",
      }).project_id
    ).toBe("456");

    expect(() =>
      buildAuditLogPayload({
        eventType: AUDIT_EVENT_TYPES.PROJECT_UPDATE,
        targetType: AUDIT_TARGET_TYPES.PROJECT,
        projectId: "abc",
      })
    ).toThrow("projectId");
  });

  it("converts Date, Error, undefined, and circular references for JSONB", () => {
    const date = new Date("2026-05-27T01:02:03.000Z");
    const error = new TypeError("bad input");
    const circular = { name: "root" };
    circular.self = circular;

    expect(
      toAuditJson({
        date,
        error,
        missing: undefined,
        circular,
      })
    ).toEqual({
      date: "2026-05-27T01:02:03.000Z",
      error: {
        name: "TypeError",
        message: "bad input",
      },
      missing: null,
      circular: {
        name: "root",
        self: "[Circular]",
      },
    });
  });

  it("keeps M/M values unchanged and does not apply unit conversion", () => {
    const payload = buildAuditLogPayload({
      eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_BASE_EFFORT_UPDATE,
      targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
      before: { effort_mm: 6 },
      after: { effort_mm: 7.5 },
      metadata: { unit: "M/M" },
    });

    expect(payload.before_json.effort_mm).toBe(6);
    expect(payload.after_json.effort_mm).toBe(7.5);
    expect(payload.metadata_json.unit).toBe("M/M");
  });
});
