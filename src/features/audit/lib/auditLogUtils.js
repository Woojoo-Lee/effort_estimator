import { AUDIT_EVENT_RESULTS } from "./auditEventTypes";

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function normalizeProjectId(projectId) {
  if (projectId === undefined || projectId === null || projectId === "") {
    return null;
  }

  if (typeof projectId === "bigint") {
    return projectId.toString();
  }

  if (typeof projectId === "number") {
    if (!Number.isFinite(projectId)) {
      throw new Error("projectId must be a finite number or numeric string.");
    }

    return projectId;
  }

  if (typeof projectId === "string" && /^-?\d+$/.test(projectId.trim())) {
    return projectId.trim();
  }

  throw new Error("projectId must be a finite number or numeric string.");
}

export function toAuditJson(value, seen = new WeakSet()) {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name || "Error",
      message: value.message || "",
    };
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return null;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    const normalized = value.map((item) => toAuditJson(item, seen));
    seen.delete(value);
    return normalized;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    const entries = Object.entries(value).map(([key, childValue]) => [
      key,
      toAuditJson(childValue, seen),
    ]);

    seen.delete(value);

    if (!isPlainObject(value)) {
      return Object.fromEntries(entries);
    }

    return Object.fromEntries(entries);
  }

  return null;
}

export function normalizeAuditEventResult(result) {
  if (result === undefined || result === null || result === "") {
    return AUDIT_EVENT_RESULTS.SUCCESS;
  }

  if (
    result === AUDIT_EVENT_RESULTS.SUCCESS ||
    result === AUDIT_EVENT_RESULTS.FAILURE
  ) {
    return result;
  }

  throw new Error("eventResult must be success or failure.");
}

export function buildAuditLogPayload(input = {}) {
  const {
    eventType,
    eventResult,
    actorUserId,
    actorEmail,
    targetType,
    targetId,
    projectId,
    before,
    after,
    metadata,
    ipAddress,
    userAgent,
    requestId,
  } = input;

  if (!eventType) {
    throw new Error("eventType is required.");
  }

  if (!targetType) {
    throw new Error("targetType is required.");
  }

  return {
    event_type: String(eventType),
    event_result: normalizeAuditEventResult(eventResult),
    actor_user_id: actorUserId ?? null,
    actor_email: actorEmail ?? null,
    target_type: String(targetType),
    target_id:
      targetId === undefined || targetId === null ? null : String(targetId),
    project_id: normalizeProjectId(projectId),
    before_json: toAuditJson(before),
    after_json: toAuditJson(after),
    metadata_json: toAuditJson(metadata),
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
    request_id: requestId ?? null,
  };
}
