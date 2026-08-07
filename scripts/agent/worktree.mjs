import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { git, parseArgs, readJson, root, run, withStateLock, worktreeRegistryPath, writeJson } from "./common.mjs";
import { liveWorktrees } from "./parallel.mjs";

const args = parseArgs();
const [command = "list", id, branch] = args._;
const keyOf = (path) => basename(resolve(String(path)));

function updateRegistry(mutate) {
  return withStateLock("worktrees", () => {
    const registry = readJson(worktreeRegistryPath(), { worktrees: [] });
    registry.worktrees = registry.worktrees ?? [];
    const result = mutate(registry);
    writeJson(worktreeRegistryPath(), registry);
    return result;
  });
}

if (command === "list") {
  console.log(JSON.stringify(readJson(worktreeRegistryPath(), { worktrees: [] }), null, 2));
} else if (command === "create") {
  if (!id || !branch) throw new Error("Usage: worktree.mjs create <task-id> <branch> [--path path] [--base main]");
  // The old guard required a clean primary checkout. That is backwards for
  // parallel work: the moment one agent has uncommitted changes, nobody else
  // can open an isolated checkout, so the second agent works in the first
  // one's tree — the collision this tooling exists to prevent. `git worktree
  // add` does not touch the current working tree, so there is nothing to
  // protect here.
  const path = resolve(args.path || resolve(root, "..", `${basename(root)}-${id}`));
  if (existsSync(path)) throw new Error(`Path exists: ${path}`);
  const base = args.base || "main";
  run("git", ["worktree", "add", "-b", branch, path, base]);
  updateRegistry((registry) => {
    registry.worktrees = [
      ...registry.worktrees.filter((entry) => keyOf(entry.path) !== keyOf(path)),
      { key: keyOf(path), taskId: id, branch, path, baseBranch: base, baseSha: git(["rev-parse", base]), source: "agent:worktree", createdAt: new Date().toISOString() },
    ];
  });
  console.log(`Created ${path} on ${branch} from ${base}.`);
  console.log(`Next: cd into it and run /start-change so this checkout registers its own task manifest and path claims.`);
} else if (command === "sync") {
  // Reconciles the registry with what git actually has. Purely additive for
  // checkouts that exist: entries are corrected or added, never dropped for a
  // live worktree, because the registry is also how agents discover each
  // other.
  const report = updateRegistry((registry) => {
    const known = new Map(registry.worktrees.map((entry) => [keyOf(entry.path), entry]));
    const live = liveWorktrees();
    const added = [];
    for (const worktree of live) {
      const previous = known.get(worktree.key);
      if (!previous) added.push(worktree.key);
      known.set(worktree.key, { ...(previous ?? {}), key: worktree.key, path: worktree.path, branch: worktree.branch || previous?.branch || null, taskId: previous?.taskId ?? null, source: previous?.source ?? "sync", createdAt: previous?.createdAt ?? new Date().toISOString() });
    }
    const liveKeys = new Set(live.map((worktree) => worktree.key));
    const gone = [...known.keys()].filter((key) => !liveKeys.has(key));
    registry.worktrees = [...known.values()].map((entry) => (liveKeys.has(keyOf(entry.path)) ? entry : { ...entry, missing: true }));
    return { added, gone };
  });
  console.log(`Registry synced. Added: ${report.added.length ? report.added.join(", ") : "none"}. Marked missing: ${report.gone.length ? report.gone.join(", ") : "none"}.`);
} else if (command === "remove") {
  if (!id) throw new Error("Usage: worktree.mjs remove <task-id>");
  const registry = readJson(worktreeRegistryPath(), { worktrees: [] });
  const entry = (registry.worktrees ?? []).find((item) => item.taskId === id || item.key === id);
  if (!entry) throw new Error(`Unknown worktree ${id}. Run npm run agent:worktree sync to refresh the registry.`);
  const status = git(["-C", entry.path, "status", "--short"]);
  if (status) throw new Error(`Worktree ${entry.path} has uncommitted changes:\n${status}\nCommit them or run npm run agent:snapshot first. This command never deletes unsaved work.`);
  const unmerged = git(["-C", entry.path, "log", "--oneline", "main..HEAD"]);
  if (unmerged) throw new Error(`Worktree ${entry.path} still has commits that are not in main:\n${unmerged}\nIntegrate the branch before removing the checkout.`);
  run("git", ["worktree", "remove", entry.path]);
  updateRegistry((current) => {
    current.worktrees = current.worktrees.filter((item) => keyOf(item.path) !== keyOf(entry.path));
  });
  console.log(`Removed ${entry.path}.`);
} else throw new Error("Usage: worktree.mjs <list|create|sync|remove>");
