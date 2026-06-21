import { afterEach, describe, expect, it, vi } from "vitest";

import * as projectApiAdapter from "../src/services/adapters/api/projectApiAdapter";
import {
  assertRepositoryContract,
  PROJECT_REPOSITORY_METHODS,
  selectProjectAdapter,
} from "../src/services/adapters";
import * as projectSupabaseAdapter from "../src/services/adapters/supabase/projectSupabaseAdapter";
import * as projectService from "../src/services/projectService";

function createAdapter(name) {
  return PROJECT_REPOSITORY_METHODS.reduce((adapter, methodName) => {
    adapter[methodName] = vi.fn(() => name);
    return adapter;
  }, {});
}

describe("project service adapter boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps the existing project service exports", () => {
    PROJECT_REPOSITORY_METHODS.forEach((methodName) => {
      expect(typeof projectService[methodName]).toBe("function");
    });
  });

  it("keeps toPayload as a pure facade export", () => {
    expect(
      projectService.toPayload({
        activeTab: "pbx",
        projectName: "Project A",
        itemsBySolution: { pbx: [] },
        scaleFactor: 1.2,
        riskFactor: 1.1,
        mgmtRate: 5,
        savedAt: "2026-06-02",
      })
    ).toEqual({
      fileVersion: "2.0",
      activeTab: "pbx",
      projectName: "Project A",
      itemsBySolution: { pbx: [] },
      scaleFactor: 1.2,
      riskFactor: 1.1,
      mgmtRate: 5,
      savedAt: "2026-06-02",
    });
  });

  it("selects the Supabase adapter by default", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectProjectAdapter({
        env: {},
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(supabaseAdapter);
  });

  it("selects the Supabase adapter in explicit supabase mode", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectProjectAdapter({
        env: { VITE_DATA_BACKEND: "supabase" },
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(supabaseAdapter);
  });

  it("selects the API adapter in api mode", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectProjectAdapter({
        env: { VITE_DATA_BACKEND: "api" },
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(apiAdapter);
  });

  it("selects the Supabase adapter when a client is injected, even in api mode", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");

    expect(
      selectProjectAdapter({
        env: { VITE_DATA_BACKEND: "api" },
        client: { from: vi.fn() },
        supabaseAdapter,
        apiAdapter,
      })
    ).toBe(supabaseAdapter);
  });

  it("validates both project adapters against the contract", () => {
    expect(
      assertRepositoryContract(
        projectSupabaseAdapter,
        PROJECT_REPOSITORY_METHODS,
        "projectSupabaseAdapter"
      )
    ).toBe(true);
    expect(
      assertRepositoryContract(
        projectApiAdapter,
        PROJECT_REPOSITORY_METHODS,
        "projectApiAdapter"
      )
    ).toBe(true);
  });

  it("uses the exported API adapter legacy meta read path", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              itemMeta: [{ id: "item-1", solution_code: "PBX" }],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectApiAdapter.fetchEstimationItemMeta();

    expect(result).toEqual({
      data: [{ id: "item-1", solution_code: "PBX" }],
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/legacy-estimator/item-meta"
    );
  });

  it("uses the API adapter read path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              projects: [{ id: "42", project_name: "Project A" }],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.fetchProjects();

    expect(result).toEqual({
      data: [{ id: "42", project_name: "Project A" }],
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/projects");
  });

  it("passes project list options to the API adapter through the facade", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              projects: [
                {
                  id: "42",
                  project_name: "Project A",
                  status: "archived",
                },
              ],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.fetchProjects({ includeArchived: true });

    expect(result).toEqual({
      data: [
        {
          id: "42",
          project_name: "Project A",
          status: "archived",
        },
      ],
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects?include_archived=true"
    );
  });

  it("uses the API adapter project read path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                project_name: "Project A",
                payload: { activeTab: "pbx" },
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.fetchProjectById("42");

    expect(result).toEqual({
      data: {
        id: "42",
        project_name: "Project A",
        payload: { activeTab: "pbx" },
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/projects/42");
  });

  it("uses the API adapter save path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const payload = { activeTab: "pbx", itemsBySolution: { pbx: [] } };
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                project_name: "Project A",
                payload,
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.saveProject({
      projectName: "Project A",
      payload,
    });

    expect(result).toEqual({
      data: {
        id: "42",
        project_name: "Project A",
        payload,
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/projects");
    expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_name: "Project A",
      payload,
    });
  });

  it("adds current user owner metadata to new project payloads through the facade", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const payload = { activeTab: "pbx", itemsBySolution: { pbx: [] } };
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                project_name: "Project A",
                payload: {
                  ...payload,
                  owner_user_id: "user-1",
                  created_by: "user-1",
                  updated_by: "user-1",
                  updated_by_login_id: "sales01",
                  updated_by_display_name: "영업대표",
                },
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.saveProject(
      {
        projectName: "Project A",
        payload,
      },
      {
        currentUser: {
          user_id: "user-1",
          login_id: "sales01",
          display_name: "영업대표",
        },
      }
    );

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);

    expect(body).toEqual({
      project_name: "Project A",
      payload: {
        ...payload,
        owner_user_id: "user-1",
        created_by: "user-1",
        updated_by: "user-1",
        updated_by_login_id: "sales01",
        updated_by_display_name: "영업대표",
      },
    });
    expect(result.data).toEqual({
      id: "42",
      project_name: "Project A",
      owner_user_id: "user-1",
      ownerUserId: "user-1",
      created_by: "user-1",
      createdBy: "user-1",
      created_by_user_id: "user-1",
      createdByUserId: "user-1",
      updated_by: "user-1",
      updatedBy: "user-1",
      updated_by_login_id: "sales01",
      updatedByLoginId: "sales01",
      updated_by_display_name: "영업대표",
      updatedByDisplayName: "영업대표",
      payload: {
        ...payload,
        owner_user_id: "user-1",
        created_by: "user-1",
        updated_by: "user-1",
        updated_by_login_id: "sales01",
        updated_by_display_name: "영업대표",
      },
    });
  });

  it("adds current user updater metadata to existing project payloads through the facade", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const payload = { activeTab: "pbx", itemsBySolution: { pbx: [] } };
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                project_name: "Project A",
                payload: {
                  ...payload,
                  updated_by: "admin-user",
                  updated_by_login_id: "admin01",
                  updated_by_display_name: "관리자",
                },
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.saveProject(
      {
        projectId: "42",
        projectName: "Project A",
        payload,
      },
      {
        currentUser: {
          user_id: "admin-user",
          login_id: "admin01",
          display_name: "관리자",
        },
      }
    );

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);

    expect(body).toEqual({
      project_id: "42",
      project_name: "Project A",
      payload: {
        ...payload,
        updated_by: "admin-user",
        updated_by_login_id: "admin01",
        updated_by_display_name: "관리자",
      },
    });
    expect(result.data).toEqual(
      expect.objectContaining({
        updated_by: "admin-user",
        updatedBy: "admin-user",
        updated_by_login_id: "admin01",
        updatedByLoginId: "admin01",
        updated_by_display_name: "관리자",
        updatedByDisplayName: "관리자",
      })
    );
  });

  it("uses the API adapter archive path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                status: "archived",
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.deleteProjectById("42");

    expect(result).toEqual({
      data: {
        id: "42",
        status: "archived",
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/archive"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
    expect(fetchImpl.mock.calls[0][1].method).not.toBe("DELETE");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
    });
  });

  it("passes updater metadata to the API archive path through the facade", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                status: "archived",
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.deleteProjectById("42", {
      currentUser: {
        user_id: "admin-user",
        login_id: "admin01",
        display_name: "관리자",
      },
    });

    expect(result.error).toBeNull();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
      updated_by: "admin-user",
      updated_by_login_id: "admin01",
      updated_by_display_name: "관리자",
    });
  });

  it("uses the API adapter restore path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                status: "active",
                archived_at: null,
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.restoreProjectById("42", {
      restoreReason: "user request",
    });

    expect(result).toEqual({
      data: {
        id: "42",
        status: "active",
        archived_at: null,
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/restore"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
      restore_reason: "user request",
    });
  });

  it("passes updater metadata to the API restore path through the facade", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: {
                id: "42",
                status: "active",
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.restoreProjectById("42", {
      restoreReason: "user request",
      currentUser: {
        user_id: "admin-user",
        login_id: "admin01",
        display_name: "관리자",
      },
    });

    expect(result.error).toBeNull();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
      updated_by: "admin-user",
      updated_by_login_id: "admin01",
      updated_by_display_name: "관리자",
      restore_reason: "user request",
    });
  });

  it("uses the API adapter version list path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              versions: [
                {
                  id: "version-1",
                  project_id: "42",
                  version_no: 2,
                  payload: { activeTab: "pbx" },
                },
              ],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.fetchProjectVersions("42");

    expect(result).toEqual({
      data: [
        {
          id: "version-1",
          project_id: "42",
          version_no: 2,
          payload: { activeTab: "pbx" },
        },
      ],
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/versions"
    );
  });

  it("uses the API adapter latest version path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              latest_version_no: 3,
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.fetchLatestProjectVersionNo("42");

    expect(result).toEqual({
      data: {
        latest_version_no: 3,
        version_no: 3,
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/versions/latest"
    );
  });

  it("uses the API adapter version save path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const payload = { activeTab: "pbx", itemsBySolution: { pbx: [] } };
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              version: {
                id: "version-1",
                project_id: "42",
                version_no: 4,
                payload,
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.saveProjectVersion({
      projectId: "42",
      versionNo: 4,
      savedType: "manual",
      projectName: "Project A",
      payload,
    });

    expect(result).toEqual({
      data: {
        id: "version-1",
        project_id: "42",
        version_no: 4,
        payload,
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/versions"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
      version_no: 4,
      saved_type: "manual",
      project_name: "Project A",
      payload,
    });
  });

  it("uses the API adapter common codes path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              codebooks: [{ id: "1", group_code: "solution", code: "PBX" }],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.fetchCommonCodes();

    expect(result).toEqual({
      data: [{ id: "1", group_code: "solution", code: "PBX" }],
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/codebooks");
  });

  it("uses the API adapter common code rows path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              rows: [{ id: "1", group_code: "solution", code: "PBX" }],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.fetchCommonCodeRows();

    expect(result).toEqual({
      data: [{ id: "1", group_code: "solution", code: "PBX" }],
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/codebooks/rows"
    );
  });

  it("uses the API adapter common code create path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              row: {
                id: "1",
                group_code: "solution",
                code: "PBX",
                is_active: true,
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.createCommonCodeRow({
      group_code: "solution",
      code: "PBX",
    });

    expect(result).toEqual({
      data: {
        id: "1",
        group_code: "solution",
        code: "PBX",
        is_active: true,
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/codebooks");
    expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      group_code: "solution",
      code: "PBX",
      sort_order: 0,
      is_active: true,
    });
  });

  it("uses the API adapter common code update path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              row: {
                id: "1",
                code_name: "Updated",
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.updateCommonCodeRow("1", {
      code_name: "Updated",
    });

    expect(result).toEqual({
      data: {
        id: "1",
        code_name: "Updated",
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/codebooks/1");
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      id: "1",
      code_name: "Updated",
    });
  });

  it("uses the API adapter common code active path through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              row: {
                id: "1",
                is_active: false,
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await projectService.updateCommonCodeActive("1", false);

    expect(result).toEqual({
      data: {
        id: "1",
        is_active: false,
      },
      error: null,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/codebooks/1/active"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      id: "1",
      is_active: false,
    });
  });

  it("uses the API adapter legacy estimator meta paths through the facade in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              rows: [{ id: "legacy-1", default_base_md: "1.5" }],
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const calls = [
      [projectService.fetchEstimationItemMeta, "/legacy-estimator/item-meta"],
      [
        projectService.fetchEstimationItemMetaRows,
        "/legacy-estimator/item-meta/rows",
      ],
      [
        projectService.fetchEstimationBaseEffortMeta,
        "/legacy-estimator/base-effort-meta",
      ],
      [
        projectService.fetchEstimationItemFieldMeta,
        "/legacy-estimator/item-field-meta",
      ],
      [
        projectService.fetchEstimationEnvVarMeta,
        "/legacy-estimator/env-var-meta",
      ],
      [
        projectService.fetchEstimationCalculationMeta,
        "/legacy-estimator/calculation-meta",
      ],
      [projectService.fetchEstimationPolicy, "/legacy-estimator/policy"],
    ];

    for (const [fn] of calls) {
      const result = await fn();

      expect(result).toEqual({
        data: [{ id: "legacy-1", default_base_md: "1.5" }],
        error: null,
      });
    }

    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual(
      calls.map(([, path]) => `https://api.example.com${path}`)
    );
  });

  it("keeps project payload separate from standard effort selection payloads", () => {
    const payload = projectService.toPayload({
      activeTab: "pbx",
      projectName: "Project A",
      itemsBySolution: { pbx: [{ name: "Call", baseMd: 1 }] },
      scaleFactor: 1,
      riskFactor: 1,
      mgmtRate: 0,
      savedAt: "2026-06-02",
    });

    expect(payload).not.toHaveProperty("projectSolutionSelections");
    expect(payload).not.toHaveProperty("projectItemSelections");
    expect(payload).not.toHaveProperty("actual_effort_mm");
  });

  it("does not coerce project ids when selecting adapters", () => {
    const supabaseAdapter = createAdapter("supabase");
    const apiAdapter = createAdapter("api");
    const selected = selectProjectAdapter({
      env: { VITE_DATA_BACKEND: "api" },
      supabaseAdapter,
      apiAdapter,
    });

    selected.fetchProjectById("42");

    expect(apiAdapter.fetchProjectById).toHaveBeenCalledWith("42");
  });
});
