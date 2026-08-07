import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { activeDir, claimsOverlap, git, matchesGlob, readJson, stateDir, withStateLock, writeJson } from "./common.mjs";

/**
 * Cross-checkout awareness for concurrent agents.
 *
 * `common.mjs` answers "what may *this* checkout touch". Everything here
 * answers "what are the *other* checkouts already touching", which is the part
 * that was missing: N worktrees each passed their own ownership check while
 * claiming the same globs and editing the same files, and the collision only
 * surfaced as a conflict at integration — after the work was done twice.
 */

/** Every checkout git knows about, keyed the same way state files are. */
export function liveWorktrees() {
  let output = "";
  try { output = git(["worktree", "list", "--porcelain"]); } catch { return []; }
  const entries = [];
  let current = null;
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      current = { path: resolve(line.slice("worktree ".length)), head: "", branch: "", detached: false };
      entries.push(current);
    } else if (!current) {
      continue;
    } else if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (line === "detached") {
      current.detached = true;
    }
  }
  return entries.map((entry) => ({ ...entry, key: basename(entry.path) }));
}

/**
 * Active task manifests paired with the checkout they belong to.
 *
 * A manifest whose worktree no longer exists is returned with `worktree: null`
 * rather than dropped, so `fleet.mjs` can report the leftover instead of the
 * state silently rotting. Enforcement paths filter on `worktree`.
 */
export function activeManifests() {
  const byKey = new Map(liveWorktrees().map((entry) => [entry.key, entry]));
  const directory = activeDir();
  const manifests = [];
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
    const key = file.replace(/\.json$/, "");
    const task = readJson(resolve(directory, file));
    if (!task) continue;
    manifests.push({ key, task, worktree: byKey.get(key) ?? null, manifestPath: resolve(directory, file) });
  }
  return manifests;
}

export function liveManifests() {
  return activeManifests().filter((entry) => entry.worktree);
}

export function ledgerPath(key) { return resolve(stateDir(), "edits", `${key}.json`); }

/**
 * Record that a checkout touched a file.
 *
 * The ledger is what makes "someone else is already editing this" answerable
 * without shelling out to git on every keystroke-level tool call.
 */
export function recordEdit(key, relativePath, { taskId = null, branch = null } = {}) {
  if (!key || !relativePath) return;
  withStateLock(`edits-${key}`, () => {
    const ledger = readJson(ledgerPath(key), { worktree: key, taskId, branch, files: {} });
    ledger.taskId = taskId ?? ledger.taskId;
    ledger.branch = branch ?? ledger.branch;
    const now = new Date().toISOString();
    const existing = ledger.files[relativePath];
    ledger.files[relativePath] = { count: (existing?.count ?? 0) + 1, firstAt: existing?.firstAt ?? now, lastAt: now };
    ledger.updatedAt = now;
    writeJson(ledgerPath(key), ledger);
  });
}

export function readLedger(key) { return readJson(ledgerPath(key), null); }

/**
 * Uncommitted paths per checkout, refreshed at most once per `ttlMs`.
 *
 * The ledger only knows about edits made through an agent since it existed.
 * Working-tree state catches everything else — a human edit, a pre-ledger
 * change, a file two agents both started before this tooling landed. One
 * `git status` per worktree is too slow to run on every Edit, so the snapshot
 * is cached; a racing refresh is harmless because the write is atomic.
 */
