import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

export const root = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

export function git(args, options = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
}

/**
 * Resolve which checkout a path belongs to.
 *
 * `root` is the checkout the current process was launched in. Rule
 * 01-git-delivery mandates worktrees for parallel work, but the path helpers
 * used to resolve against `root` unconditionally — so a file inside a linked
 * worktree came out of `repoRelative` as `../Glade-Demo-<task>/backend/...`,
 * matched no `ownedPaths` glob, and was denied. The governed workflow was
 * unusable in exactly the setup the rules require.
 *
 * Walks up to the nearest existing directory first, so a path being created
 * (Write on a new file in a new folder) resolves as well as an existing one.
 */
export function worktreeRootFor(target) {
  if (!target) return root;
  let candidate = resolve(root, target);
  while (!existsSync(candidate)) {
    const parent = dirname(candidate);
    if (parent === candidate) return root;
    candidate = parent;
  }
  const start = statSync(candidate).isDirectory() ? candidate : dirname(candidate);
  try {
    return resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: start, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim());
  } catch {
    return root;
  }
}

/**
 * Stable identifier for a checkout, used to key every per-worktree state file.
 * Worktrees are created as `<repo>-<task-id>`, so the directory name is unique
 * in practice; `fleet.mjs` reports a collision if two checkouts ever share one.
 */
export function worktreeKey(target = root) {
  return basename(worktreeRootFor(target));
}

export function currentBranch(cwd = root) {
  try { return git(["branch", "--show-current"], { cwd }); } catch { return ""; }
}

export function commonDir() {
  const value = git(["rev-parse", "--git-common-dir"]);
  return isAbsolute(value) ? value : resolve(root, value);
}

export function stateDir() {
  const dir = resolve(commonDir(), "claude-state");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function activeDir() {
  const dir = resolve(stateDir(), "active");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Path to the active task manifest **for one checkout**.
 *
 * Was a single `active-task.json` under the shared git common dir, which meant
 * N concurrent worktrees fought over one file: registering a task in one
 * worktree silently replaced the active task of every other, and the ownership
 * hooks then denied edits in the worktree whose task had just been overwritten.
 * Now keyed by checkout, so each one owns its manifest and `tasks/` stays the
 * shared archive.
 *
 * The legacy single-file location is still read (never written) when no
 * per-worktree manifest exists yet, so a task registered before this change
 * keeps working instead of vanishing mid-flight.
 */
export function activeTaskPath(forPath = root) {
  return resolve(activeDir(), `${worktreeKey(forPath)}.json`);
}

export function legacyActiveTaskPath() { return resolve(stateDir(), "active-task.json"); }
export function worktreeRegistryPath() { return resolve(stateDir(), "worktrees.json"); }

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}

/**
 * Write through a temp file and rename.
 *
 * A plain `writeFileSync` on shared state under `.git/claude-state` let a
 * concurrent reader observe a half-written manifest, and two writers racing on
 * the same file interleaved their bytes. `renameSync` is atomic on the same
 * volume, so a reader sees either the old file or the new one.
 */
export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Serialize read-modify-write on shared state across processes.
 *
 * Every governed checkout runs its own node processes against one
 * `.git/claude-state`. Registry updates were read-modify-write with no mutual
 * exclusion, so a worktree registered by one agent disappeared when another
 * wrote the registry it had read moments earlier. `mkdir` is atomic on both
 * NTFS and POSIX, which makes it a usable lock without a dependency.
 *
 * A lock older than `staleMs` is treated as abandoned — a crashed agent must
 * not wedge the whole fleet.
 */
export function withStateLock(name, fn, { timeoutMs = 10000, staleMs = 60000 } = {}) {
  const lock = resolve(stateDir(), "locks", `${name}.lock`);
  mkdirSync(dirname(lock), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let age = 0;
      try { age = Date.now() - statSync(lock).mtimeMs; } catch { continue; }
      if (age > staleMs) { rmSync(lock, { recursive: true, force: true }); continue; }
      if (Date.now() > deadline) throw new Error(`Timed out waiting for the "${name}" state lock. If no agent is running, remove ${lock}.`);
      sleepSync(25);
    }
  }
  try { return fn(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

export function loadActiveTask(forPath = root) {
  return readJson(activeTaskPath(forPath)) ?? readJson(legacyActiveTaskPath());
}

export function parseArgs(argv = process.argv.slice(2)) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) { result._.push(value); continue; }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else { result[key] = next; index += 1; }
  }
  return result;
}

function escapeCharacter(value) { return /[|\\{}()[\]^$+?.]/.test(value) ? `\\${value}` : value; }

function globSource(pattern) {
  const glob = pattern.replaceAll("\\", "/").replace(/^\.\//, "");
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    if (glob[index] === "*" && glob[index + 1] === "*") { source += ".*"; index += 1; }
    else if (glob[index] === "*") source += "[^/]*";
    else source += escapeCharacter(glob[index]);
  }
  return source;
}

export function matchesGlob(pattern, filePath) {
  const candidate = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (pattern.replaceAll("\\", "/") === "**") return true;
  return new RegExp(`^${globSource(pattern)}$`).test(candidate);
}

/**
 * Do two ownership claims describe any file in common?
 *
 * Exact-string comparison is not enough: `frontend/src/**` and
 * `frontend/src/pages/HomePage.tsx` are different strings that collide on
 * every file the second one names. A claim overlaps when either pattern
 * matches the other's literal prefix, which covers the `**`-vs-concrete and
 * `**`-vs-`**` cases that actually occur in task manifests.
 */
export function claimsOverlap(a, b) {
  const left = a.replaceAll("\\", "/").replace(/^\.\//, "");
  const right = b.replaceAll("\\", "/").replace(/^\.\//, "");
  if (left === right) return true;
  const literal = (pattern) => pattern.split("*")[0].replace(/\/$/, "");
  return matchesGlob(left, right) || matchesGlob(right, left)
    || (left.includes("*") && literal(left) !== "" && right.startsWith(`${literal(left)}/`))
    || (right.includes("*") && literal(right) !== "" && left.startsWith(`${literal(right)}/`));
}

export function repoRelative(filePath) {
  // Relative to the checkout the file actually lives in, not always the one
  // this process started in — otherwise every path inside a linked worktree
  // comes out as `../Glade-Demo-<task>/…` and matches no ownership glob.
  const absolute = resolve(root, filePath);
  return relative(worktreeRootFor(absolute), absolute).replaceAll("\\", "/");
}

export async function readStdinJson() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) return {};
  try { return JSON.parse(input); } catch { return {}; }
}

export function deny(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

/** Non-blocking hook signal: the agent sees the text, the tool call proceeds. */
export function warn(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
