import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { portOpen } from "../scripts/start.mjs";

test("startup detects occupied ports and closed ports without starting or stopping services", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    assert.equal(await portOpen("127.0.0.1", port), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(await portOpen("127.0.0.1", port), false);
});