export function dirtyPaths({ ttlMs = 15000 } = {}) {
  const cache = resolve(stateDir(), "cache", "dirty.json");
  const cached = readJson(cache);
  if (cached && Date.now() - cached.at < ttlMs) return cached.byKey;
  const byKey = {};
  for (const worktree of liveWorktrees()) {
    byKey[worktree.key] = [];
    try {
      const output = execFileSync("git", ["-C", worktree.path, "status", "--porcelain"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      for (const line of output.split(/\r?\n/)) {
        if (line.length < 4) continue;
        const raw = line.slice(3);
        const path = (raw.includes(" -> ") ? raw.slice(raw.indexOf(" -> ") + 4) : raw).replace(/^"|"$/g, "");
        byKey[worktree.key].push(path);
      }
    } catch { /* a worktree mid-operation just contributes nothing this cycle */ }
  }
  writeJson(cache, { at: Date.now(), byKey });
  return byKey;
}

function touches(paths, relativePath) {
  return paths.some((entry) => entry === relativePath || (entry.endsWith("/") && relativePath.startsWith(entry)));
}

/**
 * Other checkouts that already have this exact file in flight.
 *
 * This is the hard signal — not "our globs could collide" but "this file is
 * already changed somewhere else", which always ends in a conflict or in one
 * agent's work being discarded at merge.
 */
export function foreignEditors(relativePath, myKey, { useWorkingTree = true } = {}) {
  const others = liveManifests().filter((entry) => entry.key !== myKey);
  const dirty = useWorkingTree ? dirtyPaths() : {};
  const found = [];
  for (const other of others) {
    const ledger = readLedger(other.key);
    const inLedger = Boolean(ledger?.files?.[relativePath]);
    const inWorkingTree = touches(dirty[other.key] ?? [], relativePath);
    if (inLedger || inWorkingTree) {
      found.push({ key: other.key, taskId: other.task.taskId, branch: other.worktree.branch, path: other.worktree.path, source: inLedger ? "edit ledger" : "working tree" });
    }
  }
  return found;
}

/** Other active tasks whose ownership globs cover this path. */
export function foreignClaimants(relativePath, myKey) {
  return liveManifests()
    .filter((entry) => entry.key !== myKey)
    .filter((entry) => (entry.task.ownedPaths ?? []).some((pattern) => matchesGlob(pattern, relativePath)))
    .map((entry) => ({ key: entry.key, taskId: entry.task.taskId, branch: entry.worktree.branch }));
}

/** Ownership globs claimed by more than one active task. */
export function overlappingClaims(manifests = liveManifests()) {
  const conflicts = [];
  for (let i = 0; i < manifests.length; i += 1) {
    for (let j = i + 1; j < manifests.length; j += 1) {
      const a = manifests[i];
      const b = manifests[j];
      const pairs = [];
      for (const left of a.task.ownedPaths ?? []) {
        for (const right of b.task.ownedPaths ?? []) {
          if (claimsOverlap(left, right)) pairs.push([left, right]);
        }
      }
      if (pairs.length) conflicts.push({ a: a.task.taskId, aKey: a.key, b: b.task.taskId, bKey: b.key, pairs });
    }
  }
  return conflicts;
}

/** Files in flight in two or more checkouts at once. */
export function overlappingFiles() {
  const manifests = liveManifests();
  const dirty = dirtyPaths();
  const owners = new Map();
  for (const entry of manifests) {
    const seen = new Set([...Object.keys(readLedger(entry.key)?.files ?? {}), ...(dirty[entry.key] ?? [])]);
    for (const path of seen) {
      if (path.endsWith("/")) continue;
      if (!owners.has(path)) owners.set(path, []);
      owners.get(path).push({ key: entry.key, taskId: entry.task.taskId });
    }
  }
  return [...owners.entries()]
    .filter(([, holders]) => holders.length > 1)
    .map(([path, holders]) => ({ path, holders }));
}

/** Every structural problem in the current fleet, in one pass. */
export function fleetReport() {
  const worktrees = liveWorktrees();
  const manifests = activeManifests();
  const live = manifests.filter((entry) => entry.worktree);
  const registry = readJson(resolve(stateDir(), "worktrees.json"), { worktrees: [] });
  const registered = new Set((registry.worktrees ?? []).map((entry) => basename(String(entry.path ?? ""))));

  const problems = [];
  for (const conflict of overlappingClaims(live)) {
    problems.push({ severity: "error", kind: "claim-overlap", message: `${conflict.a} and ${conflict.b} both claim ${conflict.pairs.map(([l, r]) => (l === r ? l : `${l} ~ ${r}`)).join(", ")}` });
  }
  for (const collision of overlappingFiles()) {
    problems.push({ severity: "error", kind: "file-collision", message: `${collision.path} is in flight in ${collision.holders.map((holder) => holder.taskId).join(" and ")}` });
  }
  const byTaskId = new Map();
  for (const entry of live) {
    const list = byTaskId.get(entry.task.taskId) ?? [];
    list.push(entry.key);
    byTaskId.set(entry.task.taskId, list);
  }
  for (const [taskId, keys] of byTaskId) {
    if (keys.length > 1) problems.push({ severity: "error", kind: "duplicate-task", message: `task ${taskId} is active in ${keys.join(" and ")}` });
  }
  for (const worktree of worktrees) {
    if (!live.some((entry) => entry.key === worktree.key)) {
      problems.push({ severity: "warn", kind: "unregistered-worktree", message: `${worktree.key} (${worktree.branch || "detached"}) has no active task manifest; its edits fall back to shared state` });
    }
    if (!registered.has(worktree.key)) {
      problems.push({ severity: "warn", kind: "unregistered-in-registry", message: `${worktree.key} is missing from worktrees.json; run npm run agent:worktree sync` });
    }
  }
  for (const entry of manifests) {
    if (!entry.worktree) problems.push({ severity: "warn", kind: "stale-manifest", message: `${entry.key} has an active manifest (${entry.task.taskId}) but no checkout on disk` });
  }
  const keys = worktrees.map((entry) => entry.key);
  for (const key of new Set(keys)) {
    if (keys.filter((candidate) => candidate === key).length > 1) {
      problems.push({ severity: "error", kind: "key-collision", message: `two checkouts share the directory name ${key}; state files would overwrite each other` });
    }
  }
  if (existsSync(resolve(stateDir(), "active-task.json"))) {
    problems.push({ severity: "warn", kind: "legacy-state", message: "active-task.json still exists; it is a shared fallback that any checkout can read. Register per-worktree tasks and archive it." });
  }
  return { worktrees, manifests, problems, dirty: dirtyPaths() };
}
