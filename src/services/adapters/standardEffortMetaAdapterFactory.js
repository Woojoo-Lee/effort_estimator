import { DATA_BACKENDS, resolveDataBackend } from "../dataBackend";
import * as defaultApiAdapter from "./api/standardEffortMetaApiAdapter";
import {
  assertRepositoryContract,
  STANDARD_EFFORT_META_REPOSITORY_METHODS,
} from "./repositoryContracts";
import * as defaultSupabaseAdapter from "./supabase/standardEffortMetaSupabaseAdapter";

function assertStandardEffortMetaAdapter(adapter, repositoryName) {
  assertRepositoryContract(
    adapter,
    STANDARD_EFFORT_META_REPOSITORY_METHODS,
    repositoryName
  );

  return adapter;
}

export function selectStandardEffortMetaAdapter(options = {}) {
  const {
    env,
    client,
    supabaseAdapter = defaultSupabaseAdapter,
    apiAdapter = defaultApiAdapter,
  } = options;

  if (client) {
    return assertStandardEffortMetaAdapter(
      supabaseAdapter,
      "standardEffortMetaSupabaseAdapter"
    );
  }

  const backendConfig = resolveDataBackend(env);
  const adapter =
    backendConfig.backend === DATA_BACKENDS.API ? apiAdapter : supabaseAdapter;
  const repositoryName =
    backendConfig.backend === DATA_BACKENDS.API
      ? "standardEffortMetaApiAdapter"
      : "standardEffortMetaSupabaseAdapter";

  return assertStandardEffortMetaAdapter(adapter, repositoryName);
}

export function getStandardEffortMetaAdapter(options = {}) {
  return selectStandardEffortMetaAdapter(options);
}
