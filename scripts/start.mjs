import { spawn, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import net from "node:net";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const php = process.env.UNSAID_PHP || "php";
const phpArgs = [];
const owned = [];
let stopping = false;
const checkOnly = process.argv.includes("--check");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const options = { cwd: root, windowsHide: true };

export function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500);
    socket.on("connect", () => finish(true));
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
  });
}

async function isUnsaid(kind) {
  try {
    const url =
      kind === "PHP"
        ? "http://127.0.0.1:8000/api/session"
        : "http://127.0.0.1:5173/";
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (kind === "PHP") return response.headers.get("X-Unsaid-App") === "1";
    return response.ok && /<title>Unsaid\s*[—–-]/.test(await response.text());
  } catch {
    return false;
  }
}

function launch(name, executable, args) {
  const child = spawn(executable, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const item = { name, child };
  owned.push(item);
  child.stdout.on("data", (chunk) =>
    process.stdout.write(`[${name}] ${chunk}`),
  );
  child.stderr.on("data", (chunk) =>
    process.stderr.write(`[${name}] ${chunk}`),
  );
  child.on("error", (error) => {
    item.failed = `${name} could not start: ${error.code || error.message}`;
  });
  child.on("exit", (code) => {
    item.exited = true;
    if (!stopping) {
      console.error(`\n${name} stopped (exit ${code}).`);
      void stop(1);
    }
  });
  return item;
}

async function ready(name, check, item, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (item?.failed) throw new Error(item.failed);
    if (item?.exited || stopping)
      throw new Error(`${name} stopped before it was ready.`);
    if (await check()) return;
    await sleep(250);
  }
  throw new Error(`${name} did not become ready. Review the messages above.`);
}

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping services started by this command…");
  for (const item of owned.filter((x) => x.name !== "MySQL")) {
    if (!item.exited) item.child.kill();
  }
  const mysql = owned.find((x) => x.name === "MySQL" && !x.exited);
  if (mysql) {
    // Only our disposable, loopback instance is auto-started. Its bootstrap root
    // account is local-only. Shutdown gracefully; never kill another DB process.
    try {
      await run(
        join(
          dirname(mysql.executable),
          process.platform === "win32" ? "mysqladmin.exe" : "mysqladmin",
        ),
        [
          "--no-defaults",
          "--host=127.0.0.1",
          "--port=33317",
          "--user=root",
          "--connect-timeout=5",
          "shutdown",
        ],
        { ...options, timeout: 15000 },
      );
    } catch {
      console.error(
        "MySQL could not be stopped gracefully; it remains running. No database process was forcefully killed.",
      );
    }
  }
  process.exit(code);
}

async function main() {
  const { stdout: modules } = await run(php, ["-m"], options);
  for (const extension of ["pdo_mysql", "mbstring", "openssl"]) {
    if (!modules.split(/\r?\n/).some((name) => name.trim().toLowerCase() === extension)) {
      phpArgs.push("-d", `extension=${extension}`);
    }
  }
  if (!existsSync(join(root, "node_modules/vite/bin/vite.js")))
    throw new Error(
      "Dependencies are missing. Run npm install once, then npm start.",
    );
  const { stdout } = await run(php, [...phpArgs, "scripts/dev-info.php"], options);
  const database = JSON.parse(stdout);
  if (!(await portOpen(database.host, database.port))) {
    if (checkOnly)
      throw new Error(
        "MySQL is not running. Use npm start to start the configured local instance.",
      );
    const data = join(root, ".runtime/mysql-data");
    if (
      !["127.0.0.1", "localhost"].includes(database.host) ||
      database.port !== 33317 ||
      !existsSync(join(data, "auto.cnf"))
    ) {
      throw new Error(
        "Start your configured MySQL/XAMPP service first. Automatic startup only supports this project’s existing local database on port 33317.",
      );
    }
    const mysqld =
      process.env.UNSAID_MYSQLD ||
      join(
        process.env.ProgramFiles || "C:/Program Files",
        "MySQL/MySQL Server 8.4/bin/mysqld.exe",
      );
    if (!existsSync(mysqld))
      throw new Error(
        "MySQL executable not found. Set UNSAID_MYSQLD to the full path of mysqld.exe.",
      );
    console.log("Starting the existing Unsaid development database…");
    const item = launch("MySQL", mysqld, [
      "--no-defaults",
      `--datadir=${data}`,
      "--port=33317",
      "--bind-address=127.0.0.1",
      "--mysqlx=0",
      "--console",
    ]);
    item.executable = mysqld;
    await ready("MySQL", () => portOpen("127.0.0.1", 33317), item);
  } else console.log("MySQL is already running; reusing it.");
  await run(php, [...phpArgs, "scripts/dev-info.php", "--check-db"], options);
  for (const [name, port, executable, args] of [
    [
      "PHP",
      8000,
      php,
      [...phpArgs, "-S", "127.0.0.1:8000", "-t", "public", "server/router.php"],
    ],
    [
      "Frontend",
      5173,
      process.execPath,
      [
        join(root, "node_modules/vite/bin/vite.js"),
        "--host",
        "127.0.0.1",
        "--port",
        "5173",
        "--strictPort",
        "--configLoader",
        "runner",
      ],
    ],
  ]) {
    if (await portOpen("127.0.0.1", port)) {
      if (!(await isUnsaid(name)))
        throw new Error(
          `Port ${port} is being used by another app. Close that app or use the documented manual startup.`,
        );
      console.log(`${name} is already running; reusing it.`);
    } else {
      if (checkOnly) throw new Error(`${name} is not running. Use npm start.`);
      const item = launch(name, executable, args);
      await ready(name, () => isUnsaid(name), item);
    }
  }
  console.log("\nUnsaid is ready: http://127.0.0.1:5173/");
  if (checkOnly) return;
  console.log(
    "Keep this terminal open. Press Ctrl+C to stop services started here.",
  );
  console.log("Services that were already running will be left open.");
  // Stay available for Ctrl+C even when all services were reused.
  setInterval(() => {}, 60000);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
  main().catch((error) => {
    console.error(
      `\nUnable to start Unsaid: ${error.stderr?.trim() || error.message}`,
    );
    void stop(1);
  });
}
