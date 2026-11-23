import { execFileSync } from "node:child_process";
export function verificationFixture(email, action = "read") {
  return execFileSync(
    process.env.UNSAID_PHP || "php",
    [
      "tests/verification-fixture.php",
      `--email=${email}`,
      `--action=${action}`,
    ],
    { encoding: "utf8", windowsHide: true },
  );
}
export function verificationCode(email) {
  return JSON.parse(verificationFixture(email)).code;
}
