import { describe, expect, it, vi } from "vitest";

import {
  AUDIT_EVENT_TYPES,
  AUDIT_TARGET_TYPES,
  createAuditLog,
  createAuditLogSafe,
} from "../src/features/audit";

function createAuditClient({ data = null, error = null } = {}) {
  const query = {
    select: vi.fn(() => query),
    single: vi.fn(() =>
      Promise.resolve({
        data: data || { audit_log_id: "audit-1", ...query.payload },
        error,
      })
    ),
  };
  const table = {
    insert: vi.fn((payload) => {
      query.payload = payload;
      return query;
    }),
  };
  const client = {
    from: vi.fn((tableName) => {
      query.tableName = tableName;
      return table;
    }),
  };

  return {
    client,
    query,
    table,
  };
}

function createInput() {
  return {
    eventType: AUDIT_EVENT_TYPES.EXPORT_DOWNLOAD,
    targetType: AUDIT_TARGET_TYPES.EXPORT,
    targetId: "estimate-xlsx",
    projectId: 1001,
    metadata: {
      format: "xlsx",
    },
  };
}

describe("auditLogRepository", () => {
  it("inserts one row into app_audit_logs and returns the created row", async () => {
    const { client, query, table } = createAuditClient();

    const result = await createAuditLog(createInput(), client);

    expect(client.from).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith("app_audit_logs");
    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: AUDIT_EVENT_TYPES.EXPORT_DOWNLOAD,
        target_type: AUDIT_TARGET_TYPES.EXPORT,
        target_id: "estimate-xlsx",
        project_id: 1001,
        metadata_json: { format: "xlsx" },
      })
    );
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.single).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      audit_log_id: "audit-1",
      event_type: AUDIT_EVENT_TYPES.EXPORT_DOWNLOAD,
    });
  });

  it("throws when Supabase insert returns an error", async () => {
    const { client } = createAuditClient({
      error: new Error("audit insert failed"),
    });

    await expect(createAuditLog(createInput(), client)).rejects.toThrow(
      "audit insert failed"
    );
  });

  it("returns ok=true from createAuditLogSafe on success", async () => {
    const { client } = createAuditClient({
      data: { audit_log_id: "audit-safe-1" },
    });

    await expect(createAuditLogSafe(createInput(), client)).resolves.toEqual({
      ok: true,
      data: { audit_log_id: "audit-safe-1" },
      error: null,
    });
  });

  it("returns ok=false from createAuditLogSafe without throwing on failure", async () => {
    const error = new Error("audit insert failed");
    const { client } = createAuditClient({ error });

    await expect(createAuditLogSafe(createInput(), client)).resolves.toEqual({
      ok: false,
      data: null,
      error,
    });
  });

  it("does not use nested joins or touch tables other than app_audit_logs", async () => {
    const { client, query } = createAuditClient();

    await createAuditLog(createInput(), client);

    expect(client.from.mock.calls.map((call) => call[0])).toEqual([
      "app_audit_logs",
    ]);
    expect(query.select).toHaveBeenCalledWith("*");
  });
});
