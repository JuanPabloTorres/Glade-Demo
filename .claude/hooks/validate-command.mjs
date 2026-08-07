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
const branch = currentBranch();
if (branch === "main" && mutationPattern.test(lower)) deny("Main is read-only. Create a governed branch first.");

// A command can legitimately run against any checkout (`git -C <worktree>`,
// `npm --prefix`, a cd into a linked worktree), so unlike validate-edit.mjs
// there is no single path to key on. Accept a manifest from any worktree:
// loadActiveTask falls back to the shared legacy file, and each linked
// worktree registers its own under claude-state/active/. The per-path
// ownership and cross-worktree checks that actually constrain writes live in
// validate-edit.mjs.
if (mutationPattern.test(lower) && !loadActiveTask()) deny("Start and register a task before mutating the repository.");
