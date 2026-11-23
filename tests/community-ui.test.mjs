import { verificationCode } from "./verification-helper.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { JSDOM } from "jsdom";
import { build } from "vite";

test("React follows stories, reads notifications, manages privacy and recovers an account", async (t) => {
  const stamp = Date.now();
  const emails = [
    `test-a-${stamp}@unsaid.invalid`,
    `ui-${stamp}@unsaid.invalid`,
  ];
  const password = "Community-ui-password-42";
  function client() {
    let cookie = "",
      csrf = "";
    const request = async (path, options = {}) => {
      const res = await fetch(new URL(path, "http://127.0.0.1:8001"), {
        ...options,
        headers: { ...options.headers, Cookie: cookie },
      });
      if (res.headers.getSetCookie().length)
        cookie = res.headers
          .getSetCookie()
          .map((s) => s.split(";")[0])
          .join("; ");
      return res;
    };
    const call = async (path, method = "GET", body) => {
      const res = await request(`/api/${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json();
      if (data.csrf) csrf = data.csrf;
      assert(res.ok, `${path}: ${JSON.stringify(data)}`);
      if (path === "register" && res.status === 202)
        return call("register/verify", "POST", {
          code: verificationCode(body.email),
        });
      return data;
    };
    return { request, call };
  }
  const author = client(),
    reader = client();
  t.after(() => {
    for (const email of emails)
      execFileSync("php", ["tests/cleanup.php", `--email=${email}`]);
  });
  for (const [i, session] of [author, reader].entries()) {
    await session.call("session");
    await session.call("register", "POST", { email: emails[i], password });
  }
  const input = {
    title: "A story to follow",
    body: "The beginning of a quiet journey",
    category_id: 1,
    writing_kind: "story",
    visibility: "public",
    status: "published",
    response: "Advice welcome",
  };
  const { post } = await author.call("posts", "POST", input);
  const dom = new JSDOM('<div id="root"></div>', {
    url: `http://127.0.0.1:8001/#post/${post.id}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  dom.window.fetch = reader.request;
  const errors = [];
  dom.window.addEventListener("error", (e) => errors.push(e.message));
  let downloaded = false;
  dom.window.URL.createObjectURL = (blob) => {
    assert(blob.size > 0);
    downloaded = true;
    return "blob:unsaid-test";
  };
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () {
    assert.equal(this.download, "unsaid-writing.json");
  };
  const bundle = await build({
    configFile: false,
    publicDir: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: { entry: "src/main.jsx", name: "CommunityTest", formats: ["iife"] },
    },
  });
  const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
  dom.window.eval(output.find((file) => file.type === "chunk").code);
  const {
    findByRole,
    findByText,
    getByLabelText,
    getByRole,
    fireEvent,
    waitFor,
  } = await import("@testing-library/dom");
  const body = dom.window.document.body;
  const wait = (check) => waitFor(check, { container: body, timeout: 10000 });
  const click = async (container, name) => {
    const button = await findByRole(
      container,
      "button",
      { name, exact: true },
      { timeout: 10000 },
    );
    await wait(() => assert(!button.disabled));
    fireEvent.click(button);
    return button;
  };
  const fill = (container, name, value) =>
    fireEvent.change(getByLabelText(container, name, { exact: true }), {
      target: { value },
    });
  await click(body, "Follow story");
  await findByRole(body, "button", { name: "Unfollow story" });
  await author.call("posts", "POST", {
    ...input,
    body: "A new episode arrives quietly",
    title: "The next step",
    next_part_of: post.id,
  });
  dom.window.location.hash = "notifications";
  await findByText(
    body,
    "A story you follow has a new episode.",
    {},
    { timeout: 10000 },
  );
  await click(body, "Mark all as read");
  await wait(() =>
    assert.equal(body.querySelectorAll(".notification-list .unread").length, 0),
  );
  dom.window.location.hash = "settings";
  await findByText(body, "Account & privacy", {}, { timeout: 10000 });
  const notify = await findByRole(body, "switch", {
    name: "New story episodes",
  });
  fireEvent.click(notify);
  await wait(() => assert.equal(notify.checked, false));
  let form = (
    await findByRole(body, "button", { name: "Generate recovery code" })
  ).closest("form");
  fill(form, "Current password", password);
  fireEvent.submit(form);
  await wait(() => assert(body.querySelector(".recovery-code code")));
  const code = body.querySelector(".recovery-code code").textContent;
  assert.match(code, /^[a-f0-9]{48}$/);
  await click(body, "I saved my code");
  form = getByRole(body, "button", {
    name: "Change password",
    exact: true,
  }).closest("form");
  fill(form, "Current password", password);
  fill(form, "New password", "A-new-community-password-55");
  fireEvent.submit(form);
  await findByText(
    body,
    "Password changed. Other sessions have been signed out.",
    {},
    { timeout: 10000 },
  );
  await click(body, "Download my writing");
  await wait(() => assert(downloaded));
  await click(body, "Account menu");
  await click(body, "Sign out");
  await findByText(body, "You have signed out.", {}, { timeout: 10000 });
  await wait(() => assert.equal(dom.window.location.hash, "#explore"));
  await click(body, "Account menu");
  await click(body, "Sign in / Register");
  let dialog = await findByRole(body, "dialog");
  await click(dialog, "Forgot password?");
  dialog = await findByRole(body, "dialog");
  fill(dialog, "Email address", emails[1]);
  fill(dialog, "Recovery code", code);
  fill(dialog, "New password", password);
  fireEvent.submit(
    getByRole(dialog, "button", {
      name: "Reset password",
      exact: true,
    }).closest("form"),
  );
  await findByText(
    dialog,
    "Password reset. Sign in with your new password.",
    {},
    { timeout: 10000 },
  );
  await click(dialog, "Back to sign in");
  dialog = await findByRole(body, "dialog");
  fill(dialog, "Email address", emails[1]);
  fill(dialog, "Password", password);
  fireEvent.submit(
    getByRole(dialog, "button", { name: "Sign in", exact: true }).closest(
      "form",
    ),
  );
  await wait(() => assert(!body.querySelector('[role="dialog"]')));
  dom.window.location.hash = "settings";
  await findByText(body, "No recovery code yet.", {}, { timeout: 10000 });
  await click(body, "Delete account");
  await click(body, "Cancel");
  assert.equal(body.querySelector('input[name="confirmation"]'), null);
  await click(body, "Delete account");
  form = getByRole(body, "button", {
    name: "Permanently delete account",
  }).closest("form");
  fill(form, "Current password", password);
  fill(form, "Type DELETE to confirm.", "DELETE");
  fireEvent.submit(form);
  await findByText(body, "Account deleted.", {}, { timeout: 10000 });
  assert.equal(dom.window.location.hash, "#explore");
  assert.deepEqual(errors, []);
});
