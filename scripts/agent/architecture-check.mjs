import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { root } from "./common.mjs";

const required = ["CLAUDE.md", "frontend/CLAUDE.md", "backend/CLAUDE.md", "docs/CLAUDE.md", ".claude/settings.json", ".claude/rules", ".claude/skills", ".claude/agents"];
const errors = required.filter((item) => !existsSync(resolve(root, item))).map((item) => `Missing ${item}`);

function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith(".md") ? [path] : [];
  });
}

for (const [kind, dir] of [["skill", ".claude/skills"], ["agent", ".claude/agents"]]) {
  const names = new Map();
  for (const file of markdownFiles(resolve(root, dir))) {
    const content = readFileSync(file, "utf8");
    const match = content.match(/^---[\s\S]*?^name:\s*([^\n]+)[\s\S]*?^---/m);
    if (!match) { errors.push(`${kind} missing frontmatter name: ${file}`); continue; }
    const name = match[1].trim();
    if (names.has(name)) errors.push(`Duplicate ${kind} name ${name}`);
    names.set(name, file);
  }
}

const rootClaude = readFileSync(resolve(root, "CLAUDE.md"), "utf8");
if (!rootClaude.includes("@AGENTS.md")) errors.push("CLAUDE.md must import AGENTS.md");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Agent architecture check passed.");
