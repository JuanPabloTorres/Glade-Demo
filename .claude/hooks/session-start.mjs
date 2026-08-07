import { currentBranch, git, loadActiveTask, worktreeKey } from "../../scripts/agent/common.mjs";
import { fleetReport } from "../../scripts/agent/parallel.mjs";

const safe = (args, fallback = "unavailable") => { try { return git(args); } catch { return fallback; } };
const branch = currentBranch();
const task = loadActiveTask();
console.log(`[FreshStart governance] branch=${branch || "detached"} head=${safe(["rev-parse", "--short", "HEAD"])} version=${safe(["show", "HEAD:VERSION"])} task=${task?.taskId || "none"}`);
if (branch === "main") console.log("Read-only on main. Create a governed branch before editing.");
if (!task) console.log("Run /start-change before any edit.");

// A session that starts blind to its siblings is how two agents end up
// rewriting the same file. Surface the fleet up front, not at integration.
try {
  const { worktrees, manifests, problems } = fleetReport();
  if (worktrees.length > 1) {
    const me = worktreeKey();
    const others = manifests.filter((entry) => entry.worktree && entry.key !== me);
    console.log(`${worktrees.length} checkouts are live. Concurrent tasks: ${others.length ? others.map((entry) => `${entry.task.taskId}@${entry.key}`).join(", ") : "none registered"}.`);
    const errors = problems.filter((problem) => problem.severity === "error");
    if (errors.length) {
      console.log(`${errors.length} fleet conflict(s) — run npm run agent:fleet before editing:`);
      for (const problem of errors.slice(0, 5)) console.log(`  - ${problem.message}`);
    }
  }
} catch (error) {
  console.log(`[governance] fleet summary unavailable: ${error.message}`);
}
