import { currentBranch, deny, loadActiveTask, matchesGlob, readStdinJson, repoRelative, warn, worktreeKey, worktreeRootFor } from "../../scripts/agent/common.mjs";
import { foreignClaimants, foreignEditors } from "../../scripts/agent/parallel.mjs";

const input = await readStdinJson();
const rawPath = input.tool_input?.file_path || input.tool_input?.path || input.file_path || input.path;
if (!rawPath) deny("Unable to determine edited path.");

// Everything below resolves against the checkout the edited file lives in, not
// the one this hook was launched from. Resolving against the launching
// checkout made the governed workflow impossible inside linked worktrees — the
// exact setup rule 01-git-delivery requires for parallel work — because every
// path came out as `../Glade-Demo-<task>/…` and matched no ownership glob, and
// because a single shared active-task.json meant concurrent worktrees
// overwrote each other's manifests. See worktreeRootFor / activeTaskPath.
const worktree = worktreeRootFor(rawPath);
if (currentBranch(worktree) === "main") deny("Main is read-only. Create a governed branch/worktree before editing.");

const task = loadActiveTask(rawPath);
if (!task) deny("No active task manifest for this worktree. Run /start-change before editing.");

const path = repoRelative(rawPath);
const owned = (task.ownedPaths ?? []).some((pattern) => matchesGlob(pattern, path));
const shared = (task.sharedPaths ?? []).some((pattern) => matchesGlob(pattern, path));
if (!owned && !shared) deny(`${path} is outside task ${task.taskId} ownership.`);
if (["VERSION", "RELEASE_NOTES.md"].includes(path) && task.versionStrategy?.owner !== "integration-manager") deny(`${path} is controlled by integration-manager.`);
if (/\.env($|\.)/.test(path) && path !== ".env.example") deny("Do not write local secrets through an agent.");

// Ownership alone only proves this checkout may touch the file. With several
// agents running at once it says nothing about whether another checkout is
// already changing the same file — which is how parallel work quietly
// destroyed itself: both sides passed their own check, and integration kept
// one version.
try {
  const key = worktreeKey(rawPath);
  const editors = foreignEditors(path, key);
  if (editors.length) {
    deny([
      `${path} is already being changed in another checkout:`,
      ...editors.map((editor) => `  - ${editor.key} (task ${editor.taskId}, branch ${editor.branch}) — seen in ${editor.source}`),
      "Editing it here would fork the same file in two branches. Either coordinate the change in that checkout,",
      "or narrow both task manifests so exactly one of them owns this path, then retry.",
    ].join("\n"));
  }
  const claimants = foreignClaimants(path, key);
  if (claimants.length) {
    warn(`[governance] ${path} is also claimed by ${claimants.map((entry) => `${entry.taskId} (${entry.key})`).join(", ")}. Nobody has touched it yet — narrow the ownedPaths before this becomes a conflict.`);
  }
} catch (error) {
  // A cross-checkout check that itself fails must not wedge every edit in the
  // repository; report it and let the single-checkout rules stand.
  process.stderr.write(`[governance] cross-worktree check unavailable: ${error.message}\n`);
  process.exit(1);
}
