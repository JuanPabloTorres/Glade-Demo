import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadActiveTask, root } from "./common.mjs";

const mode = process.argv[2] || "governance";
function step(command, args, cwd = root) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Runs first: a fleet conflict means another checkout is diverging on the same
// files, which invalidates whatever the rest of this verification concludes.
step("node", ["scripts/agent/fleet.mjs", "--strict"]);
step("node", ["scripts/agent/architecture-check.mjs"]);
step("node", ["scripts/agent/flowbite-check.mjs"]);
if (mode === "governance") process.exit(0);
step("npm", ["run", "version:check"]);
step("npm", ["--prefix", "frontend", "run", "i18n:check"]);
if (mode === "targeted") process.exit(0);
step("make", ["verify"]);
step("npm", ["--prefix", "frontend", "run", "build"]);
if (mode === "full") step("npm", ["--prefix", "frontend", "run", "test:e2e"]);
const task = loadActiveTask();
if (task && !existsSync(resolve(root, "changes", `${task.taskId}.md`))) {
  console.error(`Missing changes/${task.taskId}.md`); process.exit(1);
}
