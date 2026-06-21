const CODEBOOKS_ENDPOINT = "/api/codebooks";

function getFetchImpl(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Codebook admin fetch implementation is not configured.");
  }

  return fetchImpl;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeCodebookRow(row = {}) {
  return {
    id: row.id,
    group_code: row.group_code || "",
    code: row.code || "",
    code_name: row.code_name || "",
    code_value: row.code_value || "",
    description: row.description || null,
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active !== false,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function requestCodebooks(options = {}, fetchImpl) {
  const fetcher = getFetchImpl(fetchImpl);
  const response = await fetcher(CODEBOOKS_ENDPOINT, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await readJsonSafely(response);

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || "Codebook request failed."
    );
    error.status = response.status;
    error.code = payload?.error?.code || "CODEBOOK_REQUEST_FAILED";
    error.details = payload?.error?.details || null;
    throw error;
  }

  return payload;
}

export async function fetchCodebookRows(fetchImpl) {
  try {
    const payload = await requestCodebooks(
      {
        method: "GET",
      },
      fetchImpl
    );

    return {
      data: (payload?.data?.rows || payload?.rows || []).map(normalizeCodebookRow),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error,
    };
  }
}

export async function createCodebookRow(payload, fetchImpl) {
  try {
    const result = await requestCodebooks(
      {
        method: "POST",
        body: JSON.stringify(payload || {}),
      },
      fetchImpl
    );

    return {
      data: normalizeCodebookRow(result?.data?.row || result?.row || {}),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error,
    };
  }
}

export async function updateCodebookRow(id, payload, fetchImpl) {
  try {
    const result = await requestCodebooks(
      {
        method: "PATCH",
        body: JSON.stringify({
          id,
          ...(payload || {}),
        }),
      },
      fetchImpl
    );

    return {
      data: normalizeCodebookRow(result?.data?.row || result?.row || {}),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error,
    };
  }
}

export async function updateCodebookActive(id, isActive, fetchImpl) {
  return updateCodebookRow(id, { is_active: isActive }, fetchImpl);
}

export const codebookAdminRepository = {
  fetchCodebookRows,
  createCodebookRow,
  updateCodebookRow,
  updateCodebookActive,
};
