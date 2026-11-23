import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { build } from "vite";
import { execFileSync } from "node:child_process";

test("React interface connects to the real PHP API: authentication, compose, journal, replies and saved", async (t) => {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    {
      url: "http://127.0.0.1:8001/",
      runScripts: "outside-only",
      pretendToBeVisual: true,
    },
  );
  const originalFetch = globalThis.fetch;
  t.after(() => dom.window.close());
  let cookie = "";
  dom.window.fetch = async (path, options = {}) => {
    const response = await originalFetch(
      new URL(path, "http://127.0.0.1:8001"),
      { ...options, headers: { ...options.headers, Cookie: cookie } },
    );
    const set = response.headers.getSetCookie();
    if (set.length) cookie = set.map((s) => s.split(";")[0]).join("; ");
    return response;
  };
  const bundle = await build({
    configFile: false,
    publicDir: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: { entry: "src/main.jsx", name: "UnsaidTest", formats: ["iife"] },
    },
  });
  const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
  dom.window.eval(output.find((file) => file.type === "chunk").code);
  console.log("UI check: React mounted");
  const {
    getByRole,
    findByText,
    findByRole,
    getAllByRole,
    within,
    waitFor,
    queryByText,
    configure,
    fireEvent,
  } = await import("@testing-library/dom");
  configure({ defaultHidden: true });
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const user = {
    click: async (node) => {
      fireEvent.click(node);
      await tick();
    },
    type: async (node, text) => {
      await waitFor(() => assert(!node.closest("fieldset")?.disabled), {
        container: dom.window.document.body,
      });
      fireEvent.change(node, { target: { value: node.value + text } });
      await tick();
    },
    clear: async (node) => {
      await waitFor(() => assert(!node.closest("fieldset")?.disabled), {
        container: dom.window.document.body,
      });
      fireEvent.change(node, { target: { value: "" } });
      await tick();
    },
  };
  const body = dom.window.document.body;
  const wait = async (fn) => waitFor(fn, { container: body, timeout: 7000 });
  await findByText(
    body,
    "I wish I had called my parents more often. Today, I finally picked up the phone.",
    {},
    { timeout: 7000 },
  );
  assert(
    getByRole(body, "heading", { name: "Some things are easier to write." }),
  );
  fireEvent.change(getByRole(body, "combobox", { name: "App language" }), {
    target: { value: "my" },
  });
  await findByRole(body, "button", { name: "ခံစားချက်မျှဝေရန်" });
  assert.equal(dom.window.document.documentElement.lang, "my");
  assert.equal(dom.window.localStorage.getItem("unsaid-language"), "my");
  assert(
    queryByText(
      body,
      "I wish I had called my parents more often. Today, I finally picked up the phone.",
    ),
  );
  assert(getByRole(body, "button", { name: "မိသားစု", exact: true }));
  fireEvent.change(getByRole(body, "combobox", { name: "အက်ပ်ဘာသာစကား" }), {
    target: { value: "en" },
  });
  await findByRole(body, "button", { name: "Share a thought" });
  const initialCount = body.querySelectorAll(".thought-card").length;
  const familyCount = [...body.querySelectorAll(".thought-card .badge")].filter(
    (n) => n.textContent === "Family",
  ).length;
  await user.click(getByRole(body, "button", { name: "Family", exact: true }));
  await wait(() =>
    assert.equal(body.querySelectorAll(".thought-card").length, familyCount),
  );
  await user.click(getByRole(body, "button", { name: "All thoughts" }));
  await wait(() =>
    assert.equal(body.querySelectorAll(".thought-card").length, initialCount),
  );
  await user.click(getByRole(body, "button", { name: "Share a thought" }));
  console.log("UI check: filters and composer");
  let dialog = getByRole(body, "dialog");
  await user.click(
    within(dialog).getByRole("button", {
      name: "New to Unsaid? Create an account",
    }),
  );
  const email = `ui-${Date.now()}@unsaid.invalid`;
  t.after(() => execFileSync("php", ["tests/cleanup.php", `--email=${email}`]));
  await user.type(
    within(dialog).getByRole("textbox", { name: "Email address" }),
    email,
  );
  await user.type(
    dialog.querySelector("input[type=password]"),
    "A-long-ui-password-42",
  );
  await user.click(
    within(dialog).getByRole("button", { name: "Create account" }),
  );
  await findByRole(body, "heading", { name: "Confirm your email" });
  await user.type(
    within(dialog).getByRole("textbox", { name: "Confirmation code" }),
    verificationCode(email),
  );
  await user.click(
    within(dialog).getByRole("button", { name: "Verify & create account" }),
  );
  await wait(() =>
    assert(!body.querySelector(".modal"), "Dialog should close"),
  );
  console.log("UI check: account registered");
  await user.click(getByRole(body, "button", { name: "Share a thought" }));
  dialog = getByRole(body, "dialog");
  await user.click(
    within(dialog).getByRole("button", { name: "Need a place to start?" }),
  );
  await user.click(
    within(dialog).getByRole("button", { name: "What do you miss most?" }),
  );
  assert.equal(
    within(dialog).getByRole("textbox", { name: "Your thought" }).value,
    "",
  );
  await user.click(within(dialog).getByRole("button", { name: "Add a title" }));
  await user.type(
    within(dialog).getByRole("textbox", { name: "Title (optional)" }),
    "A story worth sharing",
  );
  await user.type(
    within(dialog).getByRole("textbox", { name: "Your thought" }),
    "A UI test thought shared with care.",
  );
  assert(
    within(dialog).getByRole("button", { name: "Share thought" }).disabled,
    "Preview is required",
  );
  fireEvent.change(
    within(dialog).getByRole("combobox", { name: "What would feel helpful?" }),
    { target: { value: "advice" } },
  );
  await tick();
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Title (optional)" }),
    { target: { value: "You are an idiot" } },
  );
  let warningText = "";
  dom.window.confirm = (message) => {
    warningText = message;
    return false;
  };
  await user.click(within(dialog).getByRole("button", { name: "Preview" }));
  await user.click(
    within(dialog).getByRole("button", { name: "Share thought" }),
  );
  await wait(() => assert(warningText.includes("you are an idiot")));
  await within(dialog).findByText(
    "Your text is still here. You can edit it before sharing.",
  );
  await user.click(
    within(dialog).getByRole("button", { name: "Back to writing" }),
  );
  assert.equal(
    within(dialog).getByRole("textbox", { name: "Your thought" }).value,
    "A UI test thought shared with care.",
  );
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Title (optional)" }),
    { target: { value: "A story worth sharing" } },
  );
  await user.click(within(dialog).getByRole("button", { name: "Preview" }));
  await user.click(
    within(dialog).getByRole("button", { name: "Share thought" }),
  );
  await wait(() =>
    assert(!body.querySelector(".modal"), "Publishing should close the dialog"),
  );
  await findByText(
    body,
    "A UI test thought shared with care.",
    {},
    { timeout: 7000 },
  );
  let card = [...body.querySelectorAll(".thought-card")].find((c) =>
    c.textContent.includes("A UI test thought"),
  );
  console.log("UI check: public thought published");
  assert(
    card.textContent.includes("A story worth sharing"),
    "Optional title persists and appears in the feed",
  );
  fireEvent.change(getByRole(body, "combobox", { name: "App language" }), {
    target: { value: "ja" },
  });
  await findByRole(card, "button", { name: "私も同じです" });
  await user.click(within(card).getByRole("button", { name: "私も同じです" }));
  await wait(() =>
    assert.equal(
      within(card)
        .getByRole("button", { name: "私も同じです" })
        .getAttribute("aria-pressed"),
      "true",
    ),
  );
  await user.click(within(card).getByRole("button", { name: "私も同じです" }));
  await wait(() =>
    assert.equal(
      within(card)
        .getByRole("button", { name: "私も同じです" })
        .getAttribute("aria-pressed"),
      "false",
    ),
  );
  fireEvent.change(getByRole(body, "combobox", { name: "アプリの言語" }), {
    target: { value: "en" },
  });
  await findByRole(card, "button", { name: "Me too" });
  await user.click(within(card).getByRole("button", { name: "I understand" }));
  await wait(() =>
    assert(
      within(card)
        .getByRole("button", { name: "I understand" })
        .classList.contains("selected"),
    ),
  );
  await user.click(within(card).getByRole("button", { name: "Reply" }));
  await findByRole(
    body,
    "heading",
    { name: "A little conversation" },
    { timeout: 7000 },
  );
  await user.type(
    getByRole(body, "textbox", { name: "Leave a gentle reply" }),
    "A little understanding.",
  );
  await user.click(getByRole(body, "button", { name: "Send reply" }));
  await findByText(body, "A little understanding.", {}, { timeout: 7000 });
  await user.click(getByRole(body, "button", { name: "Back to thoughts" }));
  await findByText(
    body,
    "A UI test thought shared with care.",
    {},
    { timeout: 7000 },
  );
  card = [...body.querySelectorAll(".thought-card")].find((c) =>
    c.textContent.includes("A UI test thought"),
  );
  await user.click(
    within(card).getByRole("button", { name: "Thought options" }),
  );
  await user.click(within(card).getByRole("button", { name: "Save thought" }));
  await user.click(getByRole(body, "link", { name: "Saved", exact: true }));
  await findByRole(
    body,
    "heading",
    { name: "Words to come back to" },
    { timeout: 7000 },
  );
  await findByText(
    body,
    "A UI test thought shared with care.",
    {},
    { timeout: 7000 },
  );
  await user.click(getByRole(body, "link", { name: "Explore", exact: true }));
  await findByRole(
    body,
    "heading",
    { name: "Some things are easier to write." },
    { timeout: 7000 },
  );
  await user.click(getByRole(body, "button", { name: "Keep it private" }));
  dialog = getByRole(body, "dialog");
  await user.type(
    within(dialog).getByRole("textbox", { name: "Your thought" }),
    "A private UI reflection.",
  );
  await user.click(within(dialog).getByRole("button", { name: "Preview" }));
  await user.click(
    within(dialog).getByRole("button", { name: "Save privately" }),
  );
  await wait(() =>
    assert(!body.querySelector(".modal"), "Dialog should close"),
  );
  await user.click(getByRole(body, "link", { name: "My Journal" }));
  await findByText(body, "A private UI reflection.", {}, { timeout: 7000 });
  await user.click(getByRole(body, "button", { name: "Write a thought" }));
  dialog = getByRole(body, "dialog");
  await user.type(
    within(dialog).getByRole("textbox", { name: "Your thought" }),
    "An unfinished UI draft.",
  );
  await user.click(within(dialog).getByRole("button", { name: "Save draft" }));
  await wait(() =>
    assert(
      !body.querySelector(".modal"),
      "Saving a draft should close the dialog",
    ),
  );
  await findByText(body, "An unfinished UI draft.", {}, { timeout: 7000 });
  card = [...body.querySelectorAll(".thought-card")].find((c) =>
    c.textContent.includes("A private UI reflection."),
  );
  await user.click(
    within(card).getByRole("button", { name: "Edit", exact: true }),
  );
  dialog = getByRole(body, "dialog");
  await user.clear(
    within(dialog).getByRole("textbox", { name: "Your thought" }),
  );
  await user.type(
    within(dialog).getByRole("textbox", { name: "Your thought" }),
    "An edited private reflection.",
  );
  await user.click(within(dialog).getByRole("button", { name: "Preview" }));
  await user.click(
    within(dialog).getByRole("button", { name: "Save privately" }),
  );
  await findByText(
    body,
    "An edited private reflection.",
    {},
    { timeout: 7000 },
  );
  await wait(() =>
    assert(
      !body.querySelector(".modal"),
      "Saving an edit should close the dialog",
    ),
  );
  await user.click(getByRole(body, "button", { name: "Manage preferences" }));
  await findByRole(
    body,
    "heading",
    { name: "Your reading preferences" },
    { timeout: 7000 },
  );
  await user.click(getByRole(body, "switch", { name: "Career" }));
  await wait(() =>
    assert(!getByRole(body, "switch", { name: "Career" }).checked),
  );
  await user.click(getByRole(body, "button", { name: "Account menu" }));
  await user.click(getByRole(body, "button", { name: "Sign out" }));
  await findByRole(
    body,
    "heading",
    { name: "Some things are easier to write." },
    { timeout: 7000 },
  );
  await findByText(
    body,
    "I wish I had called my parents more often. Today, I finally picked up the phone.",
    {},
    { timeout: 7000 },
  );
  assert(
    !queryByText(body, "An edited private reflection."),
    "Private entries must leave the page after sign-out",
  );
  assert(
    !queryByText(body, "An unfinished UI draft."),
    "Drafts must leave the page after sign-out",
  );
  // Remove only this test account's posts through authenticated owner endpoints.
  const call = async (path, method, content, token) => {
    const r = await dom.window.fetch("/api/" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": token || "",
      },
      ...(content ? { body: JSON.stringify(content) } : {}),
    });
    return await r.json();
  };
  let s = await call("session", "GET");
  s = await call(
    "login",
    "POST",
    { email, password: "A-long-ui-password-42" },
    s.csrf,
  );
  for (const scope of ["mine", "journal"]) {
    const data = await call("posts?scope=" + scope, "GET");
    for (const p of data.posts)
      await call("posts/" + p.id, "DELETE", null, s.csrf);
  }
  await call("logout", "POST", {}, s.csrf);
  dom.window.close();
});
