/**
 * The release gate, judged by exit code.
 *
 * This exists because a suite reported green while its process exited 1. Vitest
 * printed "Tests 143 passed (143)" and returned a non-zero status, because an
 * unhandled error had been raised outside any named test — a `TypeError` thrown
 * from a click handler into Vitest's unhandled-error channel. Reading the
 * summary was enough to ship it; reading the status would not have been.
 *
 * So the rule here is mechanical and has no exceptions: **a gate passes only
 * when its command exits 0.** Nothing in this file parses output, counts tests
 * or looks for the word "passed". If a tool can print a perfect summary and
 * fail, only the status distinguishes them.
 *
 * Every gate runs even after one fails, and the summary at the end lists each
 * one with its real exit code — because "which gate failed" is the first thing
 * anyone asks, and stopping at the first failure hides the other four.
 *
 * Usage:
 *   node scripts/agent/release-verify.mjs           every gate
 *   node scripts/agent/release-verify.mjs --quick   everything except Playwright
 */

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root } from "./common.mjs";

const quick = process.argv.includes("--quick");
const isWindows = process.platform === "win32";

/**
 * A port nothing is listening on, asked of the OS rather than guessed.
 *
 * Eight checkouts of this repository can be live at once, each able to hold a
 * dev server. A hardcoded port is how a release run ends up asserting against
 * another branch's build — which happened: a run reported four language
 * failures that were a sibling worktree's server answering on the port
 * Playwright picked.
 */
function freePort() {
  // `listen` is asynchronous: reading `address()` on the next line returns
  // null, which is how the first version of this crashed. Awaited, so the OS
  // has actually bound something before the port is read — and closed
  // afterwards, so the server that follows can take it.
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

const version = readFileSync(resolve(root, "VERSION"), "utf8").trim();

/**
 * The gates, in the order a failure is cheapest to act on.
 *
 * Governance first: a fleet conflict means another checkout is diverging on
 * these files, and nothing measured afterwards describes the tree that will
 * ship. Types and lint before tests, because a type error fails every suite
 * downstream and says less about why.
 */
const gates = [
  ["governance", "node", ["scripts/agent/fleet.mjs", "--strict"], root],
  ["architecture", "node", ["scripts/agent/architecture-check.mjs"], root],
  ["flowbite", "node", ["scripts/agent/flowbite-check.mjs"], root],
  ["version", "npm", ["run", "version:check"], root],
  ["i18n", "npm", ["--prefix", "frontend", "run", "i18n:check"], root],
  ["backend lint", "uv", ["run", "ruff", "check", "."], resolve(root, "backend")],
  ["backend types", "uv", ["run", "mypy", "app"], resolve(root, "backend")],
  ["backend tests", "uv", ["run", "pytest"], resolve(root, "backend")],
  ["frontend lint", "npm", ["--prefix", "frontend", "run", "lint"], root],
  ["frontend tests", "npm", ["--prefix", "frontend", "run", "test", "--", "--run"], root],
  ["build", "npm", ["--prefix", "frontend", "run", "build"], root],
];

if (!quick) {
  const webPort = await freePort();
  const apiPort = await freePort();
  gates.push([
    "playwright",
    "npx",
    ["playwright", "test"],
    resolve(root, "frontend"),
    {
      // Release regression never reuses a server. `reuseExistingServer` is a
      // local-development convenience and a release hazard: it silently accepts
      // whatever is already answering on the port, including another
      // checkout's build.
      E2E_RELEASE: "1",
      E2E_WEB_PORT: String(webPort),
      E2E_API_PORT: String(apiPort),
      // Checked by the Playwright global setup against the served build, so an
      // assertion never runs against a bundle from a different tree.
      E2E_EXPECTED_VERSION: version,
    },
  ]);
}

const results = [];
for (const [name, command, args, cwd, env] of gates) {
  console.log(`\n[1m── ${name}[0m  ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    // `shell` on Windows because npm/npx/uv are .cmd shims there. Elsewhere it
    // is off, so an argument is never re-parsed by a shell.
    shell: isWindows,
    env: env ? { ...process.env, ...env } : process.env,
  });
  // A signal (or a shim that never launched) leaves `status` null. Treated as a
  // failure rather than coerced to 0 — an unknown outcome is not a pass.
  const code = result.status ?? (result.error ? 1 : 1);
  results.push({ name, code });
}

console.log(`\n[1mRelease gate — FreshStart ${version}[0m`);
for (const { name, code } of results) {
  const mark = code === 0 ? "[32mPASS[0m" : "[31mFAIL[0m";
  console.log(`  ${mark}  ${name.padEnd(16)} exit ${code}`);
}

const failed = results.filter((entry) => entry.code !== 0);
if (failed.length) {
  console.error(
    `\nRELEASE GATE = FAIL — ${failed.map((entry) => entry.name).join(", ")}. ` +
      "A gate that printed a passing summary and exited non-zero is still a failure.",
  );
  process.exit(1);
}
console.log("\nRELEASE GATE = PASS — every gate exited 0.");
