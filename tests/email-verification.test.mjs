import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  verificationCode,
  verificationFixture,
} from "./verification-helper.mjs";

class Client {
  cookie = "";
  csrf = "";
  async call(path, method = "GET", body, withCsrf = true) {
    const res = await fetch(`http://127.0.0.1:8001/api/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookie,
        ...(withCsrf ? { "X-CSRF-Token": this.csrf } : {}),
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
    return { status: res.status, data };
  }
}
test("signup requires emailed OTP: isolation, expiry, resend, attempt limits and one-time verification", async (t) => {
  const a = new Client(),
    b = new Client();
  const stamp = Date.now();
  const email = `test-a-${stamp}@unsaid.invalid`,
    second = `test-b-${stamp}@unsaid.invalid`;
  const password = "Verified-signup-password-42";
  t.after(() => {
    for (const address of [email, second])
      execFileSync("php", ["tests/cleanup.php", `--email=${address}`]);
  });
  await a.call("session");
  await b.call("session");
  assert.equal(
    (await a.call("register", "POST", { email, password }, false)).status,
    403,
  );
  const start = await a.call("register", "POST", {
    email,
    password,
    language: "my",
  });
  assert.equal(start.status, 202);
  assert.equal(start.data.verification_required, true);
  assert.equal(start.data.expires_in, 600);
  assert.equal(start.data.resend_after, 60);
  const code = verificationCode(email);
  assert.match(code, /^[0-9]{6}$/);
  assert.equal(JSON.stringify(start.data).includes(code), false);
  let inspection = JSON.parse(verificationFixture(email, "inspect"));
  assert.equal(inspection.users.length, 0);
  assert.equal(inspection.pending.length, 1);
  assert.notEqual(inspection.pending[0].code_hash, code);
  assert.equal((await a.call("session")).data.user, null);
  assert.equal(
    (await a.call("login", "POST", { email, password })).status,
    401,
  );
  assert.equal((await a.call("posts?scope=journal")).status, 401);
  assert.equal(
    (await b.call("register/verify", "POST", { code })).status,
    400,
    "another session cannot use the code",
  );
  assert.equal(
    (await a.call("register/verify", "POST", { code }, false)).status,
    403,
  );
  assert.equal((await a.call("register/resend", "POST")).status, 429);
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await a.call("register/verify", "POST", { code: "000000" })).status,
      400,
    );
  assert.equal((await a.call("register/verify", "POST", { code })).status, 429);
  inspection = JSON.parse(verificationFixture(email, "inspect"));
  assert.equal(inspection.pending[0].attempts, 5);
  verificationFixture(email, "resend-ready");
  assert.equal((await a.call("register/resend", "POST")).status, 202);
  const replacement = verificationCode(email);
  assert.notEqual(replacement, code);
  assert.equal((await a.call("register/verify", "POST", { code })).status, 400);
  const csrfBefore = a.csrf,
    cookieBefore = a.cookie;
  assert.equal(
    (await a.call("register/verify", "POST", { code: replacement })).status,
    201,
  );
  assert.notEqual(a.csrf, csrfBefore);
  assert.notEqual(a.cookie, cookieBefore);
  const session = (await a.call("session")).data;
  assert.equal(session.user.email, email);
  assert.equal(session.user.language, "my");
  inspection = JSON.parse(verificationFixture(email, "inspect"));
  assert.equal(inspection.pending.length, 0);
  assert(inspection.users[0].email_verified_at);
  assert.equal((await a.call("preferences")).data.categories.length, 5);
  assert.equal(
    (await a.call("register/verify", "POST", { code: replacement })).status,
    400,
  );
  assert.equal(
    (await b.call("register", "POST", { email, password })).status,
    409,
  );
  assert.equal(
    (await b.call("register", "POST", { email: second, password })).status,
    202,
  );
  verificationFixture(second, "expire");
  assert.equal(
    (
      await b.call("register/verify", "POST", {
        code: verificationCode(second),
      })
    ).status,
    400,
  );
  verificationFixture(second, "resend-ready");
  assert.equal((await b.call("register/resend", "POST")).status, 202);
  assert.equal(
    (
      await b.call("register/verify", "POST", {
        code: verificationCode(second),
      })
    ).status,
    201,
  );
});

test("SMTP dependency is installed and insecure mail transports are rejected", () => {
  const result = execFileSync(
    "php",
    [
      "-r",
      `require 'vendor/autoload.php'; require 'server/signup.php'; $cfg=['dsn'=>'not-the-test-instance']; $checks=[class_exists('PHPMailer\\PHPMailer\\PHPMailer')]; foreach(['none','test'] as $transport) { try { signup_mail('fixture@example.invalid','123456',['transport'=>$transport]); $checks[]=false; } catch(Throwable $e) { $checks[]=true; } } echo json_encode($checks);`,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.deepEqual(JSON.parse(result), [true, true, true]);
});
