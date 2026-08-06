import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { readJson, root } from "./common.mjs";

const sourceRoot = resolve(root, "frontend/src");
const exceptionPath = resolve(root, "docs/architecture/FLOWBITE-EXCEPTIONS.json");
const exceptions = readJson(exceptionPath, {
  directFlowbitePages: [], directIconImports: [], inlineStyleFiles: [], overflowReviewFiles: [],
});
const directFlowbitePages = new Set(exceptions.directFlowbitePages || []);
const directIconImports = new Set(exceptions.directIconImports || []);
const inlineStyleFiles = new Set(exceptions.inlineStyleFiles || []);
const overflowReviewFiles = new Set(exceptions.overflowReviewFiles || []);
const errors = [];
const warnings = [];

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.(tsx|ts|css)$/.test(entry.name) ? [path] : [];
  });
}

for (const file of files(sourceRoot)) {
  const path = relative(root, file).replaceAll("\\", "/");
  const content = readFileSync(file, "utf8");
  if (content.includes('from "react-icons/hi2"') && path !== "frontend/src/config/iconRegistry.ts") {
    if (directIconImports.has(path)) warnings.push(`${path}: legacy direct icon import is registered for migration`);
    else errors.push(`${path}: import icons through iconRegistry/AppIcon`);
  }
  if (content.includes('from "flowbite-react"') && path.startsWith("frontend/src/pages/") && !directFlowbitePages.has(path)) {
    errors.push(`${path}: new pages must compose shared Flowbite wrappers`);
  }
  if (path.startsWith("frontend/src/pages/") && /style=\{\{/.test(content)) {
    if (inlineStyleFiles.has(path)) warnings.push(`${path}: registered inline-style migration exception`);
    else errors.push(`${path}: inline visual style requires a governed exception or wrapper`);
  }
  if (path.startsWith("frontend/src/pages/") && content.includes("overflow-x-auto")) {
    if (overflowReviewFiles.has(path)) warnings.push(`${path}: registered responsive migration exception`);
    else errors.push(`${path}: overflow is not a complete responsive strategy`);
  }
}
if (warnings.length) console.warn(warnings.join("\n"));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Flowbite architecture check passed.");
