import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

class Client {
  cookie = "";
  csrf = "";
  async call(path, method = "GET", body) {
    const res = await fetch(`http://127.0.0.1:8001/api/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookie,
        "X-CSRF-Token": this.csrf,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.headers.getSetCookie().length)
      this.cookie = res.headers
        .getSetCookie()
        .map((s) => s.split(";")[0])
        .join("; ");
    const data = await res.json();
    if (data.csrf) this.csrf = data.csrf;
    if (path === "register" && res.status === 202)
      return this.call("register/verify", "POST", {
        code: verificationCode(body.email),
      });
    return { status: res.status, data };
  }
}
test("account recovery, session revocation, export, deletion and privacy-aware story notifications", async (t) => {
  const author = new Client(),
    reader = new Client(),
    guest = new Client(),
    stale = new Client();
  const stamp = Date.now();
  const password = "Community-test-password-42";
  const emails = [
    `test-a-${stamp}@unsaid.invalid`,
    `test-b-${stamp}@unsaid.invalid`,
  ];
  t.after(() => {
    for (const email of emails)
      execFileSync("php", ["tests/cleanup.php", `--email=${email}`]);
  });
  for (const [i, client] of [author, reader].entries()) {
    await client.call("session");
    assert.equal(
      (await client.call("register", "POST", { email: emails[i], password }))
        .status,
      201,
    );
  }
  await guest.call("session");
  await stale.call("session");
  assert.equal(
    (await stale.call("login", "POST", { email: emails[1], password })).status,
    200,
  );
  const story = {
    body: "A new beginning for this story",
    title: "A quiet journey",
    category_id: 1,
    visibility: "public",
    status: "published",
    response: "Advice welcome",
    writing_kind: "story",
  };
  const first = await author.call("posts", "POST", story);
  assert.equal(first.status, 201);
  const id = first.data.post.id;
  assert.equal((await guest.call(`posts/${id}/follow`, "POST")).status, 401);
  assert.equal((await author.call(`posts/${id}/follow`, "POST")).status, 400);
  assert.equal(
    (await reader.call(`posts/${id}/follow`, "POST")).data.following,
    true,
  );
  assert.equal(
    (await reader.call(`posts/${id}/follow`, "POST")).data.following,
    true,
  );
  const draft = await author.call("posts", "POST", {
    ...story,
    body: "A secret episode that nobody can read",
    next_part_of: id,
    status: "draft",
  });
  assert.equal(draft.status, 201);
  assert.equal(
    (await reader.call("notifications")).data.notifications.length,
    0,
  );
  assert.equal(
    (
      await author.call(`posts/${draft.data.post.id}`, "PATCH", {
        ...story,
        body: "The second part is now ready",
      })
    ).status,
    200,
  );
  let notes = (await reader.call("notifications")).data;
  assert.equal(notes.notifications.length, 1);
  assert.equal(notes.unread, 1);
  assert.equal(notes.notifications[0].kind, "story");
  assert.equal(JSON.stringify(notes).includes(emails[0]), false);
  assert.equal((await reader.call("notifications", "POST")).status, 200);
  assert.equal((await reader.call("notifications")).data.unread, 0);
  await reader.call("account/controls", "PUT", {
    notify_replies: true,
    notify_messages: true,
    notify_stories: false,
  });
  assert.equal(
    (await reader.call("notifications")).data.notifications.length,
    0,
  );
  await reader.call("account/controls", "PUT", {
    notify_replies: true,
    notify_messages: true,
    notify_stories: true,
  });
  assert.equal(
    (
      await reader.call(`posts/${id}/comments`, "POST", {
        body: "I hope things become easier for you",
      })
    ).status,
    201,
  );
  assert.equal(
    (await author.call("notifications")).data.notifications[0].kind,
    "reply",
  );
  await author.call("notifications", "POST");
  await reader.call(`posts/${id}/comments`, "POST", {
    body: "Thank you for sharing this memory with us",
  });
  assert.equal(
    (await author.call("notifications")).data.unread,
    1,
    "new replies remain unread even in the same second as mark-all-read",
  );
  assert.equal((await reader.call(`posts/${id}/block`, "POST")).status, 200);
  assert.equal(
    (await reader.call("notifications")).data.notifications.length,
    0,
  );
  const blocks = (await reader.call("blocks")).data.blocks;
  await reader.call("blocks", "DELETE", { token: blocks[0].token });
  assert.equal(
    (await reader.call(`posts/${id}/follow`, "DELETE")).data.following,
    false,
  );
  assert.equal(
    (await reader.call("notifications")).data.notifications.length,
    0,
  );
  await author.call(`posts/${id}`, "PATCH", {
    ...story,
    visibility: "private",
  });
  assert.equal((await reader.call(`posts/${id}/follow`)).status, 404);
  assert.equal(
    (await author.call("notifications")).data.notifications.length,
    0,
  );
  const profile = (await reader.call("dm/profile")).data.profile;
  const request = await author.call("dm/conversations", "POST", {
    contact_code: profile.contact_code,
    body: "Would you like to talk about the story?",
  });
  assert.equal(request.status, 201);
  const token = request.data.conversation.token;
  notes = (await reader.call("notifications")).data;
  assert.equal(notes.notifications[0].kind, "request");
  assert.equal(notes.unread, 1);
  assert.equal(JSON.stringify(notes).includes("Would you like"), false);
  await reader.call("notifications", "POST");
  assert.equal((await reader.call("notifications")).data.unread, 0);
  await reader.call(`dm/conversations/${token}/accept`, "POST");
  const message = await author.call(
    `dm/conversations/${token}/messages`,
    "POST",
    { body: "I am glad you found the next chapter" },
  );
  assert.equal(message.status, 201);
  assert.equal((await reader.call("notifications")).data.unread, 1);
  assert.equal(
    (await reader.call("notifications")).data.notifications[0].kind,
    "message",
  );
  await reader.call(`dm/conversations/${token}/block`, "POST");
  assert.equal(
    (await reader.call("notifications")).data.notifications.length,
    0,
  );
  await reader.call(`dm/conversations/${token}/unblock`, "POST");
  await reader.call("account/controls", "PUT", {
    notify_replies: true,
    notify_messages: false,
    notify_stories: true,
  });
  assert.equal(
    (await reader.call("notifications")).data.notifications.length,
    0,
  );
  await reader.call("account/controls", "PUT", {
    notify_replies: true,
    notify_messages: true,
    notify_stories: true,
  });
  await reader.call(`dm/conversations/${token}/read`, "POST", {
    last_id: message.data.message.id,
  });
  assert.equal(
    (await reader.call("notifications")).data.notifications.length,
    0,
  );
  const exported = (await reader.call("account/export")).data;
  assert.deepEqual(exported.entries, []);
  const authorExport = (await author.call("account/export")).data;
  assert.equal(
    authorExport.entries.some((entry) => entry.visibility === "private"),
    true,
  );
  assert.equal(JSON.stringify(authorExport).includes("password_hash"), false);
  assert.equal(
    (
      await reader.call("account/recovery-code", "POST", {
        current_password: "wrong",
      })
    ).status,
    403,
  );
  const code = (
    await reader.call("account/recovery-code", "POST", {
      current_password: password,
    })
  ).data.recovery_code;
  assert.match(code, /^[a-f0-9]{48}$/);
  assert.equal(
    (await reader.call("account/controls")).data.recovery_ready,
    true,
  );
  assert.equal(
    JSON.stringify((await reader.call("account/controls")).data).includes(code),
    false,
  );
  const newPassword = "Changed-community-password-55";
  assert.equal(
    (
      await guest.call("account/recover", "POST", {
        email: emails[0],
        recovery_code: code,
        password: newPassword,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await guest.call("account/recover", "POST", {
        email: emails[1],
        recovery_code: code,
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal((await stale.call("account/export")).status, 401);
  assert.equal((await reader.call("account/export")).status, 401);
  assert.equal(
    (
      await guest.call("account/recover", "POST", {
        email: emails[1],
        recovery_code: code,
        password: newPassword,
      })
    ).status,
    400,
  );
  assert.equal(
    (await reader.call("login", "POST", { email: emails[1], password })).status,
    401,
  );
  assert.equal(
    (
      await reader.call("login", "POST", {
        email: emails[1],
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await stale.call("login", "POST", {
        email: emails[1],
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await reader.call("account/password", "POST", {
        current_password: newPassword,
        password,
      })
    ).status,
    200,
  );
  assert.equal((await stale.call("account/export")).status, 401);
  assert.equal((await reader.call("account/export")).status, 200);
  assert.equal(
    (
      await reader.call("account", "DELETE", {
        current_password: password,
        confirmation: "no",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await reader.call("account", "DELETE", {
        current_password: "wrong",
        confirmation: "DELETE",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await reader.call("account", "DELETE", {
        current_password: password,
        confirmation: "DELETE",
      })
    ).status,
    200,
  );
  assert.equal((await reader.call("session")).data.user, null);
  assert.equal((await reader.call("account/export")).status, 401);
});
