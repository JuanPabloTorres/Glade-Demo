import { parseArgs, worktreeKey } from "./common.mjs";
import { fleetReport, readLedger } from "./parallel.mjs";

/**
 * One view of every agent working in this repository right now.
 *
 * Without it, each checkout could only see itself, so "are we stepping on each
 * other?" was unanswerable until integration.
 */
const args = parseArgs();
const report = fleetReport();

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const me = worktreeKey();
  console.log(`Fleet: ${report.worktrees.length} checkout(s)\n`);
  for (const worktree of report.worktrees) {
    const manifest = report.manifests.find((entry) => entry.key === worktree.key);
    const ledger = readLedger(worktree.key);
    const dirty = report.dirty[worktree.key] ?? [];
    console.log(`${worktree.key === me ? "*" : " "} ${worktree.key}`);
    console.log(`    branch   ${worktree.branch || "(detached)"}`);
    console.log(`    task     ${manifest ? `${manifest.task.taskId} — ${manifest.task.title}` : "none registered (edits fall back to shared state)"}`);
    if (manifest) console.log(`    owns     ${(manifest.task.ownedPaths ?? []).join(", ") || "nothing"}`);
    console.log(`    in flight ${dirty.length} uncommitted path(s), ${Object.keys(ledger?.files ?? {}).length} recorded agent edit(s)`);
    console.log("");
  }

  const errors = report.problems.filter((problem) => problem.severity === "error");
  const warnings = report.problems.filter((problem) => problem.severity === "warn");
  if (!errors.length && !warnings.length) {
    console.log("No conflicts. Every path has at most one owner.");
  }
  if (errors.length) {
    console.log(`Conflicts (${errors.length}) — resolve before continuing:`);
    for (const problem of errors) console.log(`  ! [${problem.kind}] ${problem.message}`);
  }
  if (warnings.length) {
    console.log(`${errors.length ? "\n" : ""}Warnings (${warnings.length}):`);
    for (const problem of warnings) console.log(`  - [${problem.kind}] ${problem.message}`);
  }
}

// `--strict` is what a verification step or CI calls: a claim overlap or a file
// held by two checkouts is a failure, an unregistered worktree is not.
if (args.strict && report.problems.some((problem) => problem.severity === "error")) process.exit(1);
