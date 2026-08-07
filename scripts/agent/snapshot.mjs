import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs, stateDir, writeJson } from "./common.mjs";
import { liveWorktrees } from "./parallel.mjs";

/**
 * Copy every uncommitted change in every checkout somewhere safe.
 *
 * Uncommitted work is the only state in this repository with no second copy:
 * a bad merge, a stray checkout or a worktree removal takes it with no way
 * back. Snapshots are pure copies — nothing is staged, committed or deleted,
 * so running this can never disturb an agent that is mid-edit.
 */
const args = parseArgs();
const SKIP = [/^node_modules\//, /^\.venv\//, /^dist\//, /^build\//, /^coverage\//, /^playwright-report\//, /^test-results\//, /^\.pytest_cache\//, /^__pycache__\//];
const MAX_BYTES = Number(args["max-bytes"] ?? 5_000_000);
const label = new Date().toISOString().replaceAll(":", "-");
const destination = resolve(stateDir(), "snapshots", label);

function uncommittedFiles(path) {
  const read = (gitArgs) => {
    try { return execFileSync("git", ["-C", path, ...gitArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split(/\r?\n/).filter(Boolean); } catch { return []; }
  };
  // Tracked changes plus untracked files, as files — never directory entries,
  // so nothing has to be walked by hand and .gitignore is respected.
  return [...new Set([...read(["diff", "--name-only", "HEAD"]), ...read(["ls-files", "-o", "--exclude-standard"])])]
    .filter((file) => !SKIP.some((rule) => rule.test(file)));
}

const summary = [];
for (const worktree of liveWorktrees()) {
  const files = uncommittedFiles(worktree.path);
  const copied = [];
  const skipped = [];
  const deleted = [];
  for (const file of files) {
    const from = resolve(worktree.path, file);
    try {
      // A pending deletion has nothing to copy and is not a loss: the content
      // is still reachable in HEAD. Recording it keeps the manifest honest
      // instead of reporting an unexplained skip.
      if (!existsSync(from)) { deleted.push(file); continue; }
      const size = statSync(from).size;
      if (size > MAX_BYTES) { skipped.push({ file, reason: `${size} bytes exceeds --max-bytes ${MAX_BYTES}` }); continue; }
      const to = resolve(destination, worktree.key, file);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
      copied.push(file);
    } catch (error) { skipped.push({ file, reason: error.message }); }
  }
  summary.push({ key: worktree.key, path: worktree.path, branch: worktree.branch, head: worktree.head, copied, skipped, deleted });
  // Skipped files are named, not just counted: a snapshot you cannot audit is
  // not a safety net.
  console.log(`${worktree.key}: ${copied.length} file(s) copied${deleted.length ? `, ${deleted.length} pending deletion (content still in HEAD)` : ""}${skipped.length ? `, ${skipped.length} skipped -> ${skipped.map((entry) => entry.file).join(", ")}` : ""}`);
}

writeJson(resolve(destination, "manifest.json"), { takenAt: new Date().toISOString(), maxBytes: MAX_BYTES, worktrees: summary });
console.log(`\nSnapshot written to ${destination}`);
console.log("Nothing was staged, committed or removed. Restore by copying files back into the checkout.");
