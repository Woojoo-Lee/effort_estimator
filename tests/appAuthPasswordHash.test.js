import { describe, expect, it } from "vitest";

import {
  createPasswordHash,
  verifyPasswordHash,
} from "../api/auth/_utils.js";
import { createAppUserPasswordHash } from "../scripts/generateAppUserPasswordHash.mjs";

describe("app auth password hash", () => {
  it("creates script hashes that are verifiable by the auth utility", () => {
    const hash = createAppUserPasswordHash("secret-password", {
      iterations: 1,
      salt: "test-salt",
    });

    expect(hash).toMatch(/^pbkdf2\$sha256\$1\$test-salt\$/);
    expect(hash).not.toContain("secret-password");
    expect(verifyPasswordHash("secret-password", hash)).toBe(true);
    expect(verifyPasswordHash("wrong-password", hash)).toBe(false);
  });

  it("keeps utility-created hashes compatible with verification", () => {
    const hash = createPasswordHash("another-secret", {
      iterations: 1,
      salt: "another-salt",
    });

    expect(hash).toMatch(/^pbkdf2\$sha256\$1\$another-salt\$/);
    expect(hash).not.toContain("another-secret");
    expect(verifyPasswordHash("another-secret", hash)).toBe(true);
  });

  it("rejects invalid hash formats", () => {
    expect(verifyPasswordHash("secret", "")).toBe(false);
    expect(verifyPasswordHash("secret", "plain-text")).toBe(false);
    expect(verifyPasswordHash("secret", "pbkdf2$sha512$1$salt$hash")).toBe(
      false
    );
    expect(verifyPasswordHash("secret", "pbkdf2$sha256$0$salt$hash")).toBe(
      false
    );
  });
});
