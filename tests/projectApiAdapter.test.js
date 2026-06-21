import { describe, expect, it, vi } from "vitest";

import { createProjectApiAdapter } from "../src/services/adapters/api/projectApiAdapter";

function createResponse(payload, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: () => Promise.resolve(payload),
    headers: { get: () => null },
  };
}

function createAdapterWithData(data) {
  const apiClient = {
    get: vi.fn(() => Promise.resolve(data)),
  };

  return {
    adapter: createProjectApiAdapter({ apiClient }),
    apiClient,
  };
}

describe("projectApiAdapter", () => {
  it("fetchProjects calls GET /projects", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            projects: [{ id: "42", project_name: "Project A", updated_at: "now" }],
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.fetchProjects();

    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/projects");
    expect(fetchImpl.mock.calls[0][1].method).toBe("GET");
    expect(result).toEqual({
      data: [{ id: "42", project_name: "Project A", updated_at: "now" }],
      error: null,
    });
  });

  it("fetchProjects with empty options still calls GET /projects", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            projects: [],
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.fetchProjects({});

    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/projects");
    expect(result).toEqual({ data: [], error: null });
  });

  it("fetchProjects sends include_archived=true only for boolean true", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            projects: [],
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    await adapter.fetchProjects({ includeArchived: true });
    await adapter.fetchProjects({ includeArchived: false });
    await adapter.fetchProjects({ includeArchived: "true" });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects?include_archived=true"
    );
    expect(fetchImpl.mock.calls[1][0]).toBe("https://api.example.com/projects");
    expect(fetchImpl.mock.calls[2][0]).toBe("https://api.example.com/projects");
  });

  it("fetchProjects sends status=archived and status=active queries", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            projects: [],
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com" },
      fetchImpl,
    });

    await adapter.fetchProjects({ status: "archived" });
    await adapter.fetchProjects({ status: "active" });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects?status=archived"
    );
    expect(fetchImpl.mock.calls[1][0]).toBe(
      "https://api.example.com/projects?status=active"
    );
  });

  it("fetchProjects gives status priority over includeArchived", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            projects: [],
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com" },
      fetchImpl,
    });

    await adapter.fetchProjects({ includeArchived: true, status: "archived" });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects?status=archived"
    );
  });

  it("fetchProjects returns an error for invalid status values", async () => {
    const apiClient = {
      get: vi.fn(),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.fetchProjects({ status: "deleted" });

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "project API adapter fetchProjects received an invalid status."
    );
  });

  it("fetchProjects normalizes data.projects", async () => {
    const { adapter } = createAdapterWithData({
      projects: [{ id: 42, project_name: "Project A", updated_at: "now" }],
    });

    await expect(adapter.fetchProjects()).resolves.toEqual({
      data: [{ id: 42, project_name: "Project A", updated_at: "now" }],
      error: null,
    });
  });

  it("fetchProjects normalizes data.rows", async () => {
    const { adapter } = createAdapterWithData({
      rows: [{ id: "42", project_name: "Project A" }],
    });

    await expect(adapter.fetchProjects()).resolves.toEqual({
      data: [{ id: "42", project_name: "Project A" }],
      error: null,
    });
  });

  it("fetchProjects normalizes data.data", async () => {
    const { adapter } = createAdapterWithData({
      data: [{ id: "42", project_name: "Project A" }],
    });

    await expect(adapter.fetchProjects()).resolves.toEqual({
      data: [{ id: "42", project_name: "Project A" }],
      error: null,
    });
  });

  it("fetchProjects normalizes array data", async () => {
    const { adapter } = createAdapterWithData([
      { id: "42", project_name: "Project A" },
    ]);

    await expect(adapter.fetchProjects()).resolves.toEqual({
      data: [{ id: "42", project_name: "Project A" }],
      error: null,
    });
  });

  it("fetchProjects preserves archive fields and project ids without standard effort payloads", async () => {
    const { adapter } = createAdapterWithData({
      projects: [
        {
          id: "00000042",
          project_id: "00000042",
          project_name: "Project A",
          status: "archived",
          archived_at: "2026-06-02T00:00:00.000Z",
          archived_by: "user-1",
          archive_reason: "cleanup",
        },
      ],
    });

    const result = await adapter.fetchProjects({ status: "archived" });

    expect(result.data[0]).toEqual({
      id: "00000042",
      project_id: "00000042",
      project_name: "Project A",
      status: "archived",
      archived_at: "2026-06-02T00:00:00.000Z",
      archived_by: "user-1",
      archive_reason: "cleanup",
    });
    expect(result.data[0]).not.toHaveProperty("projectSolutionSelections");
    expect(result.data[0]).not.toHaveProperty("projectItemSelections");
    expect(result.data[0]).not.toHaveProperty("actual_effort_mm");
  });

  it("fetchProjects returns API errors in the Supabase-style surface", async () => {
    const error = new Error("API failed");
    const apiClient = {
      get: vi.fn(() => Promise.reject(error)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.fetchProjects()).resolves.toEqual({
      data: null,
      error,
    });
  });

  it("fetchProjects returns a base URL error without VITE_API_BASE_URL", async () => {
    const adapter = createProjectApiAdapter({ env: {} });

    const result = await adapter.fetchProjects();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("fetchProjectById calls GET /projects/{projectId} without uuid conversion", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            project: {
              id: "42",
              project_name: "Project A",
              payload: { activeTab: "pbx" },
              updated_at: "now",
            },
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com" },
      fetchImpl,
    });

    const result = await adapter.fetchProjectById("42");

    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/projects/42");
    expect(result).toEqual({
      data: {
        id: "42",
        project_name: "Project A",
        payload: { activeTab: "pbx" },
        updated_at: "now",
      },
      error: null,
    });
  });

  it("fetchProjectById normalizes data.project", async () => {
    const { adapter } = createAdapterWithData({
      project: { id: 42, project_name: "Project A", payload: { activeTab: "pbx" } },
    });

    await expect(adapter.fetchProjectById(42)).resolves.toEqual({
      data: { id: 42, project_name: "Project A", payload: { activeTab: "pbx" } },
      error: null,
    });
  });

  it("fetchProjectById normalizes data.row", async () => {
    const { adapter } = createAdapterWithData({
      row: { id: "42", project_name: "Project A" },
    });

    await expect(adapter.fetchProjectById("42")).resolves.toEqual({
      data: { id: "42", project_name: "Project A" },
      error: null,
    });
  });

  it("fetchProjectById normalizes direct object data", async () => {
    const { adapter } = createAdapterWithData({
      id: "42",
      project_name: "Project A",
      payload: { activeTab: "pbx" },
    });

    await expect(adapter.fetchProjectById("42")).resolves.toEqual({
      data: {
        id: "42",
        project_name: "Project A",
        payload: { activeTab: "pbx" },
      },
      error: null,
    });
  });

  it("fetchProjectById normalizes data.rows[0]", async () => {
    const { adapter } = createAdapterWithData({
      rows: [{ id: "42", project_name: "Project A" }],
    });

    await expect(adapter.fetchProjectById("42")).resolves.toEqual({
      data: { id: "42", project_name: "Project A" },
      error: null,
    });
  });

  it("fetchProjectById returns an error when projectId is missing", async () => {
    const apiClient = {
      get: vi.fn(),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.fetchProjectById("");

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "project API adapter fetchProjectById requires projectId."
    );
  });

  it("keeps row ids and legacy payload values unchanged", async () => {
    const payload = {
      activeTab: "pbx",
      itemsBySolution: { pbx: [{ name: "Call", baseMd: 1 }] },
      scaleFactor: 1,
      riskFactor: 1,
      mgmtRate: 0,
    };
    const { adapter } = createAdapterWithData({
      project: {
        id: "00000042",
        project_name: "Project A",
        payload,
      },
    });

    const result = await adapter.fetchProjectById("00000042");

    expect(result.data.id).toBe("00000042");
    expect(result.data.payload).toBe(payload);
    expect(result.data.payload).not.toHaveProperty("projectSolutionSelections");
    expect(result.data.payload).not.toHaveProperty("projectItemSelections");
    expect(result.data.payload).not.toHaveProperty("actual_effort_mm");
  });

  it("saveProject calls POST /projects when projectId is missing", async () => {
    const payload = {
      activeTab: "pbx",
      itemsBySolution: { pbx: [{ name: "Call", baseMd: 1 }] },
    };
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            project: {
              id: "42",
              project_name: "Project A",
              payload,
              updated_at: "now",
            },
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.saveProject({
      projectName: "Project A",
      payload,
    });

    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/projects");
    expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_name: "Project A",
      payload,
    });
    expect(result).toEqual({
      data: {
        id: "42",
        project_name: "Project A",
        payload,
        updated_at: "now",
      },
      error: null,
    });
  });

  it("saveProject calls PUT /projects/{projectId} when projectId exists", async () => {
    const payload = { activeTab: "network", projectName: "Project B" };
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            row: {
              id: "00000042",
              project_name: "Project B",
              payload,
              updated_at: "later",
            },
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com" },
      fetchImpl,
    });

    const result = await adapter.saveProject({
      projectId: "00000042",
      projectName: "Project B",
      payload,
    });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/00000042"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "00000042",
      project_name: "Project B",
      payload,
    });
    expect(result).toEqual({
      data: {
        id: "00000042",
        project_name: "Project B",
        payload,
        updated_at: "later",
      },
      error: null,
    });
  });

  it("saveProject keeps project ids and legacy payloads unchanged", async () => {
    const payload = {
      activeTab: "pbx",
      itemsBySolution: { pbx: [{ name: "Call", baseMd: 1 }] },
      scaleFactor: 1,
      riskFactor: 1,
      mgmtRate: 0,
    };
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          id: "42",
          project_name: "Project A",
          payload,
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.saveProject({
      projectId: "42",
      projectName: "Project A",
      payload,
    });

    expect(apiClient.put).toHaveBeenCalledWith("/projects/42", {
      body: {
        project_id: "42",
        project_name: "Project A",
        payload,
      },
    });
    expect(result.data.id).toBe("42");
    expect(result.data.payload).toBe(payload);
    expect(result.data.payload).not.toHaveProperty("projectSolutionSelections");
    expect(result.data.payload).not.toHaveProperty("projectItemSelections");
    expect(result.data.payload).not.toHaveProperty("actual_effort_mm");
  });

  it("saveProject keeps an empty projectName in the request body", async () => {
    const apiClient = {
      post: vi.fn(() =>
        Promise.resolve({
          project: { id: "42", project_name: "", payload: {} },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.saveProject({
      projectName: "",
      payload: {},
    });

    expect(apiClient.post).toHaveBeenCalledWith("/projects", {
      body: {
        project_name: "",
        payload: {},
      },
    });
    expect(result).toEqual({
      data: { id: "42", project_name: "", payload: {} },
      error: null,
    });
  });

  it.each([
    ["data.project", { project: { id: "42", project_name: "Project A" } }],
    ["data.row", { row: { id: "42", project_name: "Project A" } }],
    ["direct object", { id: "42", project_name: "Project A" }],
    ["data.rows[0]", { rows: [{ id: "42", project_name: "Project A" }] }],
    ["data.data", { data: { id: "42", project_name: "Project A" } }],
  ])("saveProject normalizes %s responses", async (_label, data) => {
    const apiClient = {
      post: vi.fn(() => Promise.resolve(data)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(
      adapter.saveProject({ projectName: "Project A", payload: {} })
    ).resolves.toEqual({
      data: { id: "42", project_name: "Project A" },
      error: null,
    });
  });

  it("saveProject returns API errors in the Supabase-style surface", async () => {
    const error = new Error("API failed");
    const apiClient = {
      post: vi.fn(() => Promise.reject(error)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(
      adapter.saveProject({ projectName: "Project A", payload: {} })
    ).resolves.toEqual({
      data: null,
      error,
    });
  });

  it("saveProject returns a base URL error without VITE_API_BASE_URL", async () => {
    const adapter = createProjectApiAdapter({ env: {} });

    const result = await adapter.saveProject({
      projectName: "Project A",
      payload: {},
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("deleteProjectById calls PUT /projects/{projectId}/archive without hard delete", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            project: {
              id: "42",
              project_name: "Project A",
              status: "archived",
              archived_at: "2026-06-02T00:00:00.000Z",
            },
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.deleteProjectById("42");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/archive"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
    expect(fetchImpl.mock.calls[0][1].method).not.toBe("DELETE");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
    });
    expect(result).toEqual({
      data: {
        id: "42",
        project_name: "Project A",
        status: "archived",
        archived_at: "2026-06-02T00:00:00.000Z",
      },
      error: null,
    });
  });

  it("deleteProjectById keeps project ids unchanged and excludes standard effort payloads", async () => {
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          row: {
            id: "00000042",
            project_id: "00000042",
            status: "archived",
            archived_at: "2026-06-02T00:00:00.000Z",
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.deleteProjectById("00000042");

    expect(apiClient.put).toHaveBeenCalledWith("/projects/00000042/archive", {
      body: {
        project_id: "00000042",
      },
    });
    expect(result.data.id).toBe("00000042");
    expect(result.data.project_id).toBe("00000042");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "projectSolutionSelections"
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "projectItemSelections"
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "actual_effort_mm"
    );
  });

  it("deleteProjectById can include updater metadata without hard delete", async () => {
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          row: {
            id: "00000042",
            status: "archived",
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.deleteProjectById("00000042", {
      currentUser: {
        user_id: "admin-user",
        login_id: "admin01",
        display_name: "관리자",
      },
    });

    expect(apiClient.put).toHaveBeenCalledWith("/projects/00000042/archive", {
      body: {
        project_id: "00000042",
        updated_by: "admin-user",
        updated_by_login_id: "admin01",
        updated_by_display_name: "관리자",
      },
    });
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("password");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "password_hash"
    );
    expect(result.data.status).toBe("archived");
  });

  it.each([
    ["data.project", { project: { id: "42", status: "archived" } }],
    ["data.row", { row: { id: "42", status: "archived" } }],
    ["direct object", { id: "42", status: "archived" }],
    ["data.rows[0]", { rows: [{ id: "42", status: "archived" }] }],
    ["data.data", { data: { id: "42", status: "archived" } }],
  ])("deleteProjectById normalizes %s responses", async (_label, data) => {
    const apiClient = {
      put: vi.fn(() => Promise.resolve(data)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.deleteProjectById("42")).resolves.toEqual({
      data: { id: "42", status: "archived" },
      error: null,
    });
  });

  it("deleteProjectById returns null data when the archive API returns no row", async () => {
    const apiClient = {
      put: vi.fn(() => Promise.resolve(null)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.deleteProjectById("42")).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  it("deleteProjectById returns an error when projectId is missing", async () => {
    const apiClient = {
      put: vi.fn(),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.deleteProjectById("");

    expect(apiClient.put).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "project API adapter deleteProjectById requires projectId."
    );
  });

  it("deleteProjectById returns API errors in the Supabase-style surface", async () => {
    const error = new Error("API failed");
    const apiClient = {
      put: vi.fn(() => Promise.reject(error)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.deleteProjectById("42")).resolves.toEqual({
      data: null,
      error,
    });
  });

  it("deleteProjectById returns a base URL error without VITE_API_BASE_URL", async () => {
    const adapter = createProjectApiAdapter({ env: {} });

    const result = await adapter.deleteProjectById("42");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("restoreProjectById calls PUT /projects/{projectId}/restore", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            project: {
              id: "42",
              project_name: "Project A",
              status: "active",
              archived_at: null,
              archived_by: null,
              archive_reason: null,
            },
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.restoreProjectById("42");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/restore"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "42",
    });
    expect(result).toEqual({
      data: {
        id: "42",
        project_name: "Project A",
        status: "active",
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      },
      error: null,
    });
  });

  it("restoreProjectById sends restore_reason only when provided", async () => {
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          project: { id: "00000042", status: "active" },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await adapter.restoreProjectById("00000042", {
      restoreReason: "mistake",
    });
    await adapter.restoreProjectById("00000042", {
      restore_reason: "admin request",
    });
    await adapter.restoreProjectById("00000042", {
      restoreReason: "",
    });

    expect(apiClient.put.mock.calls[0]).toEqual([
      "/projects/00000042/restore",
      {
        body: {
          project_id: "00000042",
          restore_reason: "mistake",
        },
      },
    ]);
    expect(apiClient.put.mock.calls[1][1].body).toEqual({
      project_id: "00000042",
      restore_reason: "admin request",
    });
    expect(apiClient.put.mock.calls[2][1].body).toEqual({
      project_id: "00000042",
    });
  });

  it("restoreProjectById keeps project ids unchanged and excludes standard effort payloads", async () => {
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          row: {
            id: "00000042",
            project_id: "00000042",
            status: "active",
            archived_at: null,
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.restoreProjectById("00000042");

    expect(result.data.id).toBe("00000042");
    expect(result.data.project_id).toBe("00000042");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "projectSolutionSelections"
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "projectItemSelections"
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "actual_effort_mm"
    );
  });

  it("restoreProjectById can include updater metadata", async () => {
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          row: {
            id: "00000042",
            status: "active",
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.restoreProjectById("00000042", {
      restoreReason: "manual smoke",
      currentUser: {
        user_id: "admin-user",
        login_id: "admin01",
        display_name: "관리자",
      },
    });

    expect(apiClient.put).toHaveBeenCalledWith("/projects/00000042/restore", {
      body: {
        project_id: "00000042",
        updated_by: "admin-user",
        updated_by_login_id: "admin01",
        updated_by_display_name: "관리자",
        restore_reason: "manual smoke",
      },
    });
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("password");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "password_hash"
    );
    expect(result.data.status).toBe("active");
  });

  it.each([
    ["data.project", { project: { id: "42", status: "active" } }],
    ["data.row", { row: { id: "42", status: "active" } }],
    ["direct object", { id: "42", status: "active" }],
    ["data.rows[0]", { rows: [{ id: "42", status: "active" }] }],
    ["data.data", { data: { id: "42", status: "active" } }],
  ])("restoreProjectById normalizes %s responses", async (_label, data) => {
    const apiClient = {
      put: vi.fn(() => Promise.resolve(data)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.restoreProjectById("42")).resolves.toEqual({
      data: { id: "42", status: "active" },
      error: null,
    });
  });

  it("restoreProjectById returns null data when the restore API returns no row", async () => {
    const apiClient = {
      put: vi.fn(() => Promise.resolve(null)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.restoreProjectById("42")).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  it("restoreProjectById returns an error when projectId is missing", async () => {
    const apiClient = {
      put: vi.fn(),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.restoreProjectById("");

    expect(apiClient.put).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "project API adapter restoreProjectById requires projectId."
    );
  });

  it("restoreProjectById returns API errors in the Supabase-style surface", async () => {
    const error = new Error("API failed");
    const apiClient = {
      put: vi.fn(() => Promise.reject(error)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.restoreProjectById("42")).resolves.toEqual({
      data: null,
      error,
    });
  });

  it("restoreProjectById returns a base URL error without VITE_API_BASE_URL", async () => {
    const adapter = createProjectApiAdapter({ env: {} });

    const result = await adapter.restoreProjectById("42");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("fetchProjectVersions calls GET /projects/{projectId}/versions", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            versions: [
              {
                id: "version-1",
                project_id: "00000042",
                version_no: 3,
                payload: { activeTab: "pbx" },
              },
            ],
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.fetchProjectVersions("00000042");

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/00000042/versions"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("GET");
    expect(result).toEqual({
      data: [
        {
          id: "version-1",
          project_id: "00000042",
          version_no: 3,
          payload: { activeTab: "pbx" },
        },
      ],
      error: null,
    });
  });

  it.each([
    ["data.versions", { versions: [{ id: 1, version_no: 2 }] }],
    ["data.rows", { rows: [{ id: 2, version_no: 3 }] }],
    ["data.data", { data: [{ id: 3, version_no: 4 }] }],
    ["direct array", [{ id: 4, version_no: 5 }]],
  ])("fetchProjectVersions normalizes %s responses", async (_label, data) => {
    const { adapter } = createAdapterWithData(data);

    await expect(adapter.fetchProjectVersions("42")).resolves.toEqual({
      data: [Object.values(data)[0]?.[0] || data[0]],
      error: null,
    });
  });

  it("fetchProjectVersions preserves ids and legacy payload without standard effort payloads", async () => {
    const payload = { activeTab: "pbx", itemsBySolution: { pbx: [] } };
    const { adapter } = createAdapterWithData({
      versions: [
        {
          id: "version-0001",
          project_id: "00000042",
          version_no: "7",
          saved_type: "manual",
          project_name: "Project A",
          payload,
          created_at: "2026-06-02T00:00:00.000Z",
        },
      ],
    });

    const result = await adapter.fetchProjectVersions("00000042");

    expect(result.data[0].project_id).toBe("00000042");
    expect(result.data[0].version_no).toBe("7");
    expect(result.data[0].payload).toBe(payload);
    expect(result.data[0].payload).not.toHaveProperty(
      "projectSolutionSelections"
    );
    expect(result.data[0].payload).not.toHaveProperty("projectItemSelections");
    expect(result.data[0].payload).not.toHaveProperty("actual_effort_mm");
  });

  it("fetchProjectVersions returns an error when projectId is missing", async () => {
    const apiClient = {
      get: vi.fn(),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.fetchProjectVersions("");

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "project API adapter fetchProjectVersions requires projectId."
    );
  });

  it("fetchProjectVersions returns API errors in the Supabase-style surface", async () => {
    const error = new Error("API failed");
    const apiClient = {
      get: vi.fn(() => Promise.reject(error)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(adapter.fetchProjectVersions("42")).resolves.toEqual({
      data: null,
      error,
    });
  });

  it("fetchProjectVersions returns a base URL error without VITE_API_BASE_URL", async () => {
    const adapter = createProjectApiAdapter({ env: {} });

    const result = await adapter.fetchProjectVersions("42");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("fetchLatestProjectVersionNo calls GET /projects/{projectId}/versions/latest", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            version_no: 4,
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.fetchLatestProjectVersionNo("00000042");

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/00000042/versions/latest"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("GET");
    expect(result).toEqual({
      data: {
        version_no: 4,
      },
      error: null,
    });
  });

  it.each([
    ["data.version_no", { version_no: 1 }, { version_no: 1 }],
    ["data.latest_version_no", { latest_version_no: 2 }, { latest_version_no: 2, version_no: 2 }],
    ["data.versionNo", { versionNo: 3 }, { versionNo: 3, version_no: 3 }],
    ["data.row.version_no", { row: { version_no: 4 } }, { version_no: 4 }],
    ["direct number", 5, { version_no: 5 }],
    ["direct string", "6", { version_no: "6" }],
  ])(
    "fetchLatestProjectVersionNo normalizes %s responses",
    async (_label, data, expected) => {
      const { adapter } = createAdapterWithData(data);

      await expect(adapter.fetchLatestProjectVersionNo("42")).resolves.toEqual({
        data: expected,
        error: null,
      });
    }
  );

  it("fetchLatestProjectVersionNo returns null data when no version exists", async () => {
    const { adapter } = createAdapterWithData(null);

    await expect(adapter.fetchLatestProjectVersionNo("42")).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  it("fetchLatestProjectVersionNo returns an error when projectId is missing", async () => {
    const apiClient = {
      get: vi.fn(),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.fetchLatestProjectVersionNo("");

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "project API adapter fetchLatestProjectVersionNo requires projectId."
    );
  });

  it("fetchLatestProjectVersionNo returns API and base URL errors in the existing surface", async () => {
    const error = new Error("API failed");
    const adapterWithApiError = createProjectApiAdapter({
      apiClient: {
        get: vi.fn(() => Promise.reject(error)),
      },
    });
    const adapterWithoutBaseUrl = createProjectApiAdapter({ env: {} });

    await expect(
      adapterWithApiError.fetchLatestProjectVersionNo("42")
    ).resolves.toEqual({
      data: null,
      error,
    });

    const result = await adapterWithoutBaseUrl.fetchLatestProjectVersionNo("42");
    expect(result.data).toBeNull();
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("saveProjectVersion calls POST /projects/{projectId}/versions", async () => {
    const payload = { activeTab: "pbx", itemsBySolution: { pbx: [] } };
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            version: {
              id: "version-1",
              project_id: "00000042",
              version_no: 8,
              saved_type: "manual",
              project_name: "Project A",
              payload,
            },
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.saveProjectVersion({
      projectId: "00000042",
      versionNo: 8,
      savedType: "manual",
      projectName: "Project A",
      payload,
    });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/00000042/versions"
    );
    expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      project_id: "00000042",
      version_no: 8,
      saved_type: "manual",
      project_name: "Project A",
      payload,
    });
    expect(result).toEqual({
      data: {
        id: "version-1",
        project_id: "00000042",
        version_no: 8,
        saved_type: "manual",
        project_name: "Project A",
        payload,
      },
      error: null,
    });
  });

  it("saveProjectVersion defaults saved_type to manual and keeps payload separate", async () => {
    const payload = {
      activeTab: "network",
      itemsBySolution: { network: [] },
    };
    const apiClient = {
      post: vi.fn(() =>
        Promise.resolve({
          row: {
            id: "version-2",
            project_id: "42",
            version_no: 9,
            payload,
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.saveProjectVersion({
      projectId: "42",
      versionNo: 9,
      projectName: "Project B",
      payload,
    });

    expect(apiClient.post).toHaveBeenCalledWith("/projects/42/versions", {
      body: {
        project_id: "42",
        version_no: 9,
        saved_type: "manual",
        project_name: "Project B",
        payload,
      },
    });
    expect(apiClient.post.mock.calls[0][1].body).not.toHaveProperty(
      "projectSolutionSelections"
    );
    expect(apiClient.post.mock.calls[0][1].body).not.toHaveProperty(
      "projectItemSelections"
    );
    expect(apiClient.post.mock.calls[0][1].body).not.toHaveProperty(
      "actual_effort_mm"
    );
    expect(result.data.payload).toBe(payload);
  });

  it.each([
    ["data.version", { version: { id: "v1", version_no: 1 } }],
    ["data.row", { row: { id: "v2", version_no: 2 } }],
    ["data.rows[0]", { rows: [{ id: "v3", version_no: 3 }] }],
    ["data.data", { data: { id: "v4", version_no: 4 } }],
    ["direct object", { id: "v5", version_no: 5 }],
  ])("saveProjectVersion normalizes %s responses", async (_label, data) => {
    const apiClient = {
      post: vi.fn(() => Promise.resolve(data)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(
      adapter.saveProjectVersion({
        projectId: "42",
        versionNo: 1,
        projectName: "Project A",
        payload: {},
      })
    ).resolves.toEqual({
      data:
        data.version ||
        data.row ||
        data.rows?.[0] ||
        data.data ||
        data,
      error: null,
    });
  });

  it("saveProjectVersion returns null data when the API returns no row", async () => {
    const apiClient = {
      post: vi.fn(() => Promise.resolve(null)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await expect(
      adapter.saveProjectVersion({
        projectId: "42",
        versionNo: 1,
        projectName: "Project A",
        payload: {},
      })
    ).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  it("saveProjectVersion returns errors in the existing surface", async () => {
    const apiError = new Error("API failed");
    const adapterWithApiError = createProjectApiAdapter({
      apiClient: {
        post: vi.fn(() => Promise.reject(apiError)),
      },
    });
    const adapterWithoutBaseUrl = createProjectApiAdapter({ env: {} });
    const adapterWithoutProjectId = createProjectApiAdapter({
      apiClient: { post: vi.fn() },
    });

    await expect(
      adapterWithApiError.saveProjectVersion({
        projectId: "42",
        versionNo: 1,
        projectName: "Project A",
        payload: {},
      })
    ).resolves.toEqual({
      data: null,
      error: apiError,
    });

    const missingBaseUrlResult = await adapterWithoutBaseUrl.saveProjectVersion({
      projectId: "42",
      versionNo: 1,
      projectName: "Project A",
      payload: {},
    });
    expect(missingBaseUrlResult.data).toBeNull();
    expect(missingBaseUrlResult.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );

    const missingProjectIdResult =
      await adapterWithoutProjectId.saveProjectVersion({
        projectId: "",
        versionNo: 1,
        projectName: "Project A",
        payload: {},
      });
    expect(missingProjectIdResult.data).toBeNull();
    expect(missingProjectIdResult.error.message).toBe(
      "project API adapter saveProjectVersion requires projectId."
    );
  });

  it("fetchCommonCodes calls GET /codebooks", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: {
            codebooks: [
              {
                id: "1",
                group_code: "solution",
                code: "PBX",
                code_name: "PBX",
                is_active: true,
                sort_order: 1,
              },
            ],
          },
        })
      )
    );
    const adapter = createProjectApiAdapter({
      env: { VITE_API_BASE_URL: "https://api.example.com/" },
      fetchImpl,
    });

    const result = await adapter.fetchCommonCodes();

    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.example.com/codebooks");
    expect(fetchImpl.mock.calls[0][1].method).toBe("GET");
    expect(result).toEqual({
      data: [
        {
          id: "1",
          group_code: "solution",
          code: "PBX",
          code_name: "PBX",
          is_active: true,
          sort_order: 1,
        },
      ],
      error: null,
    });
  });

  it.each([
    ["data.codebooks", { codebooks: [{ id: 1, group_code: "g" }] }],
    ["data.commonCodes", { commonCodes: [{ id: 2, group_code: "g" }] }],
    ["data.common_codes", { common_codes: [{ id: 3, group_code: "g" }] }],
    ["data.rows", { rows: [{ id: 4, group_code: "g" }] }],
    ["data.data", { data: [{ id: 5, group_code: "g" }] }],
    ["direct array", [{ id: 6, group_code: "g" }]],
  ])("fetchCommonCodes normalizes %s responses", async (_label, data) => {
    const { adapter } = createAdapterWithData(data);

    await expect(adapter.fetchCommonCodes()).resolves.toEqual({
      data: [Object.values(data)[0]?.[0] || data[0]],
      error: null,
    });
  });

  it("fetchCommonCodes maps active fallback to is_active and keeps sort_order", async () => {
    const { adapter } = createAdapterWithData({
      codebooks: [
        {
          id: "code-1",
          group_code: "solution",
          code: "PBX",
          active: false,
          sort_order: "",
        },
      ],
    });

    const result = await adapter.fetchCommonCodes();

    expect(result.data[0]).toEqual({
      id: "code-1",
      group_code: "solution",
      code: "PBX",
      active: false,
      is_active: false,
      sort_order: 0,
    });
  });

  it("fetchCommonCodes returns API and base URL errors in the existing surface", async () => {
    const error = new Error("API failed");
    const adapterWithApiError = createProjectApiAdapter({
      apiClient: {
        get: vi.fn(() => Promise.reject(error)),
      },
    });
    const adapterWithoutBaseUrl = createProjectApiAdapter({ env: {} });

    await expect(adapterWithApiError.fetchCommonCodes()).resolves.toEqual({
      data: null,
      error,
    });

    const result = await adapterWithoutBaseUrl.fetchCommonCodes();
    expect(result.data).toBeNull();
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("fetchCommonCodeRows calls GET /codebooks/rows and normalizes row shapes", async () => {
    const responseCases = [
      { rows: [{ id: 1, code: "A" }] },
      { commonCodeRows: [{ id: 2, code: "B" }] },
      { common_code_rows: [{ id: 3, code: "C" }] },
      { codes: [{ id: 4, code: "D" }] },
      { data: [{ id: 5, code: "E" }] },
      [{ id: 6, code: "F" }],
    ];

    for (const data of responseCases) {
      const apiClient = {
        get: vi.fn(() => Promise.resolve(data)),
      };
      const adapter = createProjectApiAdapter({ apiClient });
      const result = await adapter.fetchCommonCodeRows();

      expect(apiClient.get).toHaveBeenCalledWith("/codebooks/rows");
      expect(result).toEqual({
        data: [Object.values(data)[0]?.[0] || data[0]],
        error: null,
      });
    }
  });

  it("createCommonCodeRow calls POST /codebooks with normalized common code body", async () => {
    const apiClient = {
      post: vi.fn(() =>
        Promise.resolve({
          commonCode: {
            id: "code-1",
            group_code: "solution",
            code: "PBX",
            code_name: "PBX",
            is_active: true,
            sort_order: 0,
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.createCommonCodeRow({
      id: "client-side-id",
      group_code: "solution",
      code: "PBX",
      code_name: "PBX",
      active: true,
      sort_order: "",
      effort_mm: 99,
      actual_effort_mm: 100,
    });

    expect(apiClient.post).toHaveBeenCalledWith("/codebooks", {
      body: {
        group_code: "solution",
        code: "PBX",
        code_name: "PBX",
        sort_order: 0,
        is_active: true,
      },
    });
    expect(apiClient.post.mock.calls[0][1].body).not.toHaveProperty("id");
    expect(apiClient.post.mock.calls[0][1].body).not.toHaveProperty("effort_mm");
    expect(apiClient.post.mock.calls[0][1].body).not.toHaveProperty(
      "actual_effort_mm"
    );
    expect(result).toEqual({
      data: {
        id: "code-1",
        group_code: "solution",
        code: "PBX",
        code_name: "PBX",
        is_active: true,
        sort_order: 0,
      },
      error: null,
    });
  });

  it("createCommonCodeRow defaults sort_order and is_active when omitted", async () => {
    const apiClient = {
      post: vi.fn(() => Promise.resolve(null)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    await adapter.createCommonCodeRow({
      group_code: "solution",
      code: "PBX",
    });

    expect(apiClient.post.mock.calls[0][1].body).toEqual({
      group_code: "solution",
      code: "PBX",
      sort_order: 0,
      is_active: true,
    });
  });

  it.each([
    ["data.row", { row: { id: "row", code: "A" } }],
    ["data.commonCode", { commonCode: { id: "commonCode", code: "B" } }],
    ["data.common_code", { common_code: { id: "common_code", code: "C" } }],
    ["data.data", { data: { id: "data", code: "D" } }],
    ["direct object", { id: "direct", code: "E" }],
    ["data.rows[0]", { rows: [{ id: "rows", code: "F" }] }],
    ["null", null],
  ])("createCommonCodeRow normalizes %s responses", async (_label, data) => {
    const apiClient = {
      post: vi.fn(() => Promise.resolve(data)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const expected =
      data?.row ||
      data?.commonCode ||
      data?.common_code ||
      data?.data ||
      data?.rows?.[0] ||
      data ||
      null;

    await expect(
      adapter.createCommonCodeRow({ group_code: "g", code: "c" })
    ).resolves.toEqual({
      data: expected,
      error: null,
    });
  });

  it("createCommonCodeRow returns validation, API, and base URL errors", async () => {
    const error = new Error("API failed");
    const adapterWithApiError = createProjectApiAdapter({
      apiClient: {
        post: vi.fn(() => Promise.reject(error)),
      },
    });
    const adapterWithoutBaseUrl = createProjectApiAdapter({ env: {} });
    const adapterWithInvalidRow = createProjectApiAdapter({
      apiClient: { post: vi.fn() },
    });

    await expect(adapterWithApiError.createCommonCodeRow({})).resolves.toEqual({
      data: null,
      error,
    });

    const missingBaseUrlResult = await adapterWithoutBaseUrl.createCommonCodeRow(
      {}
    );
    expect(missingBaseUrlResult.data).toBeNull();
    expect(missingBaseUrlResult.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );

    const invalidRowResult = await adapterWithInvalidRow.createCommonCodeRow(
      null
    );
    expect(invalidRowResult.data).toBeNull();
    expect(invalidRowResult.error.message).toBe(
      "project API adapter createCommonCodeRow requires a row."
    );
  });

  it("updateCommonCodeRow calls PUT /codebooks/{id} with normalized patch", async () => {
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          row: {
            id: "code 1",
            code_name: "Updated",
            is_active: false,
            sort_order: 0,
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.updateCommonCodeRow("code 1", {
      code_name: "Updated",
      active: false,
      sort_order: null,
      standard_effort_mm: 1,
      gap_mm: 2,
    });

    expect(apiClient.put).toHaveBeenCalledWith("/codebooks/code%201", {
      body: {
        id: "code 1",
        code_name: "Updated",
        sort_order: 0,
        is_active: false,
      },
    });
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "standard_effort_mm"
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("gap_mm");
    expect(result).toEqual({
      data: {
        id: "code 1",
        code_name: "Updated",
        is_active: false,
        sort_order: 0,
      },
      error: null,
    });
  });

  it("updateCommonCodeRow returns null data and id errors in the existing surface", async () => {
    const adapterWithNullResponse = createProjectApiAdapter({
      apiClient: {
        put: vi.fn(() => Promise.resolve(null)),
      },
    });
    const adapterWithoutId = createProjectApiAdapter({
      apiClient: {
        put: vi.fn(),
      },
    });

    await expect(
      adapterWithNullResponse.updateCommonCodeRow("42", { code_name: "A" })
    ).resolves.toEqual({
      data: null,
      error: null,
    });

    const result = await adapterWithoutId.updateCommonCodeRow("", {});
    expect(result.data).toBeNull();
    expect(result.error.message).toBe(
      "project API adapter updateCommonCodeRow requires id."
    );
  });

  it("updateCommonCodeActive calls PUT /codebooks/{id}/active", async () => {
    const apiClient = {
      put: vi.fn(() =>
        Promise.resolve({
          common_code: {
            id: "42",
            is_active: false,
          },
        })
      ),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.updateCommonCodeActive("42", false);

    expect(apiClient.put).toHaveBeenCalledWith("/codebooks/42/active", {
      body: {
        id: "42",
        is_active: false,
      },
    });
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("effort_mm");
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "actual_effort_mm"
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty(
      "standard_effort_mm"
    );
    expect(apiClient.put.mock.calls[0][1].body).not.toHaveProperty("gap_mm");
    expect(result).toEqual({
      data: {
        id: "42",
        is_active: false,
      },
      error: null,
    });
  });

  it("updateCommonCodeActive rejects non-boolean active values", async () => {
    const apiClient = {
      put: vi.fn(),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter.updateCommonCodeActive("42", "false");

    expect(apiClient.put).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error.message).toBe(
      "project API adapter updateCommonCodeActive requires a boolean active value."
    );
  });

  it.each([
    [
      "fetchEstimationItemMeta",
      "/legacy-estimator/item-meta",
      { itemMeta: [{ id: "item-1", solution_code: "PBX" }] },
      [{ id: "item-1", solution_code: "PBX" }],
    ],
    [
      "fetchEstimationItemMetaRows",
      "/legacy-estimator/item-meta/rows",
      { item_meta_rows: [{ id: "item-row-1", item_code: "call" }] },
      [{ id: "item-row-1", item_code: "call" }],
    ],
    [
      "fetchEstimationBaseEffortMeta",
      "/legacy-estimator/base-effort-meta",
      { baseEffortMeta: [{ id: "base-1", base_md: 3 }] },
      [{ id: "base-1", base_md: 3 }],
    ],
    [
      "fetchEstimationItemFieldMeta",
      "/legacy-estimator/item-field-meta",
      { item_field_meta: [{ id: "field-1", field_key: "qty" }] },
      [{ id: "field-1", field_key: "qty" }],
    ],
    [
      "fetchEstimationEnvVarMeta",
      "/legacy-estimator/env-var-meta",
      { envVarMeta: [{ id: "env-1", var_key: "scale" }] },
      [{ id: "env-1", var_key: "scale" }],
    ],
    [
      "fetchEstimationCalculationMeta",
      "/legacy-estimator/calculation-meta",
      { calculation_meta: [{ id: "calc-1", method: "sum" }] },
      [{ id: "calc-1", method: "sum" }],
    ],
    [
      "fetchEstimationPolicy",
      "/legacy-estimator/policy",
      { policies: [{ id: "policy-1", is_active: true }] },
      [{ id: "policy-1", is_active: true }],
    ],
  ])("%s calls GET %s and preserves row shapes", async (methodName, path, data, expected) => {
    const apiClient = {
      get: vi.fn(() => Promise.resolve(data)),
    };
    const adapter = createProjectApiAdapter({ apiClient });

    const result = await adapter[methodName]();

    expect(apiClient.get).toHaveBeenCalledWith(path);
    expect(result).toEqual({
      data: expected,
      error: null,
    });
  });

  it.each([
    ["itemMeta", { itemMeta: [{ id: 1, display_order: "01" }] }],
    ["item_meta", { item_meta: [{ id: 2, sort_order: "02" }] }],
    ["rows", { rows: [{ id: 3, active: false }] }],
    ["items", { items: [{ id: 4, is_active: false }] }],
    ["data", { data: [{ id: 5, default_base_md: "7.5" }] }],
    ["direct array", [{ id: 6, base_md: 8 }]],
  ])("fetchEstimationItemMeta normalizes %s responses", async (_label, data) => {
    const { adapter } = createAdapterWithData(data);
    const expected = Object.values(data)[0]?.[0] || data[0];

    await expect(adapter.fetchEstimationItemMeta()).resolves.toEqual({
      data: [expected],
      error: null,
    });
  });

  it.each([
    ["itemMetaRows", "fetchEstimationItemMetaRows", { itemMetaRows: [{ id: 1 }] }],
    [
      "base_effort_meta",
      "fetchEstimationBaseEffortMeta",
      { base_effort_meta: [{ id: 2, effort_md: 3 }] },
    ],
    [
      "fieldMeta",
      "fetchEstimationItemFieldMeta",
      { fieldMeta: [{ id: 3, field_key: "qty" }] },
    ],
    [
      "field_meta",
      "fetchEstimationItemFieldMeta",
      { field_meta: [{ id: 4, field_key: "count" }] },
    ],
    [
      "env_var_meta",
      "fetchEstimationEnvVarMeta",
      { env_var_meta: [{ id: 5, var_key: "risk" }] },
    ],
    [
      "calculationMeta",
      "fetchEstimationCalculationMeta",
      { calculationMeta: [{ id: 6, method: "multiply" }] },
    ],
  ])("%s fallback normalizes legacy meta rows", async (_label, methodName, data) => {
    const { adapter } = createAdapterWithData(data);
    const expected = Object.values(data)[0][0];

    await expect(adapter[methodName]()).resolves.toEqual({
      data: [expected],
      error: null,
    });
  });

  it.each([
    ["policy array", { policy: [{ id: "p1", is_active: true }] }, [{ id: "p1", is_active: true }]],
    ["policy object", { policy: { id: "p2", is_active: true } }, [{ id: "p2", is_active: true }]],
    ["row object", { row: { id: "p3", is_active: true } }, [{ id: "p3", is_active: true }]],
    ["rows array", { rows: [{ id: "p4", is_active: true }] }, [{ id: "p4", is_active: true }]],
    ["data object", { data: { id: "p5", is_active: true } }, [{ id: "p5", is_active: true }]],
    ["direct object", { id: "p6", is_active: true }, [{ id: "p6", is_active: true }]],
    ["direct array", [{ id: "p7", is_active: true }], [{ id: "p7", is_active: true }]],
  ])("fetchEstimationPolicy preserves array surface for %s", async (_label, data, expected) => {
    const { adapter } = createAdapterWithData(data);

    await expect(adapter.fetchEstimationPolicy()).resolves.toEqual({
      data: expected,
      error: null,
    });
  });

  it("returns legacy meta API errors in the existing surface", async () => {
    const error = new Error("API failed");
    const adapter = createProjectApiAdapter({
      apiClient: {
        get: vi.fn(() => Promise.reject(error)),
      },
    });

    await expect(adapter.fetchEstimationBaseEffortMeta()).resolves.toEqual({
      data: null,
      error,
    });
  });

  it.each([
    "fetchEstimationItemMeta",
    "fetchEstimationItemMetaRows",
    "fetchEstimationBaseEffortMeta",
    "fetchEstimationItemFieldMeta",
    "fetchEstimationEnvVarMeta",
    "fetchEstimationCalculationMeta",
    "fetchEstimationPolicy",
  ])("%s returns a base URL error without VITE_API_BASE_URL", async (methodName) => {
    const adapter = createProjectApiAdapter({ env: {} });

    const result = await adapter[methodName]();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "VITE_API_BASE_URL is required when using project API adapter."
    );
  });

  it("preserves legacy md-like fields without adding standard effort fields", async () => {
    const { adapter } = createAdapterWithData({
      rows: [
        {
          id: "legacy-1",
          solution_code: "PBX",
          item_code: "call",
          default_base_md: "1.5",
          base_md: 2,
          effort_md: 3,
          display_order: "04",
          sort_order: "05",
          is_active: false,
        },
      ],
    });

    const result = await adapter.fetchEstimationBaseEffortMeta();

    expect(result.data[0]).toEqual({
      id: "legacy-1",
      solution_code: "PBX",
      item_code: "call",
      default_base_md: "1.5",
      base_md: 2,
      effort_md: 3,
      display_order: "04",
      sort_order: "05",
      is_active: false,
    });
    expect(result.data[0]).not.toHaveProperty("effort_mm");
    expect(result.data[0]).not.toHaveProperty("actual_effort_mm");
    expect(result.data[0]).not.toHaveProperty("standard_effort_mm");
    expect(result.data[0]).not.toHaveProperty("gap_mm");
  });
});
