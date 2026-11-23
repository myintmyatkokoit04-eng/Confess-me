import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = process.env.UNSAID_TEST_URL || "http://127.0.0.1:8001/api/";
class Client {
  cookie = "";
  csrf = "";
  async call(path, method = "GET", body, token = true) {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookie,
        ...(token ? { "X-CSRF-Token": this.csrf } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const set = r.headers.getSetCookie();
    if (set.length) this.cookie = set.map((s) => s.split(";")[0]).join("; ");
    const data = await r.json();
    if (data.csrf) this.csrf = data.csrf;
    if (path === "register" && r.status === 202)
      return this.call("register/verify", "POST", {
        code: verificationCode(body.email),
      });
    return { status: r.status, data };
  }
  async init() {
    assert.equal((await this.call("session")).status, 200);
  }
}
test("real PHP / MySQL authentication, ownership, privacy, community and moderation", async (t) => {
  const a = new Client(),
    b = new Client(),
    guest = new Client();
  await a.init();
  await b.init();
  await guest.init();
  const stamp = Date.now();
  const email = `test-a-${stamp}@unsaid.invalid`;
  t.after(() => {
    for (const address of [email, `test-b-${stamp}@unsaid.invalid`])
      execFileSync("php", ["tests/cleanup.php", `--email=${address}`]);
  });
  const password = "A-long-test-password-42";
  assert.equal(
    (await a.call("register", "POST", { email, password }, false)).status,
    403,
    "CSRF required before registration",
  );
  assert.equal(
    (await a.call("register", "POST", { email: "invalid", password })).status,
    400,
  );
  assert.equal(
    (await a.call("register", "POST", { email, password: "short" })).status,
    400,
  );
  assert.equal(
    (await a.call("register", "POST", { email, password })).status,
    201,
  );
  assert.equal(
    (
      await b.call("register", "POST", {
        email: `test-b-${stamp}@unsaid.invalid`,
        password,
      })
    ).status,
    201,
  );
  const session = await a.call("session");
  assert.equal(session.data.user.email, email);
  assert.equal(session.data.user.is_admin, false);
  assert.equal(session.data.user.language, "en");
  assert.equal(
    (await a.call("language", "PUT", { language: "ja" })).status,
    200,
  );
  assert.equal((await a.call("session")).data.user.language, "ja");
  assert.equal(
    (await a.call("language", "PUT", { language: "my" })).status,
    200,
  );
  assert.equal((await a.call("session")).data.user.language, "my");
  assert.equal(
    (await a.call("language", "PUT", { language: "invalid" })).status,
    400,
  );
  assert.equal((await a.call("session")).data.user.language, "my");
  assert.equal(
    (await guest.call("language", "PUT", { language: "my" })).status,
    401,
  );
  const content = {
    body: "Integration test: a public anonymous thought.",
    category_id: 1,
    visibility: "public",
    status: "published",
    response: "Advice welcome",
  };
  const pub = await a.call("posts", "POST", content);
  assert.equal(pub.status, 201);
  const id = pub.data.post.id;
  assert.equal(
    (await guest.call(`posts/${id}/translate`, "POST", { target: "my" }))
      .status,
    401,
  );
  assert.equal(
    (await a.call(`posts/${id}/translate`, "POST", { target: "invalid" }))
      .status,
    400,
  );
  const priv = await a.call("posts", "POST", {
    ...content,
    visibility: "private",
    body: "Private journal secret",
  });
  assert.equal(priv.status, 201);
  const draft = await a.call("posts", "POST", {
    ...content,
    status: "draft",
    body: "Draft secret",
  });
  assert.equal(draft.status, 201);
  for (const x of [priv, draft]) {
    assert.equal(
      (
        await a.call(`posts/${x.data.post.id}/translate`, "POST", {
          target: "my",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await b.call(`posts/${x.data.post.id}/translate`, "POST", {
          target: "my",
        })
      ).status,
      404,
    );
    assert.equal((await b.call("posts/" + x.data.post.id)).status, 404);
    assert.equal((await guest.call("posts/" + x.data.post.id)).status, 404);
    assert.equal(
      (await b.call("posts/" + x.data.post.id, "PATCH", content)).status,
      404,
    );
    assert.equal(
      (
        await a.call("posts/" + x.data.post.id + "/comments", "POST", {
          body: "Not allowed",
        })
      ).status,
      404,
    );
  }
  const feed = await guest.call("posts");
  assert.equal(feed.status, 200);
  const serialized = JSON.stringify(feed.data);
  assert(!serialized.includes("user_id"));
  assert(!serialized.includes(email));
  assert(!serialized.includes("Private journal secret"));
  assert(!serialized.includes("Draft secret"));
  assert.equal((await b.call("posts/" + id, "PATCH", content)).status, 403);
  assert.equal((await b.call("posts/" + id, "DELETE")).status, 403);
  assert.equal(
    (
      await a.call("posts/" + id, "PATCH", {
        ...content,
        body: "Updated public thought",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await guest.call("posts/" + id + "/reactions", "POST", {
        kind: "understand",
      })
    ).status,
    401,
  );
  assert.equal(
    (await b.call("posts/" + id + "/reactions", "POST", { kind: "invalid" }))
      .status,
    400,
  );
  assert.deepEqual(
    (await b.call("posts/" + id + "/reactions", "POST", { kind: "understand" }))
      .data.post.reactions,
    ["understand"],
  );
  assert.deepEqual(
    (await b.call("posts/" + id + "/reactions", "POST", { kind: "understand" }))
      .data.post.reactions,
    [],
  );
  assert.equal(
    (await b.call("posts/" + id + "/bookmark", "POST", {})).data.post.saved,
    true,
  );
  assert(
    (await b.call("posts?scope=saved")).data.posts.some((p) => p.id === id),
  );
  assert.equal(
    (await b.call("posts/" + id + "/bookmark", "POST", {})).data.post.saved,
    false,
  );
  assert.equal(
    (
      await b.call("posts/" + id + "/comments", "POST", {
        body: "A kind reply.",
      })
    ).status,
    201,
  );
  let comments = (await b.call("posts/" + id + "/comments")).data.comments;
  const commentId = comments[0].id;
  assert(!JSON.stringify(comments).includes("user_id"));
  assert.equal((await a.call("comments/" + commentId, "DELETE")).status, 403);
  assert.equal((await b.call("comments/" + commentId, "DELETE")).status, 200);
  await a.call("posts/" + id, "PATCH", {
    ...content,
    response: "Comments off",
  });
  assert.equal(
    (
      await b.call("posts/" + id + "/comments", "POST", {
        body: "Should not work.",
      })
    ).status,
    403,
  );
  await a.call("posts/" + id, "PATCH", content);
  await a.call("posts/" + id, "PATCH", {
    ...content,
    response: "Just listening",
  });
  assert.equal(
    (
      await b.call("posts/" + id + "/comments", "POST", {
        body: "This reply must be refused.",
      })
    ).status,
    403,
  );
  await a.call("posts/" + id, "PATCH", content);
  assert.equal(
    (await b.call("preferences", "PUT", { categories: [1, 5] })).status,
    200,
  );
  assert.deepEqual((await b.call("preferences")).data.categories, [1, 5]);
  assert.equal(
    (await b.call("preferences", "PUT", { categories: [999] })).status,
    400,
  );
  assert.equal(
    (
      await b.call("posts/" + id + "/report", "POST", {
        reason: "Test report for moderator review.",
      })
    ).status,
    201,
  );
  assert.equal((await b.call("admin/reports")).status, 403);
  assert.equal((await guest.call("admin/reports")).status, 401);
  execFileSync("php", ["scripts/admin.php", `--email=${email}`, "--confirm"]);
  const otherPrivate = await b.call("posts", "POST", {
    ...content,
    visibility: "private",
    body: "Another account’s private entry",
  });
  assert.equal(otherPrivate.status, 201);
  assert.equal(
    (await a.call("posts/" + otherPrivate.data.post.id)).status,
    404,
    "Admins cannot read another account’s journal",
  );
  assert.equal(
    (await a.call("posts/" + otherPrivate.data.post.id, "DELETE")).status,
    404,
  );
  assert.equal(
    (await b.call("posts/" + otherPrivate.data.post.id, "DELETE")).status,
    200,
  );
  let reports = (await a.call("admin/reports")).data.reports;
  const report = reports.find((r) => Number(r.post_id) === id);
  assert(report);
  assert(!JSON.stringify(reports).includes("Private journal secret"));
  assert(!JSON.stringify(reports).includes("Draft secret"));
  assert.equal(
    (await b.call("admin/reports/" + report.id, "POST", { action: "hide" }))
      .status,
    403,
  );
  assert.equal(
    (await a.call("admin/reports/" + report.id, "POST", { action: "hide" }))
      .status,
    200,
  );
  assert.equal((await guest.call("posts/" + id)).status, 404);
  assert.equal(
    (await a.call("admin/reports/" + report.id, "POST", { action: "restore" }))
      .status,
    200,
  );
  assert.equal((await guest.call("posts/" + id)).status, 200);
  // Reports cannot leak content that subsequently becomes private.
  await a.call("posts/" + id, "PATCH", { ...content, visibility: "private" });
  assert(
    !(await a.call("admin/reports")).data.reports.some(
      (r) => Number(r.post_id) === id,
    ),
  );
  assert.equal(
    (await a.call("admin/reports/" + report.id, "POST", { action: "hide" }))
      .status,
    404,
  );
  await a.call("posts/" + id, "PATCH", content);
  await b.call("posts/" + id + "/comments", "POST", {
    body: "A reported reply.",
  });
  comments = (await b.call("posts/" + id + "/comments")).data.comments;
  const reportedComment = comments[0].id;
  assert.equal(
    (
      await a.call("comments/" + reportedComment + "/report", "POST", {
        reason: "Test comment moderation.",
      })
    ).status,
    201,
  );
  reports = (await a.call("admin/reports")).data.reports;
  const cr = reports.find((r) => Number(r.comment_id) === reportedComment);
  assert(cr);
  assert.equal(
    (await a.call("admin/reports/" + cr.id, "POST", { action: "hide" })).status,
    200,
  );
  assert.equal(
    (await guest.call("posts/" + id + "/comments")).data.comments.length,
    0,
  );
  assert.equal(
    (await a.call("admin/reports/" + cr.id, "POST", { action: "restore" }))
      .status,
    200,
  );
  assert.equal(
    (await a.call("comments/" + reportedComment + "/block", "POST", {})).status,
    200,
  );
  assert.equal(
    (await a.call("posts/" + id + "/comments")).data.comments.length,
    0,
  );
  let blocked = (await a.call("blocks")).data.blocks;
  assert.equal(blocked.length, 1);
  assert(!JSON.stringify(blocked).includes("blocked_user_id"));
  assert.equal(
    (await a.call("blocks", "DELETE", { token: blocked[0].token })).status,
    200,
  );
  assert.equal(
    (await b.call("posts/" + id + "/block", "POST", {})).status,
    200,
  );
  assert.equal((await b.call("posts/" + id)).status, 404);
  assert(!(await b.call("posts")).data.posts.some((p) => p.id === id));
  blocked = (await b.call("blocks")).data.blocks;
  assert.equal(
    (await b.call("blocks", "DELETE", { token: blocked[0].token })).status,
    200,
  );
  assert.equal((await b.call("posts/" + id)).status, 200);
  // Pagination uses more than a single page and honors oldest sorting.
  for (let i = 0; i < 13; i++)
    assert.equal(
      (
        await a.call("posts", "POST", {
          ...content,
          body: `Pagination test ${i}`,
        })
      ).status,
      201,
    );
  const first = (await guest.call("posts?sort=oldest")).data;
  assert.equal(first.posts.length, 12);
  assert.equal(first.has_more, true);
  const second = (await guest.call("posts?sort=oldest&offset=12")).data;
  assert(!second.posts.some((p) => first.posts.some((q) => q.id === p.id)));
  assert.equal(
    (await b.call("preferences", "PUT", { categories: [] })).status,
    200,
  );
  assert.equal((await b.call("posts")).data.posts.length, 0);
  for (const p of (await a.call("posts?scope=mine")).data.posts)
    await a.call("posts/" + p.id, "DELETE");
  for (const p of (await a.call("posts?scope=mine&offset=0")).data.posts)
    await a.call("posts/" + p.id, "DELETE");
  for (const p of (await a.call("posts?scope=journal")).data.posts)
    await a.call("posts/" + p.id, "DELETE");
  assert.equal((await a.call("logout", "POST", {})).status, 200);
  assert.equal((await a.call("posts?scope=journal")).status, 401);
  assert.equal(
    (await a.call("login", "POST", { email, password: "incorrect-pass" }))
      .status,
    401,
  );
  const oldCookie = a.cookie;
  assert.equal(
    (await a.call("login", "POST", { email, password })).status,
    200,
  );
  assert.notEqual(a.cookie, oldCookie, "session id rotates on login");
  assert.equal(
    (await a.call("session")).data.user.language,
    "my",
    "language persists across sign-out and sign-in",
  );
  assert.equal((await a.call("posts", "POST", content, false)).status, 403);
  await a.call("logout", "POST", {});
  await b.call("logout", "POST", {});
});
