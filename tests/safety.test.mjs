import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("local safety signals distinguish empathy from solicitation in three languages", () => {
  const examples = [
    ["私も同じです", []],
    ["I lost money on an investment and feel sad.", []],
    ["I understand how you feel.", []],
    ["Send me money through my bank account", ["money_request"]],
    ["お金を送ってください", ["money_request"]],
    ["ငွေလွှဲပေးပါ", ["money_request"]],
    ["Join my guaranteed crypto investment", ["investment_pitch"]],
    ["元本保証の投資に参加して", ["investment_pitch"]],
    ["အရှုံးမရှိ ရင်းနှီးမြှုပ်နှံပါ", ["investment_pitch"]],
    ["Add me on LINE", ["off_platform"]],
    ["LINEに追加して", ["off_platform"]],
    ["Telegram မှာ ဆက်သွယ်ပါ", ["off_platform"]],
  ];
  const result = JSON.parse(
    execFileSync(
      "php",
      [
        "-r",
        "require 'server/safety.php'; $items=json_decode(stream_get_contents(STDIN),true); echo json_encode(array_map(fn($i)=>safety_signals($i[0]),$items));",
      ],
      { input: JSON.stringify(examples), encoding: "utf8" },
    ),
  );
  assert.deepEqual(
    result,
    examples.map((item) => item[1]),
  );
});

