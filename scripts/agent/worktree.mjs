import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { git, parseArgs, readJson, root, run, worktreeRegistryPath, writeJson } from "./common.mjs";

const args = parseArgs();
const [command = "list", id, branch] = args._;
const registry = readJson(worktreeRegistryPath(), { worktrees: [] });
if (command === "list") {
  console.log(JSON.stringify(registry, null, 2));
} else if (command === "create") {
  if (!id || !branch) throw new Error("Usage: worktree.mjs create <task-id> <branch> [--path path]");
  if (git(["status", "--short"])) throw new Error("Primary worktree must be clean.");
  const path = resolve(args.path || resolve(root, "..", `${basename(root)}-${id}`));
  if (existsSync(path)) throw new Error(`Path exists: ${path}`);
  run("git", ["worktree", "add", "-b", branch, path, "main"]);
  registry.worktrees.push({ taskId: id, branch, path, baseSha: git(["rev-parse", "main"]), createdAt: new Date().toISOString() });
  writeJson(worktreeRegistryPath(), registry);
  console.log(`Created ${path}`);
} else if (command === "remove") {
  if (!id) throw new Error("Usage: worktree.mjs remove <task-id>");
  const entry = registry.worktrees.find((item) => item.taskId === id);
  if (!entry) throw new Error(`Unknown worktree ${id}`);
  const status = git(["-C", entry.path, "status", "--short"]);
  if (status) throw new Error(`Worktree ${entry.path} has uncommitted changes.`);
  run("git", ["worktree", "remove", entry.path]);
  registry.worktrees = registry.worktrees.filter((item) => item.taskId !== id);
  writeJson(worktreeRegistryPath(), registry);
} else throw new Error("Usage: worktree.mjs <list|create|remove>");
