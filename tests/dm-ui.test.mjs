import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { build } from "vite";
import { JSDOM } from "jsdom";

test("two signed-in React sessions send, accept, receive and report real DMs", async (t) => {
  const stamp = Date.now();
  const emails = [
    `test-a-${stamp}@unsaid.invalid`,
    `test-b-${stamp}@unsaid.invalid`,
  ];
  const windows = [];
  t.after(() => {
    for (const dom of windows) dom.window.close();
    for (const email of emails)
      execFileSync("php", ["tests/cleanup.php", `--email=${email}`]);
  });
  async function account(email) {
    let cookie = "",
      csrf = "";
    async function request(path, options = {}) {
      const response = await fetch(new URL(path, "http://127.0.0.1:8001"), {
        ...options,
        signal: AbortSignal.timeout(10000),
        headers: { ...options.headers, Cookie: cookie },
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length)
        cookie = cookies.map((value) => value.split(";")[0]).join("; ");
      return response;
    }
    const session = await (await request("/api/session")).json();
    csrf = session.csrf;
    let registration = await request("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ email, password: "A-long-DM-UI-password-42" }),
    });
    assert.equal(registration.status, 202);
    registration = await request("/api/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ code: verificationCode(email) }),
    });
    assert.equal(registration.status, 201);
    return request;
  }
  const [requestA, requestB] = await Promise.all(emails.map(account));
  const bp = await (await requestB("/api/dm/profile")).json();
  const bSession = await (await requestB("/api/session")).json();
  const published = await requestB("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": bSession.csrf,
    },
    body: JSON.stringify({
      body: "A thought to connect through Me too",
      category_id: 1,
      visibility: "public",
      status: "published",
      response: "Just listening",
    }),
  });
  assert.equal(published.status, 201);
  const bundle = await build({
    configFile: false,
    publicDir: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: { entry: "src/main.jsx", name: "DMTest", formats: ["iife"] },
    },
  });
  const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
  const code = output.find((file) => file.type === "chunk").code;
  function mount(request) {
    const dom = new JSDOM('<div id="root"></div>', {
      url: "http://127.0.0.1:8001/#messages",
      runScripts: "outside-only",
      pretendToBeVisual: true,
    });
    windows.push(dom);
    dom.window.fetch = request;
    dom.window.eval(code);
    return dom;
  }
  const a = mount(requestA),
    b = mount(requestB);
  const { getByRole, findByRole, findByText, fireEvent, waitFor, within } =
    await import("@testing-library/dom");
  const ab = a.window.document.body,
    bb = b.window.document.body;
  const wait = (body, check) =>
    waitFor(check, { container: body, timeout: 12000 });
  await findByRole(ab, "button", { name: "New message" });
  await findByText(bb, bp.profile.contact_code);
  fireEvent.click(getByRole(ab, "button", { name: "New message" }));
  const codeDialog = await findByRole(ab, "dialog", {
    name: "Send a message request",
  });
  assert(
    within(codeDialog).getByRole("textbox", { name: "Recipient DM code" }),
  );
  fireEvent.click(
    within(codeDialog).getByRole("button", { name: "Close dialog" }),
  );
  fireEvent.change(getByRole(ab, "combobox", { name: "App language" }), {
    target: { value: "ja" },
  });
  a.window.location.hash = "explore";
  await wait(ab, () =>
    assert(
      [...ab.querySelectorAll(".thought-card")].some((card) =>
        card.textContent.includes("A thought to connect through Me too"),
      ),
    ),
  );
  const peerCard = [...ab.querySelectorAll(".thought-card")].find((card) =>
    card.textContent.includes("A thought to connect through Me too"),
  );
  fireEvent.click(
    within(peerCard).getByRole("button", { name: "私も同じです" }),
  );
  await wait(ab, () =>
    assert(getByRole(ab, "dialog", { name: "メッセージリクエストを送る" })),
  );
  const dialog = getByRole(ab, "dialog", {
    name: "メッセージリクエストを送る",
  });
  assert.equal(
    within(peerCard)
      .getByRole("button", { name: "私も同じです" })
      .getAttribute("aria-pressed"),
    "true",
  );
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "最初のメッセージ" }),
    { target: { value: "Hello from account A" } },
  );
  fireEvent.click(
    within(dialog).getByRole("button", { name: "リクエストを送信" }),
  );
  await wait(ab, () =>
    assert(
      ab.textContent.includes("相手がリクエストを承認するのを待っています。"),
    ),
  );
  fireEvent.change(getByRole(ab, "combobox", { name: "アプリの言語" }), {
    target: { value: "en" },
  });
  await wait(ab, () =>
    assert(
      ab.textContent.includes(
        "Waiting for the recipient to accept your request.",
      ),
    ),
  );
  assert(getByRole(ab, "textbox", { name: "Your message" }).disabled);
  await wait(bb, () => assert(bb.querySelector(".dm-thread")));
  fireEvent.click(bb.querySelector(".dm-thread"));
  await wait(bb, () =>
    assert(getByRole(bb, "button", { name: "Accept request" })),
  );
  fireEvent.click(getByRole(bb, "button", { name: "Accept request" }));
  await wait(ab, () =>
    assert(!getByRole(ab, "textbox", { name: "Your message" }).disabled),
  );
  fireEvent.change(getByRole(ab, "textbox", { name: "Your message" }), {
    target: { value: "A real follow-up message" },
  });
  fireEvent.click(getByRole(ab, "button", { name: "Send message" }));
  await wait(bb, () =>
    assert(
      bb
        .querySelector(".dm-history")
        .textContent.includes("A real follow-up message"),
    ),
  );
  fireEvent.change(getByRole(bb, "textbox", { name: "Your message" }), {
    target: { value: "Hello back from account B" },
  });
  fireEvent.click(getByRole(bb, "button", { name: "Send message" }));
  await wait(ab, () =>
    assert(
      ab
        .querySelector(".dm-history")
        .textContent.includes("Hello back from account B"),
    ),
  );
  fireEvent.click(getByRole(ab, "button", { name: "Report message" }));
  await findByText(
    ab,
    "Only this message and your reason will be shared with moderators.",
  );
  fireEvent.change(getByRole(ab, "textbox", { name: "Reason" }), {
    target: { value: "A report from the actual conversation UI" },
  });
  fireEvent.click(getByRole(ab, "button", { name: "Send report" }));
  await findByText(ab, "Your report has been sent.");
  const reportCount = await (await requestA("/api/dm/conversations")).json();
  assert.equal(reportCount.conversations.length, 1);
  fireEvent.click(getByRole(ab, "button", { name: "Block author" }));
  await wait(bb, () =>
    assert(getByRole(bb, "textbox", { name: "Your message" }).disabled),
  );
  assert(!ab.textContent.includes(emails[1]), "peer email is never displayed");
  // Remount the account: the thread and messages must come from MySQL again.
  a.window.close();
  const fresh = mount(requestA);
  fresh.window.location.hash = "messages/" + reportCount.conversations[0].token;
  await wait(fresh.window.document.body, () =>
    assert(
      fresh.window.document.body
        .querySelector(".dm-history")
        ?.textContent.includes("Hello back from account B"),
    ),
  );
  const freshBody = fresh.window.document.body;
  fireEvent.click(getByRole(freshBody, "button", { name: "Unblock" }));
  await wait(freshBody, () =>
    assert(getByRole(freshBody, "button", { name: "Block author" })),
  );
  fresh.window.location.hash = "explore";
  await wait(freshBody, () =>
    assert(
      [...freshBody.querySelectorAll(".thought-card")].some((card) =>
        card.textContent.includes("A thought to connect through Me too"),
      ),
    ),
  );
  const existingPeer = [...freshBody.querySelectorAll(".thought-card")].find(
    (card) => card.textContent.includes("A thought to connect through Me too"),
  );
  fireEvent.click(within(existingPeer).getByRole("button", { name: "Me too" }));
  await wait(freshBody, () =>
    assert.equal(
      fresh.window.location.hash,
      "#messages/" + reportCount.conversations[0].token,
    ),
  );
  await wait(freshBody, () =>
    assert(
      freshBody
        .querySelector(".dm-history")
        ?.textContent.includes("Hello back from account B"),
    ),
  );
  assert(
    !freshBody.querySelector('[role="dialog"]'),
    "existing conversations open directly instead of creating a duplicate request",
  );
});
