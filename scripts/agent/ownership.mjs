import { loadActiveTask, matchesGlob, parseArgs, repoRelative } from "./common.mjs";

const args = parseArgs();
const task = loadActiveTask();
if (!task) throw new Error("No active task. Run npm run agent:start -- start ...");
const file = args.path ? repoRelative(args.path) : null;
if (!file) { console.log(JSON.stringify(task, null, 2)); process.exit(0); }
const owned = task.ownedPaths.some((pattern) => matchesGlob(pattern, file));
const shared = task.sharedPaths.some((pattern) => matchesGlob(pattern, file));
if (!owned && !shared) throw new Error(`${file} is outside task ownership.`);
if (shared && task.versionStrategy.owner !== "integration-manager" && ["VERSION", "RELEASE_NOTES.md"].includes(file)) {
  throw new Error(`${file} is controlled by integration-manager.`);
}
console.log(`${file} is governed by task ${task.taskId}.`);
