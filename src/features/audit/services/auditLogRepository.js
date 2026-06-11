import { supabase } from "../../../services/supabaseClient";
import { buildAuditLogPayload } from "../lib/auditLogUtils";

const AUDIT_LOG_TABLE = "app_audit_logs";

function resolveClient(client) {
  const resolvedClient = client || supabase;

  if (!resolvedClient) {
    throw new Error("Supabase client is not configured.");
  }

  return resolvedClient;
}

export async function createAuditLog(input, client) {
  const db = resolveClient(client);
  const payload = buildAuditLogPayload(input);
  const { data, error } = await db
    .from(AUDIT_LOG_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAuditLogSafe(input, client) {
  try {
    const data = await createAuditLog(input, client);

    return {
      ok: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error,
    };
  }
}
