#!/usr/bin/env node
import crypto from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stderr as output } from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function createAppUserPasswordHash(password, options = {}) {
  const normalizedPassword = String(password ?? "");
  const iterations = options.iterations || DEFAULT_ITERATIONS;
  const salt = options.salt || crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(normalizedPassword, salt, iterations, KEY_LENGTH, DIGEST)
    .toString("base64url");

  return `pbkdf2$${DIGEST}$${iterations}$${salt}$${hash}`;
}

async function readPasswordFromInput() {
  if (process.env.APP_USER_PASSWORD) {
    return process.env.APP_USER_PASSWORD;
  }

  if (!process.stdin.isTTY) {
    const chunks = [];

    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    const password = Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");

    if (password) {
      return password;
    }
  }

  const rl = createInterface({ input, output });

  try {
    return await rl.question("Password: ");
  } finally {
    rl.close();
  }
}

async function main() {
  if (process.argv.length > 2) {
    console.error(
      "Do not pass passwords as CLI arguments. Use APP_USER_PASSWORD or stdin."
    );
    process.exitCode = 1;
    return;
  }

  const password = await readPasswordFromInput();

  if (!password) {
    console.error("Password is required.");
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${createAppUserPasswordHash(password)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
