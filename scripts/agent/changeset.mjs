import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadActiveTask, root } from "./common.mjs";

const task = loadActiveTask();
if (!task) throw new Error("No active task.");
mkdirSync(resolve(root, "changes"), { recursive: true });
const path = resolve(root, "changes", `${task.taskId}.md`);
if (existsSync(path)) throw new Error(`Change fragment already exists: ${path}`);
writeFileSync(path, `---\ntaskId: ${task.taskId}\ntype: ${task.versionStrategy.bump}\nscope: ${task.scope}\n---\n# Summary\n\n# User-visible behavior\n\n# Migration / compatibility\n\n# Tests and evidence\n\n# Risks / limitations\n`);
console.log(`Created changes/${task.taskId}.md`);
