import { git, currentBranch, loadActiveTask, root } from "./common.mjs";

const safe = (args, fallback = "unavailable") => { try { return git(args); } catch { return fallback; } };
const task = loadActiveTask();
console.log(JSON.stringify({
  root,
  branch: currentBranch(),
  head: safe(["rev-parse", "HEAD"]),
  version: safe(["show", "HEAD:VERSION"]),
  status: safe(["status", "--short"], ""),
  worktrees: safe(["worktree", "list", "--porcelain"], ""),
  activeTask: task,
}, null, 2));
