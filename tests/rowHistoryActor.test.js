import { describe, expect, it } from "vitest";

import {
  buildCreateHistoryFields,
  buildRowHistoryActor,
  buildUpdateHistoryFields,
  mergeCreateHistoryFields,
  mergeUpdateHistoryFields,
} from "../src/features/auth";

describe("rowHistoryActor", () => {
  it("builds a row history actor from session user_id only", () => {
    expect(
      buildRowHistoryActor({
        user_id: "user-1",
        email: "ignored@example.com",
        login_id: "ignored-login",
        display_name: "Ignored User",
      })
    ).toEqual({
      user_id: "user-1",
    });
  });

  it("supports actorUserId from existing UI actor props", () => {
    expect(buildRowHistoryActor({ actorUserId: "actor-1" })).toEqual({
      user_id: "actor-1",
    });
  });

  it("omits history fields when user_id is not available", () => {
    expect(buildRowHistoryActor({ login_id: "admin01" })).toBeNull();
    expect(buildCreateHistoryFields(null)).toEqual({});
    expect(buildUpdateHistoryFields(undefined, "2026-06-14T01:02:03.000Z")).toEqual(
      {}
    );
  });

  it("creates insert fields without created_at and without email-like fields", () => {
    const fields = buildCreateHistoryFields({
      user_id: "user-1",
      email: "ignored@example.com",
      login_id: "admin01",
      display_name: "Admin",
    });

    expect(fields).toEqual({
      created_by: "user-1",
      updated_by: "user-1",
    });
    expect(fields).not.toHaveProperty("created_at");
    expect(fields).not.toHaveProperty("email");
    expect(fields).not.toHaveProperty("login_id");
    expect(fields).not.toHaveProperty("display_name");
  });

  it("creates update fields without created_by", () => {
    expect(
      buildUpdateHistoryFields(
        { user_id: "user-1" },
        "2026-06-14T01:02:03.000Z"
      )
    ).toEqual({
      updated_by: "user-1",
      updated_at: "2026-06-14T01:02:03.000Z",
    });
  });

  it("merges create and update fields without mutating the source payload", () => {
    const payload = { id: 1, value: "payload" };

    expect(mergeCreateHistoryFields(payload, { user_id: "creator-1" })).toEqual(
      {
        id: 1,
        value: "payload",
        created_by: "creator-1",
        updated_by: "creator-1",
      }
    );
    expect(
      mergeUpdateHistoryFields(
        payload,
        { user_id: "updater-1" },
        "2026-06-14T01:02:03.000Z"
      )
    ).toEqual({
      id: 1,
      value: "payload",
      updated_by: "updater-1",
      updated_at: "2026-06-14T01:02:03.000Z",
    });
    expect(payload).toEqual({ id: 1, value: "payload" });
  });
});
