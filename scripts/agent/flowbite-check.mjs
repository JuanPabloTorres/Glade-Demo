import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { root } from "./common.mjs";

const sourceRoot = resolve(root, "frontend/src");
const legacyPageExceptions = new Set([
  "frontend/src/pages/AboutPlatformPage.tsx",
  "frontend/src/pages/AttorneyDashboardPage.tsx",
  "frontend/src/pages/CaseWorkspacePage.tsx",
  "frontend/src/pages/ClientDashboardPage.tsx",
  "frontend/src/pages/LoginPage.tsx",
]);
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
  if (content.includes('from "react-icons/hi2"') && path !== "frontend/src/config/iconRegistry.ts") errors.push(`${path}: import icons through iconRegistry/AppIcon`);
  if (content.includes('from "flowbite-react"') && path.startsWith("frontend/src/pages/") && !legacyPageExceptions.has(path)) errors.push(`${path}: new pages must compose shared Flowbite wrappers`);
  if (path.startsWith("frontend/src/pages/") && /style=\{\{/.test(content)) warnings.push(`${path}: inline visual style requires review`);
  if (path.startsWith("frontend/src/pages/") && content.includes("overflow-x-auto")) warnings.push(`${path}: overflow is not a complete responsive strategy`);
}
if (warnings.length) console.warn(warnings.join("\n"));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Flowbite architecture check passed.");
