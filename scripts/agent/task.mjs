import { existsSync, mkdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { activeTaskPath, claimsOverlap, currentBranch, parseArgs, readJson, root, stateDir, withStateLock, worktreeKey, worktreeRootFor, writeJson } from "./common.mjs";
import { ledgerPath, liveManifests } from "./parallel.mjs";

// These messages are the whole point of the guards below — a stack trace on
// top of them buries the instruction the agent is supposed to act on.
for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, (error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exit(1); });
}

const [command = "status"] = parseArgs()._;
const args = parseArgs(process.argv.slice(3));

const SHARED_PATHS = ["VERSION", "RELEASE_NOTES.md", "package.json", "frontend/package-lock.json", "backend/pyproject.toml", ".github/workflows/ci.yml"];
const stamp = () => new Date().toISOString().replaceAll(":", "-");

/** Nothing under claude-state is ever deleted; it is moved out of the way. */
function archiveFile(from, to) {
  if (!existsSync(from)) return null;
  mkdirSync(resolve(to, ".."), { recursive: true });
  renameSync(from, to);
  return to;
}

/**
 * Which other live tasks already claim any of these paths.
 *
 * Registration used to be unconditional, so two checkouts could both claim
 * `frontend/src/**` and neither agent would learn about the other until their
 * branches collided at integration.
 */
function overlapsWith(ownedPaths, key) {
  const conflicts = [];
  for (const other of liveManifests().filter((entry) => entry.key !== key)) {
    const pairs = [];
    for (const mine of ownedPaths) {
      for (const theirs of other.task.ownedPaths ?? []) {
        if (claimsOverlap(mine, theirs)) pairs.push(mine === theirs ? mine : `${mine} ~ ${theirs}`);
      }
    }
    if (pairs.length) conflicts.push({ taskId: other.task.taskId, key: other.key, branch: other.worktree.branch, pairs });
  }
  return conflicts;
}

if (command === "status") {
  console.log(JSON.stringify(readJson(activeTaskPath(), { status: "none" }), null, 2));
} else if (command === "start") {
  for (const key of ["id", "title", "scope", "own", "accept", "verify"]) {
    if (!args[key]) throw new Error(`Missing --${key}`);
  }
  const branch = currentBranch();
  if (!branch || branch === "main") throw new Error("Create/switch to a governed branch before starting a task.");
  const key = worktreeKey();
  const ownedPaths = String(args.own).split(",").map((value) => value.trim()).filter(Boolean);

  withStateLock("tasks", () => {
    const others = liveManifests().filter((entry) => entry.key !== key);
    const duplicate = others.find((entry) => entry.task.taskId === args.id);
    if (duplicate) throw new Error(`Task ${args.id} is already active in ${duplicate.key} (${duplicate.worktree.branch}). Pick a different id — the shared archive tasks/${args.id}.json can only describe one of them.`);

    const conflicts = overlapsWith(ownedPaths, key);
    if (conflicts.length && !args["allow-overlap"]) {
      const detail = conflicts.map((entry) => `  - ${entry.taskId} in ${entry.key} (${entry.branch}): ${entry.pairs.join(", ")}`).join("\n");
      throw new Error([
        "Ownership overlaps a task that is already active in another checkout:",
        detail,
        "Two agents owning one path is how parallel work overwrites itself. Narrow --own so each path has exactly one owner",
        "(claim changes/<task-id>.md rather than changes/**, a component rather than the whole tree), or pass --allow-overlap",
        "to record a deliberate shared claim.",
      ].join("\n"));
    }

    const task = {
      taskId: args.id,
      title: args.title,
      type: args.type || "chore",
      scope: args.scope,
      baseBranch: args.base || "main",
      workingBranch: branch,
      worktreeKey: key,
      worktreePath: worktreeRootFor(root),
      status: "active",
      versionStrategy: { mode: args.mode || "single-delivery", bump: args.bump || "patch", owner: args.owner || "integration-manager" },
      agents: String(args.agents || "").split(",").filter(Boolean),
      skills: String(args.skills || "").split(",").filter(Boolean),
      ownedPaths,
      sharedPaths: SHARED_PATHS,
      acceptanceCriteria: String(args.accept).split("|").filter(Boolean),
      verificationCommands: String(args.verify).split("|").filter(Boolean),
      risks: [],
      decisions: conflicts.length ? [`Accepted overlapping ownership with ${conflicts.map((entry) => entry.taskId).join(", ")} via --allow-overlap.`] : [],
      createdAt: new Date().toISOString(),
    };
    writeJson(activeTaskPath(), task);
    writeJson(resolve(stateDir(), "tasks", `${task.taskId}.json`), task);
    console.log(`Active task ${task.taskId} registered on ${branch} in ${key}.`);
    if (conflicts.length) console.log(`Warning: overlapping claims accepted with ${conflicts.map((entry) => entry.taskId).join(", ")}.`);
  });
} else if (command === "narrow") {
  if (!args.own) throw new Error("Usage: task.mjs narrow --own <comma-separated paths>");
  const key = worktreeKey();
  withStateLock("tasks", () => {
    const task = readJson(activeTaskPath());
    if (!task) throw new Error("No active task in this checkout.");
    const ownedPaths = String(args.own).split(",").map((value) => value.trim()).filter(Boolean);
    const conflicts = overlapsWith(ownedPaths, key);
    if (conflicts.length && !args["allow-overlap"]) {
      throw new Error(`Still overlapping: ${conflicts.map((entry) => `${entry.taskId} (${entry.pairs.join(", ")})`).join("; ")}`);
    }
    task.ownedPaths = ownedPaths;
    task.narrowedAt = new Date().toISOString();
    writeJson(activeTaskPath(), task);
    writeJson(resolve(stateDir(), "tasks", `${task.taskId}.json`), task);
    console.log(`Task ${task.taskId} now owns: ${ownedPaths.join(", ")}`);
  });
} else if (command === "complete") {
  const key = worktreeKey();
  withStateLock("tasks", () => {
    const task = readJson(activeTaskPath());
    if (!task) throw new Error("No active task.");
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    writeJson(resolve(stateDir(), "tasks", `${task.taskId}.json`), task);
    archiveFile(activeTaskPath(), resolve(stateDir(), "active", "archive", `${key}-${task.taskId}-${stamp()}.json`));
    // The ledger is archived rather than dropped: it is the record of which
    // files this task held, and a later conflict investigation needs it.
    archiveFile(ledgerPath(key), resolve(stateDir(), "edits", "archive", `${key}-${task.taskId}-${stamp()}.json`));
    console.log(`Task ${task.taskId} completed. Its path claims are released for other agents.`);
  });
} else if (command === "clear") {
  const key = worktreeKey();
  withStateLock("tasks", () => {
    const task = readJson(activeTaskPath());
    // Previously an unlink, which threw away the only copy of a manifest that
    // had never been archived. Clearing must be recoverable.
    const archived = archiveFile(activeTaskPath(), resolve(stateDir(), "active", "archive", `${key}-${task?.taskId ?? "unknown"}-${stamp()}.json`));
    archiveFile(ledgerPath(key), resolve(stateDir(), "edits", "archive", `${key}-${task?.taskId ?? "unknown"}-${stamp()}.json`));
    console.log(archived ? `Active task cleared; manifest archived at ${archived}.` : "No active task to clear.");
  });
} else throw new Error("Usage: task.mjs <start|status|narrow|complete|clear>");
