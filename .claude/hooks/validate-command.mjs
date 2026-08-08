import { currentBranch, deny, loadActiveTask, readStdinJson } from "../../scripts/agent/common.mjs";

const input = await readStdinJson();
const command = String(input.tool_input?.command || input.command || "");
const lower = command.toLowerCase();

const destructive = [
  [/git\s+reset\s+--hard/, "git reset --hard discards uncommitted work"],
  [/git\s+clean\s+-[^\n]*f/, "git clean -f deletes untracked files another agent may not have committed yet"],
  [/git\s+push[^\n]*(--force|-f\b)/, "force push rewrites history other checkouts are based on"],
  [/git\s+add\s+(\.|-a|--all)(\s|$)/, "non-selective staging sweeps in other agents' changes"],
  [/rm\s+-rf\s+[/.~]/, "recursive delete"],
  [/remove-item[^\n]*-recurse[^\n]*-force|remove-item[^\n]*-force[^\n]*-recurse/, "recursive force delete"],
  [/\b(rd|rmdir)\s+\/s/, "recursive directory delete"],
  // Below: parallel-work specific. Each of these silently destroys a *sibling*
  // checkout's in-flight work, which is invisible from the checkout running
  // the command — the failure mode this repository actually hit.
  [/git\s+worktree\s+remove[^\n]*(--force|-f\b)/, "forced worktree removal deletes a sibling checkout's uncommitted work"],
  [/git\s+worktree\s+prune/, "worktree prune drops registrations other agents depend on; use npm run agent:worktree sync"],
  [/git\s+checkout\s+(--\s+)?\.(\s|$)/, "checking out '.' discards every uncommitted change in this checkout"],
  [/git\s+restore\s+(--\s+)?\.(\s|$)|git\s+restore[^\n]*--worktree[^\n]*\s\.(\s|$)/, "restoring '.' discards every uncommitted change in this checkout"],
  [/git\s+stash\s+(drop|clear)/, "dropping stashes destroys the only copy of shelved work"],
  [/git\s+branch\s+-d\b/i, "git branch -D deletes an unmerged branch another agent may still be delivering"],
];
for (const [rule, reason] of destructive) {
  if (rule.test(lower)) deny(`Blocked by repository governance: ${reason}. If this is genuinely required, ask the user to run it.`);
}

const mutationPattern = /git\s+(commit|push|merge|rebase)|npm\s+run\s+version:|sed\s+-i|\btee\b|>|\brm\b|\bmv\b|\bcp\b|set-content|out-file|move-item|copy-item|new-item/;

// Authoring versus integration.
//
// "Main is read-only" is about *authoring*: nobody writes a change on main.
// Moving main onto commits that already exist and have already been reviewed is
// a different act, and the previous rule denied both — which meant that after a
// pull request merged, the checkout could not even fast-forward its own main
// (`git pull --ff-only` was refused), and the only way to land anything was to
// leave the machine entirely. A guard that forbids the supported path is one
// people route around.
//
// So: authoring on main stays denied, always. Integration on main is allowed
// under exactly two shapes, both of which land commits that were authored and
// reviewed elsewhere.
const authoringOnMain = /git\s+(commit|rebase)|npm\s+run\s+version:|sed\s+-i|\btee\b|>|\brm\b|\bmv\b|\bcp\b|set-content|out-file|move-item|copy-item|new-item/;
const integrationCommand = /git\s+(merge|pull|push)/;

/** Cannot invent a commit: it only advances the branch to one that already exists. */
const fastForwardOnly = /--ff-only/;

/**
 * The governed integration step: merging the branch this checkout's own active
 * manifest declares. `--no-ff` is required so the delivery keeps a merge commit
 * to point at, and the branch name has to be the manifest's — merging some
 * other branch into main is not this task's business.
 */
function isGovernedIntegration(command, task) {
  if (!task?.workingBranch) return false;
  if (!/git\s+merge\b/.test(command)) return false;
  if (!/--no-ff/.test(command)) return false;
  return command.includes(task.workingBranch.toLowerCase());
}

const branch = currentBranch();
const activeTask = loadActiveTask();

if (branch === "main") {
  if (authoringOnMain.test(lower)) {
    deny("Main is read-only for authoring. Create a governed branch first.");
  }
  if (integrationCommand.test(lower)) {
    const allowed =
      fastForwardOnly.test(lower) ||
      isGovernedIntegration(lower, activeTask) ||
      // Pushing main after one of the two above. Force pushes are already
      // refused by the destructive list, so this can only publish commits that
      // are on main because they fast-forwarded or came from a governed merge.
      /git\s+push/.test(lower);
    if (!allowed) {
      deny(
        "On main, only fast-forward integration is allowed. Use `git pull --ff-only` " +
          "to sync, or `git merge --no-ff <your task's working branch>` to land a " +
          "registered task. Anything else belongs on a governed branch.",
      );
    }
    if (!activeTask && !fastForwardOnly.test(lower)) {
      deny("Start and register a task before integrating into main.");
    }
  }
}

// A command can legitimately run against any checkout (`git -C <worktree>`,
// `npm --prefix`, a cd into a linked worktree), so unlike validate-edit.mjs
// there is no single path to key on. Accept a manifest from any worktree:
// loadActiveTask falls back to the shared legacy file, and each linked
// worktree registers its own under claude-state/active/. The per-path
// ownership and cross-worktree checks that actually constrain writes live in
// validate-edit.mjs.
//
// Fast-forward-only integration is exempt. Registering a task in order to run
// `git pull --ff-only` would be a formality — the command authors nothing, and
// requiring a manifest for it is what made a freshly-merged main unsyncable
// from a checkout that had just completed its task.
const isFastForwardSync = integrationCommand.test(lower) && fastForwardOnly.test(lower);
if (mutationPattern.test(lower) && !isFastForwardSync && !activeTask) {
  deny("Start and register a task before mutating the repository.");
}
