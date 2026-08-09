import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FullConfig } from "@playwright/test";

/**
 * Refuse to test somebody else's build.
 *
 * A release run reported four language failures that were not failures: with
 * `reuseExistingServer` on, Playwright had accepted a sibling worktree's dev
 * server on the port it picked, and the suite spent three minutes measuring
 * another branch. The wasted run was the cheap part — a *green* run against the
 * wrong tree is the expensive one, and nothing in the output would have said so.
 *
 * So before any spec runs, ask the API what it is: `/api/v1/health` reports the
 * version the backend was started from, and it is compared against the VERSION
 * file next to this checkout. A mismatch throws here, before a single
 * assertion, with both versions named.
 *
 * **The web server is verified differently, and this is worth reading before
 * "improving" it.** The obvious check — fetch `/src/config/version.ts` and look
 * for the substituted `__APP_VERSION__` — does not work: Vite serves that
 * module in dev with the token *unsubstituted*, so the check failed against a
 * correct server. It was written, it fired on this repository's own build, and
 * it was removed rather than weakened into a warning.
 *
 * Two things cover the frontend instead, and together they are stronger:
 *
 *   1. In release mode (`E2E_RELEASE=1`) `reuseExistingServer` is off, so
 *      Playwright starts the web server itself and the port is ours by
 *      construction rather than by inspection.
 *   2. `ui-quality-evidence.spec.ts` asserts the footer badge equals this
 *      checkout's VERSION, which reads the substituted value from the running
 *      app — the one place the token is genuinely resolved.
 *
 * This runs in every mode, not only release: a local run against the wrong
 * server wastes the same time and teaches the same wrong lesson.
 */

const HEALTH_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const expected =
    process.env.E2E_EXPECTED_VERSION ??
    readFileSync(resolve(import.meta.dirname, "..", "..", "VERSION"), "utf8").trim();

  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) throw new Error("No baseURL configured; cannot verify the build under test.");

  const apiBase = process.env.E2E_API_PORT
    ? `http://127.0.0.1:${process.env.E2E_API_PORT}`
    : "http://127.0.0.1:8000";

  const health = await fetchWithTimeout(`${apiBase}/api/v1/health`);
  const served = (await health.json()) as { version?: string };
  if (served.version !== expected) {
    throw new Error(
      `The API on ${apiBase} reports version ${served.version ?? "(none)"}, but this checkout is ` +
        `${expected}. Playwright is pointed at another checkout's server — start this run on free ` +
        "ports (scripts/agent/release-verify.mjs does) rather than reusing whatever is listening.",
    );
  }

  // The web server is *not* re-checked here, deliberately.
  //
  // Playwright's own `webServer` entry already polls `baseURL` until it answers
  // and fails the run if it never does, so a second fetch adds no guarantee —
  // only a second way to fail. It did: on a cold Vite start the extra request
  // exceeded this file's timeout and aborted an otherwise healthy run. A
  // pre-flight guard that flakes is worse than no pre-flight guard, because the
  // next person learns to re-run instead of to read it.
  //
  // The identity of the *frontend* build is covered where it is observable:
  // `ui-quality-evidence.spec.ts` asserts the footer badge equals this
  // checkout's VERSION, and in release mode Playwright started the server
  // itself so the port cannot belong to another worktree.

  const isolation = process.env.E2E_RELEASE === "1" ? "own servers" : "may reuse a running server";
  console.log(`e2e: API on ${apiBase} reports FreshStart ${expected} (${isolation})`);
}
