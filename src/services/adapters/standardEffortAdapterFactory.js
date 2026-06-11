import { DATA_BACKENDS, resolveDataBackend } from "../dataBackend";
import * as defaultApiAdapter from "./api/standardEffortApiAdapter";
import {
  assertRepositoryContract,
  STANDARD_EFFORT_REPOSITORY_METHODS,
} from "./repositoryContracts";
import * as defaultSupabaseAdapter from "./supabase/standardEffortSupabaseAdapter";

function assertStandardEffortAdapter(adapter, repositoryName) {
  assertRepositoryContract(
    adapter,
    STANDARD_EFFORT_REPOSITORY_METHODS,
    repositoryName
  );

  return adapter;
}

export function selectStandardEffortAdapter(options = {}) {
  const {
    env,
    client,
    supabaseAdapter = defaultSupabaseAdapter,
    apiAdapter = defaultApiAdapter,
  } = options;

  if (client) {
    return assertStandardEffortAdapter(
      supabaseAdapter,
      "standardEffortSupabaseAdapter"
    );
  }

  const backendConfig = resolveDataBackend(env);
  const adapter =
    backendConfig.backend === DATA_BACKENDS.API ? apiAdapter : supabaseAdapter;
  const repositoryName =
    backendConfig.backend === DATA_BACKENDS.API
      ? "standardEffortApiAdapter"
      : "standardEffortSupabaseAdapter";

  return assertStandardEffortAdapter(adapter, repositoryName);
}

export function getStandardEffortAdapter(options = {}) {
  return selectStandardEffortAdapter(options);
}
