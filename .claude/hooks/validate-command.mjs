import { currentBranch, deny, loadActiveTask, readStdinJson } from "../../scripts/agent/common.mjs";
const input = await readStdinJson();
const command = String(input.tool_input?.command || input.command || "");
const lower = command.toLowerCase();
const destructive = [/git\s+reset\s+--hard/, /git\s+clean\s+-[^\n]*f/, /git\s+push[^\n]*(--force|-f\b)/, /git\s+add\s+(\.|-a|--all)(\s|$)/, /rm\s+-rf\s+[/.~]/];
if (destructive.some((rule) => rule.test(lower))) deny("Blocked destructive or non-selective command by repository governance.");
const branch = currentBranch();
if (branch === "main" && /git\s+(commit|push|merge|rebase)|npm\s+run\s+version:|sed\s+-i|\btee\b|>|\brm\b|\bmv\b|\bcp\b/.test(lower)) deny("Main is read-only. Create a governed branch first.");
const mutation = /git\s+(commit|push|merge|rebase)|npm\s+run\s+version:|sed\s+-i|\btee\b|>|\brm\b|\bmv\b|\bcp\b/.test(lower);
// A command can legitimately run against any checkout (`git -C <worktree>`,
// `npm --prefix`, a cd into a linked worktree), so unlike validate-edit.mjs
// there is no single path to key on. Accept a manifest from any worktree:
// loadActiveTask falls back to the legacy shared file, and each linked
// worktree registers its own under claude-state/active/. The per-path
// ownership check that actually constrains writes lives in validate-edit.mjs.
if (mutation && !loadActiveTask()) deny("Start and register a task before mutating the repository.");
