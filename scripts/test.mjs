import { readdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { promisify } from "node:util";
import { portOpen } from "./start.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
if (
  process.env.UNSAID_TEST_URL &&
  process.env.UNSAID_TEST_URL !== "http://127.0.0.1:8001/api/"
) {
  throw new Error(
    "Integration tests require the isolated local test instance.",
  );
}
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      windowsHide: true,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Test command exited with ${code}`)),
    );
  });
}
// The guarded helper refuses any database other than the isolated development
// instance. Reset between suites so test registrations don't exhaust production
// authentication limits. No production limits are relaxed.
const php = process.env.UNSAID_PHP || "php";
const { stdout: modules } = await promisify(execFile)(php, ["-m"], {
  windowsHide: true,
});
const missing = ["pdo_mysql", "mbstring", "openssl"].filter(
  (name) => !modules.split(/\r?\n/).includes(name),
);
let iniDir;
let apiServer;
try {
  // Child Node suites also invoke PHP for cleanup. Let all descendants use the
  // required modules without changing the machine's php.ini.
  if (missing.length) {
    iniDir = await mkdtemp(join(tmpdir(), "unsaid-test-php-"));
    await writeFile(
      join(iniDir, "extensions.ini"),
      missing.map((name) => `extension=${name}`).join("\n"),
    );
    process.env.PHP_INI_SCAN_DIR = `${process.env.PHP_INI_SCAN_DIR || ""}${delimiter}${iniDir}`;
  }
  await run(php, ["tests/reset-local.php", "--confirm"]);
  if (await portOpen("127.0.0.1", 8001))
    throw new Error(
      "Test API port 8001 is occupied. Refusing to reuse another server.",
    );
  apiServer = spawn(
    php,
    ["-S", "127.0.0.1:8001", "-t", "public", "server/router.php"],
    {
      cwd: root,
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
      env: { ...process.env, UNSAID_TEST_MAIL: "1" },
    },
  );
  let launchError;
  apiServer.on("error", (error) => {
    launchError = error;
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    if (apiServer.exitCode !== null)
      throw new Error("The test PHP server exited before becoming ready.");
    try {
      const res = await fetch("http://127.0.0.1:8001/api/session", {
        signal: AbortSignal.timeout(500),
      });
      ready = res.ok && res.headers.get("X-Unsaid-App") === "1";
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready)
    throw new Error("The isolated test PHP server did not become ready.");
  for (const file of (await readdir(new URL("../tests/", import.meta.url)))
    .filter((file) => file.endsWith(".test.mjs"))
    .filter(
      (file) =>
        !process.argv.slice(2).length || process.argv.slice(2).includes(file),
    )
    .sort()) {
    await run(process.env.UNSAID_PHP || "php", [
      "tests/reset-local.php",
      "--confirm",
    ]);
    await run(process.execPath, ["--test", `tests/${file}`]);
  }
} finally {
  if (apiServer && apiServer.exitCode === null) {
    apiServer.kill();
    await new Promise((resolve) => apiServer.once("exit", resolve));
  }
  if (iniDir) await rm(iniDir, { recursive: true, force: true });
}
