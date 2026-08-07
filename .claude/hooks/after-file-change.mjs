import { currentBranch, loadActiveTask, readStdinJson, repoRelative, worktreeKey, worktreeRootFor } from "../../scripts/agent/common.mjs";
import { recordEdit } from "../../scripts/agent/parallel.mjs";

const input = await readStdinJson();
const raw = input.tool_input?.file_path || input.tool_input?.path;
if (!raw) process.exit(0);
const path = repoRelative(raw);

// Every touched file is recorded against this checkout so that a concurrent
// agent asking "is anyone else on this file?" gets an answer without shelling
// out to git for each of the other worktrees on every tool call.
try {
  const task = loadActiveTask(raw);
  recordEdit(worktreeKey(raw), path, { taskId: task?.taskId ?? null, branch: currentBranch(worktreeRootFor(raw)) });
} catch (error) {
  process.stderr.write(`[governance] could not record the edit in the fleet ledger: ${error.message}\n`);
}

const checks = [];
if (path.includes("/locales/")) checks.push("npm --prefix frontend run i18n:check");
if (path === "contracts/api-contracts.json") checks.push("make contracts");
if (/\.py$/.test(path)) checks.push("uv run ruff check <file> and relevant pytest");
if (/\.(ts|tsx|css)$/.test(path)) checks.push("npm run agent:flowbite and relevant frontend tests");
if (checks.length) console.log(`[governance] Next targeted checks for ${path}: ${checks.join("; ")}`);
