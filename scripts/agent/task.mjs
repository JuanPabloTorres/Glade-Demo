import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { activeTaskPath, currentBranch, parseArgs, readJson, stateDir, writeJson } from "./common.mjs";

const [command = "status"] = parseArgs()._;
const args = parseArgs(process.argv.slice(3));

if (command === "status") {
  console.log(JSON.stringify(readJson(activeTaskPath(), { status: "none" }), null, 2));
} else if (command === "start") {
  for (const key of ["id", "title", "scope", "own", "accept", "verify"]) {
    if (!args[key]) throw new Error(`Missing --${key}`);
  }
  const branch = currentBranch();
  if (!branch || branch === "main") throw new Error("Create/switch to a governed branch before starting a task.");
  const task = {
    taskId: args.id,
    title: args.title,
    type: args.type || "chore",
    scope: args.scope,
    baseBranch: args.base || "main",
    workingBranch: branch,
    status: "active",
    versionStrategy: { mode: args.mode || "single-delivery", bump: args.bump || "patch", owner: args.owner || "integration-manager" },
    agents: String(args.agents || "").split(",").filter(Boolean),
    skills: String(args.skills || "").split(",").filter(Boolean),
    ownedPaths: String(args.own).split(",").filter(Boolean),
    sharedPaths: ["VERSION", "RELEASE_NOTES.md", "package.json", "frontend/package-lock.json", "backend/pyproject.toml", ".github/workflows/ci.yml"],
    acceptanceCriteria: String(args.accept).split("|").filter(Boolean),
    verificationCommands: String(args.verify).split("|").filter(Boolean),
    risks: [], decisions: [], createdAt: new Date().toISOString(),
  };
  writeJson(activeTaskPath(), task);
  writeJson(resolve(stateDir(), "tasks", `${task.taskId}.json`), task);
  console.log(`Active task ${task.taskId} registered on ${branch}.`);
} else if (command === "complete") {
  const task = readJson(activeTaskPath());
  if (!task) throw new Error("No active task.");
  task.status = "completed";
  task.completedAt = new Date().toISOString();
  writeJson(resolve(stateDir(), "tasks", `${task.taskId}.json`), task);
  unlinkSync(activeTaskPath());
  console.log(`Task ${task.taskId} completed.`);
} else if (command === "clear") {
  if (existsSync(activeTaskPath())) unlinkSync(activeTaskPath());
  console.log("Active task cleared.");
} else throw new Error("Usage: task.mjs <start|status|complete|clear>");
