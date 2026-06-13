import { buildExpiredSessionCookie, error, ok } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    error(res, 405, "METHOD_NOT_ALLOWED", "POST only.");
    return;
  }

  res.setHeader("Set-Cookie", buildExpiredSessionCookie());
  ok(res, {});
}
