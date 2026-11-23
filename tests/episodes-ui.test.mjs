import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { JSDOM } from "jsdom";
import { build } from "vite";

test("composer autosaves, restores, publishes stories and continues separate linked episodes", async (t) => {
  const email = `ui-${Date.now()}@unsaid.invalid`;
  let cookie = "",
    csrf = "";
  let holdNextSave = false,
    releaseSave;
  t.after(() => releaseSave?.());
  async function request(path, options = {}) {
    const res = await fetch(new URL(path, "http://127.0.0.1:8001"), {
      ...options,
      headers: { ...options.headers, Cookie: cookie },
    });
    if (res.headers.getSetCookie().length)
      cookie = res.headers
        .getSetCookie()
        .map((s) => s.split(";")[0])
        .join("; ");
    if (
      holdNextSave &&
      options.method === "PUT" &&
      String(path).includes("writing-drafts/")
    ) {
      holdNextSave = false;
      await new Promise((resolve) => {
        releaseSave = resolve;
      });
    }
    return res;
  }
  csrf = (await (await request("/api/session")).json()).csrf;
  let registration = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify({ email, password: "Story-ui-password-42" }),
  });
  assert.equal(registration.status, 202);
  registration = await request("/api/register/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify({ code: verificationCode(email) }),
  });
  assert.equal(registration.status, 201);
  t.after(() => execFileSync("php", ["tests/cleanup.php", `--email=${email}`]));
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1:8001/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  dom.window.fetch = request;
  const errors = [];
  dom.window.addEventListener("error", (e) => errors.push(e.message));
  const bundle = await build({
    configFile: false,
    publicDir: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: { entry: "src/main.jsx", name: "EpisodesTest", formats: ["iife"] },
    },
  });
  const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
  dom.window.eval(output.find((file) => file.type === "chunk").code);
  const { findByRole, getByRole, findByText, fireEvent, within, waitFor } =
    await import("@testing-library/dom");
  const body = dom.window.document.body;
  const wait = (check) => waitFor(check, { container: body, timeout: 10000 });
  const click = async (container, name) => {
    fireEvent.click(
      await findByRole(container, "button", { name, exact: true }),
    );
  };
  const change = (container, role, name, value) =>
    fireEvent.change(getByRole(container, role, { name }), {
      target: { value },
    });
  await click(body, "Account menu");
  await findByText(body, email, {}, { timeout: 10000 });
  await click(body, "Close account menu");
  await click(body, "Share a thought");
  let dialog = await findByRole(body, "dialog");
  await findByText(dialog, "Draft autosave is on");
  change(dialog, "combobox", "What would you like to write?", "story");
  change(dialog, "textbox", "Title (optional)", "A memory in two parts");
  const longText = "အမေ့ကို ပြောချင်တဲ့စကားတွေပါ။ ".repeat(240);
  change(dialog, "textbox", "Your thought", longText);
  change(dialog, "combobox", "What would feel helpful?", "connect");
  await findByText(dialog, "Draft saved automatically", {}, { timeout: 10000 });
  // Reverting while an older write is in flight must persist the latest text.
  holdNextSave = true;
  change(dialog, "textbox", "Your thought", "A temporary revision.");
  await wait(() => assert(releaseSave));
  change(dialog, "textbox", "Your thought", longText);
  releaseSave();
  await wait(async () => {
    const saved = await (
      await request("/api/writing-drafts/new-public")
    ).json();
    assert.equal(saved.draft.body, longText);
  });
  // Escape must flush with current editor state, not the state when the modal mounted.
  fireEvent.keyDown(dom.window.document, { key: "Escape" });
  await wait(() => assert(!body.querySelector('[role="dialog"]')));
  await click(body, "Share a thought");
  dialog = await findByRole(body, "dialog");
  await click(dialog, "Restore writing");
  await wait(() =>
    assert.equal(
      getByRole(dialog, "textbox", { name: "Your thought" }).value,
      longText,
    ),
  );
  assert.equal(
    getByRole(dialog, "combobox", { name: "What would you like to write?" })
      .value,
    "story",
  );
  await click(dialog, "Preview");
  await click(dialog, "Share thought");
  await wait(() => assert(!body.querySelector('[role="dialog"]')));
  await findByText(body, "A memory in two parts");
  let card = [...body.querySelectorAll(".thought-card")].find((n) =>
    n.textContent.includes("A memory in two parts"),
  );
  assert(
    card.textContent.includes("I'd like to talk to someone who understands"),
  );
  await click(card, "Add next episode");
  dialog = await findByRole(body, "dialog");
  await findByText(dialog, "Draft autosave is on");
  assert.equal(
    getByRole(dialog, "textbox", { name: "Your thought" }).value,
    "",
  );
  change(dialog, "textbox", "Title (optional)", "The next morning");
  change(
    dialog,
    "textbox",
    "Your thought",
    "I finally found the words I was looking for.",
  );
  await click(dialog, "Preview");
  await click(dialog, "Share thought");
  await wait(() => assert(!body.querySelector('[role="dialog"]')));
  await findByText(body, "The next morning");
  card = [...body.querySelectorAll(".thought-card")].find((n) =>
    n.textContent.includes("The next morning"),
  );
  assert(card.textContent.includes("Part 2"));
  await click(card, "Read");
  const nav = await findByRole(body, "navigation", { name: "Story episodes" });
  await findByRole(nav, "button", { name: /Part 1.*A memory in two parts/ });
  assert(await findByRole(nav, "button", { name: /Part 2.*The next morning/ }));
  assert.deepEqual(errors, []);
});
