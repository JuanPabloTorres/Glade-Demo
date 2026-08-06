import { currentBranch, git, loadActiveTask } from "../../scripts/agent/common.mjs";
const safe = (args, fallback = "unavailable") => { try { return git(args); } catch { return fallback; } };
const branch = currentBranch();
const task = loadActiveTask();
console.log(`[FreshStart governance] branch=${branch || "detached"} head=${safe(["rev-parse", "--short", "HEAD"])} version=${safe(["show", "HEAD:VERSION"])} task=${task?.taskId || "none"}`);
if (branch === "main") console.log("Read-only on main. Create a governed branch before editing.");
if (!task) console.log("Run /start-change before any edit.");
