import { test } from "node:test";
import assert from "node:assert/strict";
import { api, authenticate, signOut } from "../src/api.js";

test("authentication refreshes a stale CSRF token before sending credentials", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const calls = [];
  const results = [
    { csrf: "old-session-token" },
    { csrf: "current-session-token" },
    { csrf: "current-session-token" },
    { csrf: "signed-in-token", ok: true },
  ];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, json: async () => results.shift() };
  };
  await api("session");
  await authenticate("register", {
    email: "fixture@example.invalid",
    password: "fixture-password",
  });
  assert.deepEqual(
    calls.map((c) => [c.path, c.options.method]),
    [
      ["/api/session", "GET"],
      ["/api/session", "GET"],
      ["/api/session", "GET"],
      ["/api/register", "POST"],
    ],
  );
  assert.equal(
    calls[3].options.headers["X-CSRF-Token"],
    "current-session-token",
  );
  assert.equal(calls[3].options.credentials, "same-origin");
});

test("authentication detects nonpersistent cookies before submitting credentials", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let calls = 0;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ csrf: `new-session-${++calls}` }),
  });
  await assert.rejects(
    authenticate("register", {
      email: "fixture@example.invalid",
      password: "fixture-password",
    }),
    /not keeping this site's session cookie/,
  );
  assert.equal(calls, 2);
});

test("sign out sends the dedicated same-origin header without a session preflight", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, json: async () => ({ ok: true, user: null }) };
  };
  assert.equal((await signOut()).ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/logout");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["X-Unsaid-Logout"], "1");
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.cache, "no-store");
});

test("ordinary API requests do not receive the logout header", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (path, options) => {
    assert.equal(options.headers["X-Unsaid-Logout"], undefined);
    return { ok: true, json: async () => ({ ok: true }) };
  };
  await api("session");
});