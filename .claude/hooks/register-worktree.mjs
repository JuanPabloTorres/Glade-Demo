import { basename, resolve } from "node:path";
import { readJson, readStdinJson, withStateLock, worktreeRegistryPath, writeJson } from "../../scripts/agent/common.mjs";

const action = process.argv[2];
const input = await readStdinJson();
const path = input.worktree_path || input.path;
if (!path) process.exit(0);
const branch = input.branch ?? null;

// Read-modify-write on a file every concurrent checkout also writes. Without
// the lock, two worktrees created seconds apart each read the same registry
// and the second write erased the first registration — which is why
// worktrees.json listed two of the four checkouts that actually existed.
withStateLock("worktrees", () => {
  const registry = readJson(worktreeRegistryPath(), { worktrees: [] });
  const key = basename(resolve(path));
  const others = (registry.worktrees ?? []).filter((entry) => basename(resolve(String(entry.path ?? ""))) !== key);
  if (action === "create") {
    const previous = (registry.worktrees ?? []).find((entry) => basename(resolve(String(entry.path ?? ""))) === key);
    // Re-registering keeps the original metadata: a second create event must
    // not reset taskId/baseSha recorded when the worktree was first claimed.
    registry.worktrees = [...others, { ...(previous ?? {}), key, path: resolve(path), branch: branch ?? previous?.branch ?? null, source: previous?.source ?? "claude-hook", createdAt: previous?.createdAt ?? new Date().toISOString() }];
  } else if (action === "remove") {
    // The registration is dropped, never the directory — removal of the
    // checkout itself is git's job and is gated in validate-command.mjs.
    registry.worktrees = others;
  }
  writeJson(worktreeRegistryPath(), registry);
});
