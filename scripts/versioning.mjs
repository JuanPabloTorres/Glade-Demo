import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = resolve(root, "VERSION");
const rootPackagePath = resolve(root, "package.json");
const frontendPackagePath = resolve(root, "frontend/package.json");
const pyprojectPath = resolve(root, "backend/pyproject.toml");
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function readVersion() {
  return readFileSync(versionPath, "utf8").trim();
}

function assertSemver(version) {
  if (!semverPattern.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readPyprojectVersion() {
  const content = readFileSync(pyprojectPath, "utf8");
  const match = content.match(/^version = "([^"]+)"$/m);
  if (!match) {
    throw new Error("backend/pyproject.toml does not declare a project version");
  }
  return match[1];
}

function synchronize(version) {
  assertSemver(version);
  writeFileSync(versionPath, `${version}\n`);

  const rootPackage = readJson(rootPackagePath);
  rootPackage.version = version;
  writeJson(rootPackagePath, rootPackage);

  const frontendPackage = readJson(frontendPackagePath);
  frontendPackage.version = version;
  writeJson(frontendPackagePath, frontendPackage);

  const pyproject = readFileSync(pyprojectPath, "utf8").replace(
    /^version = "[^"]+"$/m,
    `version = "${version}"`,
  );
  writeFileSync(pyprojectPath, pyproject);
}

function checkConsistency() {
  const version = readVersion();
  assertSemver(version);
  const values = {
    VERSION: version,
    "package.json": readJson(rootPackagePath).version,
    "frontend/package.json": readJson(frontendPackagePath).version,
    "backend/pyproject.toml": readPyprojectVersion(),
  };

  const mismatches = Object.entries(values).filter(([, value]) => value !== version);
  if (mismatches.length) {
    const details = mismatches.map(([file, value]) => `${file}=${value}`).join(", ");
    throw new Error(`Version mismatch. Expected ${version}; found ${details}`);
  }
  console.log(`Version ${version} is synchronized across the repository.`);
}

function checkBump() {
  checkConsistency();
  let previousVersion;
  try {
    previousVersion = execFileSync("git", ["show", "HEAD^:VERSION"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    console.log("No previous VERSION file was found; treating this as versioning initialization.");
    return;
  }

  const currentVersion = readVersion();
  if (currentVersion === previousVersion) {
    throw new Error(
      `Every publishable change must increment VERSION. Current and previous are both ${currentVersion}.`,
    );
  }
  console.log(`Version bump verified: ${previousVersion} -> ${currentVersion}`);
}

function bump(kind) {
  const current = readVersion();
  assertSemver(current);
  const [major, minor, patch] = current.split(".").map(Number);
  const next = {
    major: `${major + 1}.0.0`,
    minor: `${major}.${minor + 1}.0`,
    patch: `${major}.${minor}.${patch + 1}`,
  }[kind];

  if (!next) {
    throw new Error(`Unknown bump type: ${kind}`);
  }
  synchronize(next);
  console.log(`Version updated: ${current} -> ${next}`);
}

const command = process.argv[2];
if (command === "check") {
  checkConsistency();
} else if (command === "check-bump") {
  checkBump();
} else if (["major", "minor", "patch"].includes(command)) {
  bump(command);
} else {
  throw new Error("Usage: node scripts/versioning.mjs <check|check-bump|major|minor|patch>");
}
