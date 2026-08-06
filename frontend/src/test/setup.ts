import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vite.config.ts doesn't set test.globals, so @testing-library/react's
// automatic afterEach-based cleanup never registers on its own — every
// component test file would otherwise leak DOM nodes into the next test in
// the same file. Registering it once here (shared setupFiles) fixes it for
// every test, not just the new ones added in this block.
afterEach(() => {
  cleanup();
});
