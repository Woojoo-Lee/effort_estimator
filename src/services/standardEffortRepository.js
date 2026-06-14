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
