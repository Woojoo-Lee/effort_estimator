import { DATA_BACKENDS, resolveDataBackend } from "../dataBackend";
import * as defaultApiAdapter from "./api/exportApiAdapter";
import * as defaultLocalAdapter from "./local/exportLocalAdapter";
import {
  assertRepositoryContract,
  EXPORT_REPOSITORY_METHODS,
} from "./repositoryContracts";

function assertExportAdapter(adapter, repositoryName) {
  assertRepositoryContract(adapter, EXPORT_REPOSITORY_METHODS, repositoryName);

  return adapter;
}

export function selectExportAdapter(options = {}) {
  const {
    env,
    localAdapter = defaultLocalAdapter,
    apiAdapter = defaultApiAdapter,
  } = options;

  const backendConfig = resolveDataBackend(env);
  const adapter =
    backendConfig.backend === DATA_BACKENDS.API ? apiAdapter : localAdapter;
  const repositoryName =
    backendConfig.backend === DATA_BACKENDS.API
      ? "exportApiAdapter"
      : "exportLocalAdapter";

  return assertExportAdapter(adapter, repositoryName);
}

export function getExportAdapter(options = {}) {
  return selectExportAdapter(options);
}
