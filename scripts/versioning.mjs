import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = resolve(root, "VERSION");
const rootPackagePath = resolve(root, "package.json");
const frontendPackagePath = resolve(root, "frontend/package.json");
const frontendLockPath = resolve(root, "frontend/package-lock.json");
const backendProjectPath = resolve(root, "backend/pyproject.toml");
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function readVersion() { return readFileSync(versionPath, "utf8").trim(); }
function parseVersion(version) {
  if (!semverPattern.test(version)) throw new Error(`Invalid semantic version: ${version}`);
  return version.split(".").map(Number);
}
function compareVersions(left, right) {
  const a = parseVersion(left); const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  return 0;
}
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function readBackendPackageVersion() {
  const match = readFileSync(backendProjectPath, "utf8").match(/^version = "([^"]+)"$/m);
  return match?.[1] ?? "unknown";
}
function synchronize(version) {
  parseVersion(version);
  writeFileSync(versionPath, `${version}\n`);
  const rootPackage = readJson(rootPackagePath); rootPackage.version = version; writeJson(rootPackagePath, rootPackage);
  const frontendPackage = readJson(frontendPackagePath); frontendPackage.version = version; writeJson(frontendPackagePath, frontendPackage);
  if (existsSync(frontendLockPath)) {
    const lock = readJson(frontendLockPath); lock.version = version;
    if (lock.packages?.[""]) lock.packages[""].version = version;
    writeJson(frontendLockPath, lock);
  }
}
function checkConsistency() {
  const version = readVersion(); parseVersion(version);
  const values = {
    VERSION: version,
    "package.json": readJson(rootPackagePath).version,
    "frontend/package.json": readJson(frontendPackagePath).version,
  };
  const mismatches = Object.entries(values).filter(([, value]) => value !== version);
  if (mismatches.length) throw new Error(`Version mismatch. Expected ${version}; found ${mismatches.map(([file, value]) => `${file}=${value}`).join(", ")}`);
  if (existsSync(frontendLockPath)) {
    const lockVersion = readJson(frontendLockPath).packages?.[""]?.version;
    if (lockVersion && lockVersion !== version) console.warn(`Lockfile root metadata is ${lockVersion}; release authority remains VERSION and application package manifests. A local version command will refresh it.`);
  }
  const backendPackageVersion = readBackendPackageVersion();
  if (backendPackageVersion !== version) console.warn(`backend/pyproject.toml package metadata is ${backendPackageVersion}; runtime/API release version is read from VERSION and uv.lock remains dependency-reproducible.`);
  console.log(`Version ${version} is synchronized across runtime release-authority files.`);
}
function readVersionAtRef(ref) {
  return execFileSync("git", ["show", `${ref}:VERSION`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}
function checkAgainst(ref) {
  checkConsistency(); const baseline = readVersionAtRef(ref); const current = readVersion();
  if (compareVersions(current, baseline) <= 0) throw new Error(`Version must increase relative to ${ref}. Found ${baseline} -> ${current}.`);
  console.log(`Version increase verified against ${ref}: ${baseline} -> ${current}`);
}
function checkBump() {
  checkConsistency(); const previous = readVersionAtRef("HEAD^"); const current = readVersion();
  if (compareVersions(current, previous) <= 0) throw new Error(`Version must increase. Found ${previous} -> ${current}.`);
  console.log(`Version bump verified: ${previous} -> ${current}`);
}
function bump(kind) {
  const current = readVersion(); const [major, minor, patch] = parseVersion(current);
  const next = { major: `${major + 1}.0.0`, minor: `${major}.${minor + 1}.0`, patch: `${major}.${minor}.${patch + 1}` }[kind];
  if (!next) throw new Error(`Unknown bump type: ${kind}`);
  synchronize(next); console.log(`Version updated: ${current} -> ${next}`);
}
const command = process.argv[2];
if (command === "check") checkConsistency();
else if (command === "check-bump") checkBump();
else if (command === "check-against") checkAgainst(process.argv[3] ?? "origin/main");
else if (command === "current") console.log(readVersion());
else if (["major", "minor", "patch"].includes(command)) bump(command);
else throw new Error("Usage: node scripts/versioning.mjs <check|check-bump|check-against|current|major|minor|patch>");
