import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export const root = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

export function git(args, options = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
}

export function currentBranch() {
  try { return git(["branch", "--show-current"]); } catch { return ""; }
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

export function activeTaskPath() { return resolve(stateDir(), "active-task.json"); }
export function worktreeRegistryPath() { return resolve(stateDir(), "worktrees.json"); }

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function loadActiveTask() { return readJson(activeTaskPath()); }

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
  return relative(root, resolve(root, filePath)).replaceAll("\\", "/");
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
