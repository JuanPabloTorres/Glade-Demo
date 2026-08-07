import { currentBranch, deny, loadActiveTask, matchesGlob, readStdinJson, repoRelative, worktreeRootFor } from "../../scripts/agent/common.mjs";
const input = await readStdinJson();
const rawPath = input.tool_input?.file_path || input.tool_input?.path || input.file_path || input.path;
if (!rawPath) deny("Unable to determine edited path.");
// Everything below resolves against the checkout the edited file lives in,
// not the primary worktree. Resolving against the primary made the governed
// workflow impossible inside linked worktrees — the exact setup rule
// 01-git-delivery requires for parallel work — because every path came out
// as `../Glade-Demo-<task>/…` and matched no ownership glob, and because a
// single shared active-task.json meant concurrent worktrees overwrote each
// other's manifests. See worktreeRootFor / activeTaskPath in common.mjs.
const worktree = worktreeRootFor(rawPath);
if (currentBranch(worktree) === "main") deny("Main is read-only. Create a governed branch/worktree before editing.");
const task = loadActiveTask(rawPath);
if (!task) deny("No active task manifest for this worktree. Run /start-change before editing.");
const path = repoRelative(rawPath);
const owned = task.ownedPaths.some((pattern) => matchesGlob(pattern, path));
const shared = task.sharedPaths.some((pattern) => matchesGlob(pattern, path));
if (!owned && !shared) deny(`${path} is outside task ${task.taskId} ownership.`);
if (["VERSION", "RELEASE_NOTES.md"].includes(path) && task.versionStrategy.owner !== "integration-manager") deny(`${path} is controlled by integration-manager.`);
if (/\.env($|\.)/.test(path) && path !== ".env.example") deny("Do not write local secrets through an agent.");
