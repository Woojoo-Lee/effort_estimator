import { getStandardEffortAdapter } from "./adapters/standardEffortAdapterFactory";

function getAdapterForCall(client) {
  return getStandardEffortAdapter({ client });
}

export async function fetchStandardEffortMeta(client) {
  return getAdapterForCall(client).fetchStandardEffortMeta(client);
}

export async function fetchProjectStandardSelections(projectId, client) {
  return getAdapterForCall(client).fetchProjectStandardSelections(
    projectId,
    client
  );
}

export async function fetchStandardEffortInput(projectId, client) {
  return getAdapterForCall(client).fetchStandardEffortInput(projectId, client);
}

function normalizeStandardEffortLastChange(data = {}, projectId) {
  return {
    project_id: data.project_id ?? projectId ?? null,
    updated_at: data.updated_at || null,
    updated_by: data.updated_by || null,
    updated_by_login_id: data.updated_by_login_id || null,
    updated_by_display_name: data.updated_by_display_name || null,
    source: data.source || null,
  };
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function fetchStandardEffortLastChange(
  projectId,
  fetchImpl = globalThis.fetch
) {
  if (!projectId) {
    return normalizeStandardEffortLastChange({}, projectId);
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("Standard effort last-change fetch is not configured.");
  }

  const query = new URLSearchParams({
    project_id: String(projectId),
  });
  const response = await fetchImpl(
    `/api/standard-effort/last-change?${query.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );
  const payload = await readJsonSafely(response);

  if (!response.ok || payload?.ok === false) {
    throw new Error(
      payload?.error?.message || "Standard effort last-change request failed."
    );
  }

  return normalizeStandardEffortLastChange(payload?.data || {}, projectId);
}

export async function upsertProjectSolutionSelections(
  projectId,
  selections = [],
  client,
  options = {}
) {
  return getAdapterForCall(client).upsertProjectSolutionSelections(
    projectId,
    selections,
    client,
    options
  );
}

export async function upsertProjectItemSelections(
  projectId,
  selections = [],
  client,
  options = {}
) {
  return getAdapterForCall(client).upsertProjectItemSelections(
    projectId,
    selections,
    client,
    options
  );
}

export async function updateProjectActualEffort(
  projectId,
  solutionVariantId,
  actualEffortMm,
  client,
  options = {}
) {
  return getAdapterForCall(client).updateProjectActualEffort(
    projectId,
    solutionVariantId,
    actualEffortMm,
    client,
    options
  );
}
