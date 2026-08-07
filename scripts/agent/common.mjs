import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

export const root = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

export function git(args, options = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
}

/**
 * Resolve which checkout a path belongs to.
 *
 * `root` is the primary worktree (CLAUDE_PROJECT_DIR). Rule 01-git-delivery
 * mandates worktrees for parallel work, but every path helper below used to
 * resolve against `root` unconditionally — so a file inside a linked
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

/**
 * Path to the active task manifest **for one checkout**.
 *
 * Was a single `active-task.json` under the shared git common dir, which
 * meant N concurrent worktrees fought over one file: registering a task in
 * one worktree silently replaced the active task of every other, and the
 * ownership hooks then denied edits in the worktree whose task had just been
 * overwritten. Now keyed by worktree directory name, so each checkout owns
 * its own manifest and `tasks/` stays the shared archive.
 *
 * The legacy single-file location is still read (never written) when no
 * per-worktree manifest exists yet, so a task registered before this change
 * keeps working instead of vanishing mid-flight.
 */
export function activeTaskPath(forPath = root) {
  const worktree = worktreeRootFor(forPath);
  const dir = resolve(stateDir(), "active");
  mkdirSync(dir, { recursive: true });
  return resolve(dir, `${basename(worktree)}.json`);
}

export function legacyActiveTaskPath() { return resolve(stateDir(), "active-task.json"); }
export function worktreeRegistryPath() { return resolve(stateDir(), "worktrees.json"); }

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
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

export function matchesGlob(pattern, filePath) {
  const candidate = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const glob = pattern.replaceAll("\\", "/").replace(/^\.\//, "");
  if (glob === "**") return true;
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    if (glob[index] === "*" && glob[index + 1] === "*") { source += ".*"; index += 1; }
    else if (glob[index] === "*") source += "[^/]*";
    else source += escapeCharacter(glob[index]);
  }
  return new RegExp(`^${source}$`).test(candidate);
}

export function repoRelative(filePath) {
  // Relative to the checkout the file actually lives in, not always the
  // primary one — otherwise every path inside a linked worktree comes out as
  // `../Glade-Demo-<task>/…` and matches no ownership glob.
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

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
