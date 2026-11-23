import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

class Client {
  cookie = "";
  csrf = "";
  async call(path, method = "GET", body, csrf = true) {
    const response = await fetch(
      (process.env.UNSAID_TEST_URL || "http://127.0.0.1:8001/api/") + path,
      {
        method,
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          Cookie: this.cookie,
          ...(csrf ? { "X-CSRF-Token": this.csrf } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    const cookies = response.headers.getSetCookie();
    if (cookies.length)
      this.cookie = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    const data = await response.json();
    if (data.csrf) this.csrf = data.csrf;
    if (path === "register" && response.status === 202)
      return this.call("register/verify", "POST", {
        code: verificationCode(body.email),
      });
    return { status: response.status, data };
  }
}

test("persistent account-to-account DM: consent, isolation, read state, safety and reports", async (t) => {
  const stamp = Date.now();
  const emails = [
    `test-a-${stamp}@unsaid.invalid`,
    `test-b-${stamp}@unsaid.invalid`,
    `ui-${stamp}@unsaid.invalid`,
  ];
  t.after(() => {
    for (const email of emails)
      execFileSync("php", ["tests/cleanup.php", `--email=${email}`]);
  });
  const a = new Client(),
    b = new Client(),
    outsider = new Client(),
    guest = new Client(),
    a2 = new Client();
  for (const client of [a, b, outsider, guest, a2])
    assert.equal((await client.call("session")).status, 200);
  const password = "A-long-DM-test-password-42";
  for (const [i, client] of [a, b, outsider].entries())
    assert.equal(
      (await client.call("register", "POST", { email: emails[i], password }))
        .status,
      201,
    );
  assert.equal(
    (await a2.call("login", "POST", { email: emails[0], password })).status,
    200,
  );
  const ap = (await a.call("dm/profile")).data.profile;
  const bp = (await b.call("dm/profile")).data.profile;
  assert.equal(
    (
      await a.call("dm/conversations", "POST", {
        contact_code: bp.contact_code,
        body: "I will kill you",
        acknowledge_abuse: true,
      })
    ).status,
    422,
  );
  assert.equal(
    (await a.call("dm/conversations", "GET")).data.conversations.length,
    0,
    "Rejected threat leaves no conversation behind",
  );
  const insult = await a.call("dm/conversations", "POST", {
    contact_code: bp.contact_code,
    body: "You are an idiot",
  });
  assert.equal(insult.status, 422);
  assert.equal(insult.data.code, "review_wording");
  assert.match(ap.contact_code, /^[A-F0-9]{16}$/);
  assert.notEqual(ap.contact_code, bp.contact_code);
  assert.equal(
    (await a.call("dm/profile")).data.profile.contact_code,
    ap.contact_code,
  );
  assert.equal((await guest.call("dm/profile")).status, 401);
  assert.equal((await guest.call("dm/conversations")).status, 401);
  assert.equal(
    (
      await a.call(
        "dm/conversations",
        "POST",
        { contact_code: bp.contact_code, body: "Hello" },
        false,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await a.call("dm/conversations", "POST", {
        contact_code: ap.contact_code,
        body: "Hello myself",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a.call("dm/conversations", "POST", {
        contact_code: "0000000000000000",
        body: "Hello",
      })
    ).status,
    404,
  );
  const post = (
    await b.call("posts", "POST", {
      body: "A public thought for a DM request",
      category_id: 1,
      visibility: "public",
      status: "published",
      response: "Just listening",
    })
  ).data.post;
  const privatePost = (
    await b.call("posts", "POST", {
      body: "Private thought",
      category_id: 1,
      visibility: "private",
      status: "published",
      response: "Just listening",
    })
  ).data.post;
  assert.equal(
    (
      await a.call("dm/conversations", "POST", {
        post_id: privatePost.id,
        body: "Private post cannot be a contact target",
      })
    ).status,
    404,
  );
  const starts = await Promise.all([
    a.call("dm/conversations", "POST", {
      post_id: post.id,
      body: "Hello from another account",
    }),
    a2.call("dm/conversations", "POST", {
      contact_code: bp.contact_code,
      body: "Concurrent request",
    }),
  ]);
  assert.deepEqual(starts.map((r) => r.status).sort(), [201, 409]);
  const started = starts.find((r) => r.status === 201).data;
  const token = started.conversation.token;
  const path = `dm/conversations/${token}`;
  assert.equal(
    (await a.call(`posts/${post.id}/dm-conversation`)).data.conversation.token,
    token,
  );
  assert.equal(
    (await outsider.call(`posts/${post.id}/dm-conversation`)).data.conversation,
    null,
    "lookup is scoped to the caller's account pair",
  );
  assert.equal(
    (await guest.call(`posts/${post.id}/dm-conversation`)).status,
    401,
  );
  assert.equal(
    (await a.call(`posts/${privatePost.id}/dm-conversation`)).status,
    404,
  );
  assert.equal((await b.call(`posts/${post.id}/dm-conversation`)).status, 400);
  assert.match(token, /^[a-f0-9]{32}$/);
  assert.equal(started.conversation.status, "pending");
  for (const sensitive of [
    "email",
    "user_low",
    "user_high",
    "initiator_id",
    "sender_id",
    "contact_code",
  ])
    assert(!Object.hasOwn(started.conversation, sensitive));
  assert(!Object.hasOwn(started.message, "sender_id"));
  assert.equal((await outsider.call(path)).status, 404);
  assert.equal((await outsider.call(path + "/messages")).status, 404);
  assert.equal((await guest.call(path + "/messages")).status, 401);
  assert.equal((await outsider.call(path + "/accept", "POST", {})).status, 404);
  assert.equal((await a.call(path + "/accept", "POST", {})).status, 403);
  assert.equal(
    (
      await a.call(path + "/messages", "POST", {
        body: "Cannot send before acceptance",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await b.call(path + "/messages", "POST", {
        body: "Cannot reply before acceptance",
      })
    ).status,
    403,
  );
  assert.equal((await b.call(path + "/messages")).data.messages.length, 1);
  const inbox = (await b.call("dm/conversations")).data.conversations;
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].incoming, true);
  assert.equal(inbox[0].unread, 1);
  assert.equal((await b.call(path + "/accept", "POST", {}, false)).status, 403);
  assert.equal(
    (await b.call(path + "/accept", "POST", {})).data.conversation.status,
    "accepted",
  );
  assert.equal((await b.call(path + "/accept", "POST", {})).status, 403);
  const answer = await b.call(path + "/messages", "POST", {
    body: "Hello, I accepted your request.",
  });
  assert.equal(answer.status, 201);
  const risk = await a.call(path + "/messages", "POST", {
    body: "Send me money through my bank account",
  });
  assert.equal(risk.status, 201);
  assert.deepEqual(risk.data.message.safety_signals, ["money_request"]);
  assert.equal(
    (await a2.call(path + "/messages")).data.messages.length,
    3,
    "history persists across sessions",
  );
  const newer = (
    await b.call(path + `/messages?after=${answer.data.message.id}`)
  ).data.messages;
  assert.equal(newer.length, 1);
  assert.equal(newer[0].id, risk.data.message.id);
  const earlier = (
    await b.call(path + `/messages?before=${answer.data.message.id}`)
  ).data.messages;
  assert.equal(earlier.length, 1);
  assert.equal(earlier[0].id, started.message.id);
  assert.equal(
    (await b.call(path + "/read", "POST", { last_id: risk.data.message.id }))
      .status,
    200,
  );
  assert.equal((await b.call(path)).data.conversation.unread, 0);
  assert.equal(
    (
      await outsider.call(path + "/read", "POST", {
        last_id: risk.data.message.id,
      })
    ).status,
    404,
  );
  assert.equal(
    (await b.call(path + "/read", "POST", { last_id: 999999999 })).status,
    404,
  );
  assert.equal(
    (await b.call("dm/profile", "PUT", { requests_enabled: false })).status,
    200,
  );
  assert.equal(
    (
      await b.call(path + "/messages", "POST", {
        body: "Existing chats still work with requests disabled",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await outsider.call("dm/conversations", "POST", {
        contact_code: bp.contact_code,
        body: "A new request is disabled",
      })
    ).status,
    403,
  );
  assert.equal(
    (await a.call(path + "/block", "POST", {})).data.conversation.blocked_by_me,
    true,
  );
  assert.equal(
    (await b.call(path + "/messages", "POST", { body: "Blocked reply" }))
      .status,
    403,
  );
  assert.equal(
    (await a.call(path + "/messages", "POST", { body: "Blocked sending" }))
      .status,
    403,
  );
  assert.equal(
    (await b.call(path + "/unblock", "POST", {})).data.conversation.blocked,
    true,
    "cannot undo the other person's block",
  );
  assert.equal(
    (await a.call(path + "/unblock", "POST", {})).data.conversation.blocked,
    false,
  );
  assert.equal(
    (
      await a.call("dm/conversations", "POST", {
        contact_code: bp.contact_code,
        body: "Sending to an existing accepted thread",
      })
    ).status,
    201,
  );
  assert.equal(
    (await a.call(path + "/messages", "POST", { body: "A repeated DM" }))
      .status,
    201,
  );
  assert.equal(
    (await a2.call(path + "/messages", "POST", { body: "a REPEATED dm" }))
      .status,
    201,
  );
  assert.equal(
    (await a2.call(path + "/messages", "POST", { body: "a repeated\u200b dm" }))
      .status,
    429,
  );
  assert.equal(
    (await a.call(path + "/messages", "POST", { body: "Sixth sent message" }))
      .status,
    201,
  );
  assert.equal(
    (
      await a2.call(path + "/messages", "POST", {
        body: "Seventh rapid message",
      })
    ).status,
    429,
  );
  assert.equal((await outsider.call("admin/dm-reports")).status, 403);
  execFileSync("php", [
    "scripts/admin.php",
    `--email=${emails[2]}`,
    "--confirm",
  ]);
  assert.equal(
    (await outsider.call(path + "/messages")).status,
    404,
    "admin role does not grant inbox access",
  );
  assert.equal(
    (await outsider.call("admin/dm-reports")).data.reports.length,
    0,
    "warnings do not disclose private messages to moderators",
  );
  assert.equal(
    (
      await outsider.call(
        `dm/messages/${risk.data.message.id}/report`,
        "POST",
        { reason: "Cannot report someone else's chat" },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await a.call(`dm/messages/${risk.data.message.id}/report`, "POST", {
        reason: "Cannot report own DM",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await b.call(`dm/messages/${risk.data.message.id}/report`, "POST", {
        reason: "Suspected financial scam",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await b.call(`dm/messages/${risk.data.message.id}/report`, "POST", {
        reason: "Repeated report",
      })
    ).status,
    201,
  );
  const reports = (await outsider.call("admin/dm-reports")).data.reports;
  assert.equal(reports.length, 1);
  assert.equal(reports[0].body, risk.data.message.body);
  assert(!Object.hasOwn(reports[0], "conversation_id"));
  assert.equal(
    (
      await a.call(`admin/dm-reports/${reports[0].id}`, "POST", {
        action: "close",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await outsider.call(`admin/dm-reports/${reports[0].id}`, "POST", {
        action: "close",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await b.call(path + "/messages", "POST", {
        body: "Closed thread cannot send",
      })
    ).status,
    403,
  );
  assert.equal((await a.call(path + "/accept", "POST", {})).status, 403);
  // Independent conversation tests rejection and new-request opt out.
  const op = (await outsider.call("dm/profile")).data.profile;
  await outsider.call("dm/profile", "PUT", { requests_enabled: false });
  assert.equal(
    (
      await b.call("dm/conversations", "POST", {
        contact_code: op.contact_code,
        body: "Disabled target",
      })
    ).status,
    403,
  );
  await outsider.call("dm/profile", "PUT", { requests_enabled: true });
  const request = await b.call("dm/conversations", "POST", {
    contact_code: op.contact_code,
    body: "Please chat with me",
  });
  assert.equal(request.status, 201);
  const other = `dm/conversations/${request.data.conversation.token}`;
  assert.equal((await b.call(other + "/decline", "POST", {})).status, 403);
  assert.equal(
    (await outsider.call(other + "/decline", "POST", {})).data.conversation
      .status,
    "declined",
  );
  assert.equal(
    (
      await b.call(other + "/messages", "POST", {
        body: "Cannot follow a declined request",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await b.call("dm/conversations", "POST", {
        contact_code: op.contact_code,
        body: "Cannot reopen a declined request",
      })
    ).status,
    409,
  );
  assert.equal(
    (await b.call(path + "/read", "POST", { last_id: request.data.message.id }))
      .status,
    404,
    "read cursors cannot reference another conversation",
  );
});
