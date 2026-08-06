import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { deny, loadActiveTask, root } from "../../scripts/agent/common.mjs";
const task = loadActiveTask();
if (!task) process.exit(0);
if (!existsSync(resolve(root, "changes", `${task.taskId}.md`))) deny(`Task ${task.taskId} cannot finish without changes/${task.taskId}.md`);
if (!task.acceptanceCriteria?.length || !task.verificationCommands?.length) deny(`Task ${task.taskId} lacks acceptance criteria or verification commands.`);
if (task.status === "planned") deny(`Task ${task.taskId} was never activated.`);
