import { getStandardEffortMetaAdapter } from "./adapters/standardEffortMetaAdapterFactory";

export {
  STANDARD_BASE_EFFORT_PHASES,
  buildStandardEffortMetaSummary,
} from "./adapters/supabase/standardEffortMetaSupabaseAdapter";

function getAdapterForCall(client) {
  return getStandardEffortMetaAdapter({ client });
}

export async function fetchStandardEffortMetaAdmin(client) {
  return getAdapterForCall(client).fetchStandardEffortMetaAdmin(client);
}

export async function upsertStandardBaseEffortRows(
  solutionVariantId,
  phaseRows,
  client
) {
  return getAdapterForCall(client).upsertStandardBaseEffortRows(
    solutionVariantId,
    phaseRows,
    client
  );
}

export async function upsertStandardCoefficientRows(
  itemId,
  coefficientRows,
  client
) {
  return getAdapterForCall(client).upsertStandardCoefficientRows(
    itemId,
    coefficientRows,
    client
  );
}

export async function updateStandardSolutionVariantActive(
  solutionVariantId,
  active,
  client
) {
  return getAdapterForCall(client).updateStandardSolutionVariantActive(
    solutionVariantId,
    active,
    client
  );
}

export async function updateStandardItemActive(itemId, active, client) {
  return getAdapterForCall(client).updateStandardItemActive(
    itemId,
    active,
    client
  );
}
