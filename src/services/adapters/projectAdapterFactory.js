import { DATA_BACKENDS, resolveDataBackend } from "../dataBackend";
import * as defaultApiAdapter from "./api/projectApiAdapter";
import {
  assertRepositoryContract,
  PROJECT_REPOSITORY_METHODS,
} from "./repositoryContracts";
import * as defaultSupabaseAdapter from "./supabase/projectSupabaseAdapter";

function assertProjectAdapter(adapter, repositoryName) {
  assertRepositoryContract(adapter, PROJECT_REPOSITORY_METHODS, repositoryName);

  return adapter;
}

export function selectProjectAdapter(options = {}) {
  const {
    env,
    client,
    supabaseAdapter = defaultSupabaseAdapter,
    apiAdapter = defaultApiAdapter,
  } = options;

  if (client) {
    return assertProjectAdapter(supabaseAdapter, "projectSupabaseAdapter");
  }

  const backendConfig = resolveDataBackend(env);
  const adapter =
    backendConfig.backend === DATA_BACKENDS.API ? apiAdapter : supabaseAdapter;
  const repositoryName =
    backendConfig.backend === DATA_BACKENDS.API
      ? "projectApiAdapter"
      : "projectSupabaseAdapter";

  return assertProjectAdapter(adapter, repositoryName);
}

export function getProjectAdapter(options = {}) {
  return selectProjectAdapter(options);
}