class Client {
  cookie = "";
  csrf = "";
  async call(path, method = "GET", body) {
    const response = await fetch(
      (process.env.UNSAID_TEST_URL || "http://127.0.0.1:8001/api/") + path,
      {
        method,
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          Cookie: this.cookie,
          "X-CSRF-Token": this.csrf,
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

test("abuse rules cover multilingual targeting without blocking discussion of violence", () => {
  const examples = [
    ["I miss my mom", []],
    ["He called me an idiot and I felt hurt", []],
    ["I survived violence and need to talk", []],
    ["You are an idiot", ["targeted_abuse"]],
    ["お前はクズ", ["targeted_abuse"]],
    ["မင်းက အသုံးမကျဘူး", ["targeted_abuse"]],
    ["nin a yuu", ["targeted_abuse"]],
    ["I will kill you", ["violence_threat"]],
    ["I will ki\u200bll you", ["violence_threat"]],
    ["お前を殺す", ["violence_threat"]],
    ["မင်းကိုသတ်ပစ်မယ်", ["violence_threat"]],
    ["nin ko that pit mal", ["violence_threat"]],
    ["Her address is 123 Example St, go attack her", ["personal_info_attack"]],
  ];
  const result = JSON.parse(
    execFileSync(
      "php",
      [
        "-r",
        "require 'server/safety.php'; $items=json_decode(stream_get_contents(STDIN),true); echo json_encode(array_map(fn($i)=>abuse_check($i[0])['signals'],$items));",
      ],
      { input: JSON.stringify(examples), encoding: "utf8" },
    ),
  );
  assert.deepEqual(
    result,
    examples.map((item) => item[1]),
  );
});

test("API: wording confirmation, title checks, severe holds and private exclusion", async (t) => {
  const email = `test-a-${Date.now()}@unsaid.invalid`;
  t.after(() => execFileSync("php", ["tests/cleanup.php", `--email=${email}`]));
  const author = new Client(),
    guest = new Client();
  await author.call("session");
  await guest.call("session");
  assert.equal(
    (
      await author.call("register", "POST", {
        email,
        password: "A-long-abuse-test-password",
      })
    ).status,
    201,
  );
  const make = (body, extra = {}) => ({
    body,
    category_id: 1,
    visibility: "public",
    status: "published",
    response: "Advice welcome",
    ...extra,
  });
  const warned = await author.call("posts", "POST", make("You are an idiot"));
  assert.equal(warned.status, 422);
  assert.equal(warned.data.code, "review_wording");
  assert(warned.data.matches.length);
  const confirmed = await author.call(
    "posts",
    "POST",
    make("You are an idiot", { acknowledge_abuse: true }),
  );
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.data.post.hidden, false);
  const severe = await author.call(
    "posts",
    "POST",
    make("A short confession", {
      title: "I will kill you",
      acknowledge_abuse: true,
    }),
  );
  assert.equal(severe.status, 201);
  assert.equal(severe.data.post.hidden, true);
  assert.equal((await guest.call(`posts/${severe.data.post.id}`)).status, 404);
  assert.equal(
    (await author.call(`posts/${severe.data.post.id}/appeal`, "POST", {}))
      .status,
    200,
  );
  const privatePost = await author.call(
    "posts",
    "POST",
    make("I will kill you", { visibility: "private" }),
  );
  assert.equal(privatePost.status, 201);
  assert.equal(privatePost.data.post.hidden, false);
  assert.deepEqual(privatePost.data.post.safety_signals, []);
  const parent = await author.call(
    "posts",
    "POST",
    make("I need someone to listen."),
  );
  const id = parent.data.post.id;
  const comment = await author.call(`posts/${id}/comments`, "POST", {
    body: "I will shoot you",
  });
  assert.equal(comment.status, 201);
  assert.equal(comment.data.held_for_review, true);
  assert.equal(
    (await guest.call(`posts/${id}/comments`)).data.comments.length,
    0,
  );
  assert.equal(
    (await author.call(`posts/${id}/comments`)).data.comments[0].hidden,
    true,
  );
  execFileSync("php", ["scripts/admin.php", `--email=${email}`, "--confirm"]);
  const reports = (await author.call("admin/reports")).data.reports;
  const report = reports.find((r) => Number(r.post_id) === severe.data.post.id);
  assert(report.reason.includes("violence_threat"));
  assert.equal(
    (
      await author.call(`admin/reports/${report.id}`, "POST", {
        action: "restore",
      })
    ).status,
    200,
  );
  assert.equal((await guest.call(`posts/${severe.data.post.id}`)).status, 200);
});

test("API: warnings, private exclusion, duplicate limits, review and appeals", async (t) => {
  const stamp = Date.now();
  const emails = [
    `test-a-${stamp}@unsaid.invalid`,
    `test-b-${stamp}@unsaid.invalid`,
  ];
  t.after(() => {
    for (const email of emails)
      execFileSync("php", ["tests/cleanup.php", `--email=${email}`]);
  });
  const author = new Client(),
    moderator = new Client(),
    guest = new Client();
  for (const client of [author, moderator, guest])
    assert.equal((await client.call("session")).status, 200);
  for (const [i, client] of [author, moderator].entries())
    assert.equal(
      (
        await client.call("register", "POST", {
          email: emails[i],
          password: "A-long-safety-test-password",
        })
      ).status,
      201,
    );
  execFileSync("php", [
    "scripts/admin.php",
    `--email=${emails[1]}`,
    "--confirm",
  ]);
  const make = (body, visibility = "public", status = "published") => ({
    body,
    visibility,
    status,
    category_id: 1,
    response: "Advice welcome",
  });
  const published = await author.call(
    "posts",
    "POST",
    make("Send me money through my bank account"),
  );
  assert.equal(published.status, 201);
  const id = published.data.post.id;
  assert.deepEqual(published.data.post.safety_signals, ["money_request"]);
  assert.equal(published.data.post.hidden, false, "no automatic hiding");
  const privatePost = await author.call(
    "posts",
    "POST",
    make("Send me money", "private"),
  );
  assert.equal(privatePost.status, 201);
  assert.deepEqual(privatePost.data.post.safety_signals, []);
  const draft = await author.call(
    "posts",
    "POST",
    make("Send me money", "public", "draft"),
  );
  assert.equal(draft.status, 201);
  assert.deepEqual(draft.data.post.safety_signals, []);
  assert.equal(
    (await guest.call(`posts/${privatePost.data.post.id}`)).status,
    404,
  );
  assert.equal(
    (await author.call(`posts/${id}/reactions`, "POST", { kind: "me_too" }))
      .status,
    200,
  );
  let reports = (await moderator.call("admin/reports")).data.reports;
  assert(
    !reports.some(
      (r) =>
        Number(r.post_id) === privatePost.data.post.id ||
        Number(r.post_id) === draft.data.post.id,
    ),
  );
  const report = reports.find((r) => Number(r.post_id) === id);
  assert(report.reason.includes("money_request"));
  assert.equal((await guest.call("admin/reports")).status, 401);
  assert.equal((await author.call("admin/reports")).status, 403);
  assert.equal(
    (
      await moderator.call(`admin/reports/${report.id}`, "POST", {
        action: "hide",
      })
    ).status,
    200,
  );
  assert.equal((await guest.call(`posts/${id}`)).status, 404);
  assert.equal(
    (await moderator.call(`posts/${id}/appeal`, "POST", {})).status,
    404,
    "only owner may appeal",
  );
  assert.equal(
    (await author.call(`posts/${id}/appeal`, "POST", {})).status,
    200,
  );
  assert.equal(
    (await author.call(`posts/${id}/appeal`, "POST", {})).status,
    200,
  );
  reports = (await moderator.call("admin/reports")).data.reports;
  const appeals = reports.filter(
    (r) => Number(r.post_id) === id && r.status === "open",
  );
  assert.equal(appeals.length, 1, "appeals are idempotent");
  assert.equal(
    (
      await moderator.call(`admin/reports/${appeals[0].id}`, "POST", {
        action: "restore",
      })
    ).status,
    200,
  );
  assert.equal((await guest.call(`posts/${id}`)).status, 200);
  assert.equal(
    (
      await author.call(`posts/${id}/comments`, "POST", {
        body: "Add me on LINE",
      })
    ).status,
    201,
  );
  const comment = (await author.call(`posts/${id}/comments`)).data.comments[0];
  assert.deepEqual(comment.safety_signals, ["off_platform"]);
  reports = (await moderator.call("admin/reports")).data.reports;
  const commentReport = reports.find(
    (r) => Number(r.comment_id) === comment.id,
  );
  assert(commentReport);
  assert.equal(
    (
      await moderator.call(`admin/reports/${commentReport.id}`, "POST", {
        action: "hide",
      })
    ).status,
    200,
  );
  assert.equal(
    (await guest.call(`posts/${id}/comments`)).data.comments.length,
    0,
  );
  assert.equal(
    (await author.call(`posts/${id}/comments`)).data.comments[0].hidden,
    true,
  );
  assert.equal(
    (await author.call(`comments/${comment.id}/appeal`, "POST", {})).status,
    200,
  );
  assert.equal(
    (await moderator.call(`comments/${comment.id}/appeal`, "POST", {})).status,
    404,
  );
  // Duplicate checks span posts and sessions and normalize case/whitespace.
  const second = await author.call("posts", "POST", make("Another thought"));
  const session2 = new Client();
  await session2.call("session");
  assert.equal(
    (
      await session2.call("login", "POST", {
        email: emails[0],
        password: "A-long-safety-test-password",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await author.call(`posts/${id}/comments`, "POST", {
        body: "A repeated message",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await session2.call(`posts/${second.data.post.id}/comments`, "POST", {
        body: "a REPEATED message",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await session2.call(`posts/${id}/comments`, "POST", {
        body: "a repeated\u200b message",
      })
    ).status,
    429,
  );
  for (let i = 0; i < 3; i++)
    assert.equal(
      (
        await author.call(`posts/${id}/comments`, "POST", {
          body: `Different reply ${i}`,
        })
      ).status,
      201,
    );
  assert.equal(
    (
      await session2.call(`posts/${id}/comments`, "POST", {
        body: "Seventh rapid reply",
      })
    ).status,
    429,
  );
  assert.equal(
    (await author.call("posts", "POST", make("Repeated public post"))).status,
    201,
  );
  assert.equal(
    (await author.call(`comments/${comment.id}`, "DELETE")).status,
    200,
  );
  assert.equal(
    (
      await session2.call(`posts/${id}/comments`, "POST", {
        body: "Deleting replies cannot reset the burst limit",
      })
    ).status,
    429,
  );
  assert.equal(
    (await author.call("posts", "POST", make("repeated public post"))).status,
    201,
  );
  assert.equal(
    (await author.call("posts", "POST", make("repeated public post"))).status,
    429,
  );
  assert.equal(
    (
      await author.call(
        "posts",
        "POST",
        make("repeated public post", "private"),
      )
    ).status,
    201,
    "private journals bypass duplicate filter",
  );
  const moderatorPost = await moderator.call(
    "posts",
    "POST",
    make("A moderator's public thought"),
  );
  assert.equal(moderatorPost.status, 201);
  assert.equal(
    (await author.call(`posts/${moderatorPost.data.post.id}/block`, "POST", {}))
      .status,
    200,
  );
  assert.equal(
    (
      await moderator.call(`posts/${id}/comments`, "POST", {
        body: "A blocked sender cannot contact the author here",
      })
    ).status,
    403,
  );
});
