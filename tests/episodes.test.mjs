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
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`${method} ${path}: ${res.status} ${raw.slice(0, 200)}`);
    }
    if (data.csrf) this.csrf = data.csrf;
    if (path === "register" && res.status === 202)
      return this.call("register/verify", "POST", {
        code: verificationCode(body.email),
      });
    return { status: res.status, data };
  }
}
test("long Unicode stories, episode privacy, ownership and account-scoped draft recovery", async (t) => {
  const author = new Client(),
    reader = new Client(),
    guest = new Client();
  const stamp = Date.now();
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
      (
        await client.call("register", "POST", {
          email: emails[i],
          password: "Episode-test-password-42",
        })
      ).status,
      201,
    );
  }
  await guest.call("session");
  const input = {
    body: "အမေ့ကိုပြောချင်တဲ့စကား ".repeat(1000).slice(0, 19999),
    title: "The call I remember",
    category_id: 1,
    visibility: "public",
    status: "published",
    response: "Just listening",
    writing_kind: "story",
    support_preference: "connect",
  };
  assert.equal(
    (await author.call("posts", "POST", { ...input, body: "😀".repeat(20001) }))
      .status,
    400,
  );
  const first = await author.call("posts", "POST", input);
  assert.equal(first.status, 201, JSON.stringify(first.data));
  assert.equal(first.data.post.body, input.body);
  assert.equal(first.data.post.episode_no, 1);
  assert.equal(first.data.post.support_preference, "connect");
  const id = first.data.post.id;
  const unicodeMaximum = await author.call("posts", "POST", {
    ...input,
    body: "😀".repeat(20000),
    visibility: "private",
    status: "draft",
  });
  assert.equal(unicodeMaximum.status, 201);
  assert.equal([...unicodeMaximum.data.post.body].length, 20000);
  assert.equal(
    (
      await reader.call("posts", "POST", {
        ...input,
        body: "Someone else's next part",
        next_part_of: id,
      })
    ).status,
    403,
  );
  const second = await author.call("posts", "POST", {
    ...input,
    body: "The next morning I remembered her laugh.",
    next_part_of: id,
  });
  assert.equal(second.status, 201, JSON.stringify(second.data));
  assert.equal(second.data.post.series_id, id);
  assert.equal(second.data.post.episode_no, 2);
  const privatePart = await author.call("posts", "POST", {
    ...input,
    body: "This part stays with me.",
    visibility: "private",
    next_part_of: id,
  });
  assert.equal(privatePart.status, 201);
  assert.equal(privatePart.data.post.episode_no, 3);
  const draftPart = await author.call("posts", "POST", {
    ...input,
    body: "An unfinished memory.",
    status: "draft",
    next_part_of: id,
  });
  assert.equal(draftPart.status, 201);
  assert.equal(draftPart.data.post.episode_no, 4);
  assert.deepEqual(
    (await guest.call(`posts/${id}/episodes`)).data.episodes.map((p) => p.id),
    [id, second.data.post.id],
  );
  assert.equal(
    (await author.call(`posts/${id}/episodes`)).data.episodes.length,
    4,
  );
  assert.equal(
    (await reader.call(`posts/${privatePart.data.post.id}/episodes`)).status,
    404,
  );
  // A saved draft must never silently edit the already-published original.
  const saved = {
    ...input,
    body: "Unpublished change\n\n",
    draft_key: `edit-${id}`,
  };
  assert.equal(
    (await author.call(`writing-drafts/edit-${id}`, "PUT", saved)).status,
    200,
  );
  assert.equal(
    (await author.call(`writing-drafts/edit-${id}`)).data.draft.body,
    saved.body,
  );
  assert.equal(
    (await reader.call(`writing-drafts/edit-${id}`)).data.draft,
    null,
  );
  assert.equal((await guest.call(`writing-drafts/edit-${id}`)).status, 401);
  assert.equal((await guest.call(`posts/${id}`)).data.post.body, input.body);
  const update = await author.call(`posts/${id}`, "PATCH", {
    ...saved,
    body: "The memory I am ready to share.",
    writing_kind: "short",
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.post.writing_kind, "story");
  assert.equal(
    (await author.call(`writing-drafts/edit-${id}`)).data.draft,
    null,
  );
  // Readers must not learn a hidden episode through the series navigation.
  assert.equal(
    (await reader.call(`posts/${id}/block`, "POST", {})).status,
    200,
  );
  assert.equal((await reader.call(`posts/${id}/episodes`)).status, 404);
});
