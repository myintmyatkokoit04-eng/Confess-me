import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "vite";
import { JSDOM } from "jsdom";
import { ja } from "../src/japanese.js";
import { my } from "../src/translations.js";
import { translateUI } from "../src/translations.js";

test("language switching preserves originals, translates on consent, toggles and discards stale results", async (t) => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const post = {
    id: 42,
    body: "An original public thought.",
    category_id: 1,
    category: "Family",
    response: "Just listening",
    visibility: "public",
    status: "published",
    hidden: false,
    is_owner: false,
    saved: false,
    reactions: [],
    safety_signals: ["money_request"],
    created_at: "2026-10-01 00:00:00",
  };
  const calls = [];
  let pending = null,
    fail = false;
  dom.window.fetch = async (path, options) => {
    calls.push({ path, options });
    let data = { ok: true };
    if (path === "/api/session")
      data = {
        csrf: "test-token",
        user: {
          email: "fixture@example.invalid",
          language: "en",
          is_admin: false,
        },
      };
    else if (path === "/api/preferences")
      data = { categories: [1, 2, 3, 4, 5] };
    else if (path.startsWith("/api/posts?"))
      data = {
        posts: [
          path.includes("scope=journal")
            ? { ...post, visibility: "private", is_owner: true }
            : post,
        ],
        has_more: false,
      };
    else if (path.endsWith("/translate")) {
      if (fail)
        return {
          ok: false,
          json: async () => ({
            error:
              "Translation is not configured yet. Ask the site operator to set up Google Cloud Translation.",
          }),
        };
      return new Promise((resolve) => {
        pending = () =>
          resolve({
            ok: true,
            json: async () => ({
              translated_text: "ဘာသာပြန်ထားသောစာ။",
              target: "my",
            }),
          });
      });
    }
    return { ok: true, json: async () => data };
  };
  const bundle = await build({
    configFile: false,
    publicDir: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      write: false,
      lib: { entry: "src/main.jsx", name: "LanguageTest", formats: ["iife"] },
    },
  });
  const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
  dom.window.eval(output.find((x) => x.type === "chunk").code);
  const { getByRole, findByRole, findByText, queryByText, fireEvent, waitFor } =
    await import("@testing-library/dom");
  const body = dom.window.document.body;
  const wait = (fn) => waitFor(fn, { container: body, timeout: 5000 });
  console.log("Language check: waiting for original");
  await findByText(body, post.body);
  await findByRole(body, "complementary", { name: "Safety reminder" });
  fireEvent.change(getByRole(body, "combobox", { name: "App language" }), {
    target: { value: "my" },
  });
  console.log("Language check: switch");
  await findByRole(body, "complementary", { name: "လုံခြုံရေး သတိပေးချက်" });
  const button = await findByRole(body, "button", {
    name: "ဘာသာပြန်ရန် · မြန်မာ",
  });
  assert(queryByText(body, post.body));
  fireEvent.click(button);
  await findByText(
    body,
    "ရွေးထားသော ဤစာသားကိုသာ Google Cloud Translation သို့ ပို့ပါမယ်။",
  );
  assert.equal(
    calls.filter((x) => x.path.endsWith("/translate")).length,
    0,
    "no external request before consent",
  );
  fireEvent.click(
    getByRole(body, "button", { name: "ဘာသာပြန်ရန်", exact: true }),
  );
  console.log("Language check: consent");
  await wait(() => assert(pending));
  pending();
  pending = null;
  await findByText(body, "ဘာသာပြန်ထားသောစာ။");
  const request = calls.find((x) => x.path.endsWith("/translate"));
  assert.equal(request.path, "/api/posts/42/translate");
  assert.deepEqual(JSON.parse(request.options.body), { target: "my" });
  fireEvent.click(getByRole(body, "button", { name: "မူရင်းကြည့်ရန်" }));
  await findByText(body, post.body);
  fireEvent.click(getByRole(body, "button", { name: "ဘာသာပြန်ကြည့်ရန်" }));
  await findByText(body, "ဘာသာပြန်ထားသောစာ။");
  assert.equal(
    calls.filter((x) => x.path.endsWith("/translate")).length,
    1,
    "toggling reuses the result",
  );
  fireEvent.change(getByRole(body, "combobox", { name: "အက်ပ်ဘာသာစကား" }), {
    target: { value: "ja" },
  });
  await findByText(body, post.body);
  fireEvent.click(getByRole(body, "button", { name: "翻訳する · 日本語" }));
  await findByRole(body, "complementary", { name: "安全のための注意" });
  await findByRole(body, "button", { name: "翻訳する", exact: true });
  fireEvent.click(getByRole(body, "button", { name: "翻訳する", exact: true }));
  await wait(() => assert(pending));
  assert.deepEqual(
    JSON.parse(
      calls.filter((x) => x.path.endsWith("/translate")).at(-1).options.body,
    ),
    { target: "ja" },
  );
  assert.equal(dom.window.document.documentElement.lang, "ja");
  assert.equal(dom.window.localStorage.getItem("unsaid-language"), "ja");
  fireEvent.change(getByRole(body, "combobox", { name: "アプリの言語" }), {
    target: { value: "my" },
  });
  await findByRole(body, "button", { name: "ဘာသာပြန်ရန် · မြန်မာ" });
  pending();
  pending = null;
  await wait(() => assert(!queryByText(body, "ဘာသာပြန်ထားသောစာ။")));
  console.log("Language check: stale result");
  fail = true;
  fireEvent.click(getByRole(body, "button", { name: "ဘာသာပြန်ရန် · မြန်မာ" }));
  await findByRole(body, "button", { name: "ဘာသာပြန်ရန်", exact: true });
  fireEvent.click(
    getByRole(body, "button", { name: "ဘာသာပြန်ရန်", exact: true }),
  );
  await findByRole(body, "alert");
  assert(queryByText(body, post.body));
  console.log("Language check: journal");
  dom.window.location.hash = "journal";
  await findByText(body, "သင်သာ ဖတ်နိုင်သည်");
  assert(
    !body.querySelector(".safety-notice"),
    "private entries have no safety warning",
  );
  assert(
    !body.querySelector(".translation-controls"),
    "private journal has no translation controls",
  );
  assert.equal(translateUI("Family", "my"), "မိသားစု");
  assert.equal(translateUI("Family", "en"), "Family");
});

test("Japanese covers all interface messages", () => {
  assert.deepEqual(Object.keys(ja).sort(), Object.keys(my).sort());
  assert.equal(translateUI("Family", "ja"), "家族");
  assert.equal(translateUI("3 hours ago", "ja"), "3時間前");
});
