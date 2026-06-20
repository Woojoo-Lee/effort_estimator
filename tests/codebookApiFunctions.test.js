import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  client: null,
  createClient: vi.fn(() => supabaseMocks.client),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

import codebooksHandler from "../api/codebooks.js";
import {
  APP_SESSION_COOKIE,
  signSession,
} from "../api/auth/_utils.js";

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader: vi.fn(function setHeader(name, value) {
      this.headers[name] = value;
    }),
    end: vi.fn(function end(value) {
      this.body = value;
    }),
  };
}

function readResponseBody(res) {
  return JSON.parse(res.body);
}

function createUser(overrides = {}) {
  return {
    user_id: "user-1",
    login_id: "admin01",
    display_name: "Admin User",
    role_code: "admin",
    active: true,
    ...overrides,
  };
}

function createSessionCookie(user = createUser()) {
  const token = signSession({
    user_id: user.user_id,
    login_id: user.login_id,
    display_name: user.display_name,
    role_code: user.role_code,
    role_codes: [user.role_code],
  });

  return `${APP_SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

function createCurrentUserQuery(currentUser) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({
      data: currentUser,
      error: null,
    }),
  };

  return query;
}

function createThenableQuery(result, methods = []) {
  const query = {
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };

  methods.forEach((method) => {
    query[method] = vi.fn(() => query);
  });

  return query;
}

function createCodebookListClient({ currentUser, rows }) {
  let fromCallCount = 0;
  const currentQuery = createCurrentUserQuery(currentUser);
  const listQuery = createThenableQuery(
    {
      data: rows,
      error: null,
    },
    ["select", "order"]
  );

  return {
    currentQuery,
    listQuery,
    from: vi.fn(() => {
      fromCallCount += 1;
      return fromCallCount === 1 ? currentQuery : listQuery;
    }),
  };
}

function createCodebookPostClient({
  currentUser,
  insertedRow,
  insertError,
  existingRow = null,
}) {
  let fromCallCount = 0;
  const currentQuery = createCurrentUserQuery(currentUser);
  const duplicateQuery = {
    select: vi.fn(() => duplicateQuery),
    eq: vi.fn(() => duplicateQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: existingRow,
      error: null,
    }),
  };
  const insertQuery = {
    insert: vi.fn(() => insertQuery),
    select: vi.fn(() => insertQuery),
    single: vi.fn().mockResolvedValue({
      data: insertedRow,
      error: insertError || null,
    }),
  };

  return {
    currentQuery,
    duplicateQuery,
    insertQuery,
    from: vi.fn(() => {
      fromCallCount += 1;
      if (fromCallCount === 1) {
        return currentQuery;
      }

      if (fromCallCount === 2) {
        return duplicateQuery;
      }

      return insertQuery;
    }),
  };
}

function createCodebookPatchClient({ currentUser, updatedRow }) {
  let fromCallCount = 0;
  const currentQuery = createCurrentUserQuery(currentUser);
  const updateQuery = {
    update: vi.fn(() => updateQuery),
    eq: vi.fn(() => updateQuery),
    select: vi.fn(() => updateQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: updatedRow,
      error: null,
    }),
  };

  return {
    currentQuery,
    updateQuery,
    from: vi.fn(() => {
      fromCallCount += 1;
      return fromCallCount === 1 ? currentQuery : updateQuery;
    }),
  };
}

function createCodebookRow(overrides = {}) {
  return {
    id: "code-1",
    group_code: "SOLUTION",
    code: "PBX",
    code_name: "PBX",
    code_value: "PBX",
    description: "PBX solution",
    sort_order: 1,
    is_active: true,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-02T00:00:00.000Z",
    password_hash: "should-not-leak",
    email: "should-not-leak@example.com",
    secret: "should-not-leak",
    ...overrides,
  };
}

describe("codebook admin Vercel function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_AUTH_SESSION_SECRET =
      "test-session-secret-with-more-than-32-chars";
    process.env.SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NODE_ENV = "test";
    process.env.VERCEL_ENV = "development";
    supabaseMocks.client = createCodebookListClient({
      currentUser: null,
      rows: [],
    });
  });

  it("rejects GET without a session cookie", async () => {
    const req = {
      method: "GET",
      headers: {},
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects GET for sales users", async () => {
    const salesUser = createUser({
      role_code: "sales",
    });
    supabaseMocks.client = createCodebookListClient({
      currentUser: salesUser,
      rows: [],
    });
    const req = {
      method: "GET",
      headers: {
        cookie: createSessionCookie(salesUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(readResponseBody(res).error.code).toBe("FORBIDDEN");
  });

  it("rejects GET for viewer users", async () => {
    const viewerUser = createUser({
      role_code: "viewer",
    });
    supabaseMocks.client = createCodebookListClient({
      currentUser: viewerUser,
      rows: [],
    });
    const req = {
      method: "GET",
      headers: {
        cookie: createSessionCookie(viewerUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(readResponseBody(res).error.code).toBe("FORBIDDEN");
  });

  it("returns safe common_code rows for admins", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookListClient({
      currentUser: adminUser,
      rows: [createCodebookRow()],
    });
    const req = {
      method: "GET",
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    const body = readResponseBody(res);

    expect(res.statusCode).toBe(200);
    expect(supabaseMocks.client.from).toHaveBeenCalledWith("common_code");
    expect(supabaseMocks.client.listQuery.order).toHaveBeenCalledWith(
      "group_code",
      { ascending: true }
    );
    expect(body.data.rows).toEqual([
      {
        id: "code-1",
        group_code: "SOLUTION",
        code: "PBX",
        code_name: "PBX",
        code_value: "PBX",
        description: "PBX solution",
        sort_order: 1,
        is_active: true,
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("password_hash");
    expect(JSON.stringify(body)).not.toContain("email");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(JSON.stringify(body)).not.toContain("service-role-key");
  });

  it("inserts a codebook row for admins", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPostClient({
      currentUser: adminUser,
      insertedRow: createCodebookRow({
        code: "NEW",
        code_name: "New code",
      }),
    });
    const req = {
      method: "POST",
      body: {
        group_code: "SOLUTION",
        code: "NEW",
        code_name: "New code",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(supabaseMocks.client.duplicateQuery.eq).toHaveBeenCalledWith(
      "group_code",
      "SOLUTION"
    );
    expect(supabaseMocks.client.duplicateQuery.eq).toHaveBeenCalledWith(
      "code",
      "NEW"
    );
    expect(supabaseMocks.client.insertQuery.insert).toHaveBeenCalledWith({
      group_code: "SOLUTION",
      code: "NEW",
      code_name: "New code",
      code_value: "NEW",
      description: null,
      sort_order: 0,
      is_active: true,
    });
    expect(JSON.stringify(readResponseBody(res))).not.toContain("password_hash");
  });

  it("accepts is_active false when inserting a code detail row", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPostClient({
      currentUser: adminUser,
      insertedRow: createCodebookRow({
        code: "DISABLED",
        code_name: "Disabled code",
        is_active: false,
      }),
    });
    const req = {
      method: "POST",
      body: {
        group_code: "SOLUTION",
        code: "DISABLED",
        code_name: "Disabled code",
        is_active: false,
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(supabaseMocks.client.insertQuery.insert).toHaveBeenCalledWith({
      group_code: "SOLUTION",
      code: "DISABLED",
      code_name: "Disabled code",
      code_value: "DISABLED",
      description: null,
      sort_order: 0,
      is_active: false,
    });
  });

  it("allows POST for code type metadata rows with code 00", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPostClient({
      currentUser: adminUser,
      insertedRow: createCodebookRow({
        code: "00",
        code_name: "솔루션",
        code_value: "00",
      }),
    });
    const req = {
      method: "POST",
      body: {
        group_code: "SOLUTION",
        code: "00",
        code_name: "솔루션",
        code_value: "IGNORED",
        is_active: false,
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(supabaseMocks.client.insertQuery.insert).toHaveBeenCalledWith({
      group_code: "SOLUTION",
      code: "00",
      code_name: "솔루션",
      code_value: "00",
      description: null,
      sort_order: 0,
      is_active: false,
    });
    expect(readResponseBody(res).data.row.code).toBe("00");
  });

  it("returns 409 when a duplicate codebook row already exists", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPostClient({
      currentUser: adminUser,
      insertedRow: null,
      existingRow: {
        id: "existing-code",
      },
    });
    const req = {
      method: "POST",
      body: {
        group_code: "SOLUTION",
        code: "00",
        code_name: "솔루션",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(409);
    expect(readResponseBody(res).error.code).toBe("CONFLICT");
    expect(supabaseMocks.client.insertQuery.insert).not.toHaveBeenCalled();
  });

  it("maps database duplicate errors to 409", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPostClient({
      currentUser: adminUser,
      insertedRow: null,
      insertError: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });
    const req = {
      method: "POST",
      body: {
        group_code: "SOLUTION",
        code: "00",
        code_name: "솔루션",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(409);
    expect(readResponseBody(res).error.code).toBe("CONFLICT");
  });

  it("rejects POST when required fields are missing", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPostClient({
      currentUser: adminUser,
      insertedRow: null,
    });
    const req = {
      method: "POST",
      body: {
        group_code: "SOLUTION",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
    expect(supabaseMocks.client.insertQuery.insert).not.toHaveBeenCalled();
  });

  it("updates a codebook row for admins", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPatchClient({
      currentUser: adminUser,
      updatedRow: createCodebookRow({
        code_name: "Updated",
        is_active: false,
      }),
    });
    const req = {
      method: "PATCH",
      body: {
        id: "code-1",
        group_code: "IGNORED",
        code: "IGNORED",
        code_name: "Updated",
        is_active: false,
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    const updatePayload =
      supabaseMocks.client.updateQuery.update.mock.calls[0][0];

    expect(res.statusCode).toBe(200);
    expect(updatePayload.code_name).toBe("Updated");
    expect(updatePayload.is_active).toBe(false);
    expect(updatePayload.updated_at).toBeTruthy();
    expect(updatePayload.group_code).toBeUndefined();
    expect(updatePayload.code).toBeUndefined();
    expect(supabaseMocks.client.updateQuery.eq).toHaveBeenCalledWith(
      "id",
      "code-1"
    );
    expect(JSON.stringify(readResponseBody(res))).not.toContain("password_hash");
  });

  it("rejects PATCH without id", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPatchClient({
      currentUser: adminUser,
      updatedRow: null,
    });
    const req = {
      method: "PATCH",
      body: {
        code_name: "Updated",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
    expect(supabaseMocks.client.updateQuery.update).not.toHaveBeenCalled();
  });

  it("returns 404 when PATCH target is not found", async () => {
    const adminUser = createUser();
    supabaseMocks.client = createCodebookPatchClient({
      currentUser: adminUser,
      updatedRow: null,
    });
    const req = {
      method: "PATCH",
      body: {
        id: "missing",
        code_name: "Updated",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(readResponseBody(res).error.code).toBe("NOT_FOUND");
  });

  it("rejects PATCH for non-admin users", async () => {
    const salesUser = createUser({
      role_code: "sales",
    });
    supabaseMocks.client = createCodebookPatchClient({
      currentUser: salesUser,
      updatedRow: null,
    });
    const req = {
      method: "PATCH",
      body: {
        id: "code-1",
        code_name: "Updated",
      },
      headers: {
        cookie: createSessionCookie(salesUser),
      },
    };
    const res = createResponse();

    await codebooksHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(readResponseBody(res).error.code).toBe("FORBIDDEN");
    expect(supabaseMocks.client.updateQuery.update).not.toHaveBeenCalled();
  });
});
