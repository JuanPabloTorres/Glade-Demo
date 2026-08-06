import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// Component tests render components in isolation (no app-level bootstrap),
// but several use react-i18next's useTranslation, which throws
// NO_I18NEXT_INSTANCE unless the i18next singleton has been initialized
// first. main.tsx does this via a side-effect import; mirror that here once
// for every test file instead of requiring each test to import it.
import "../i18n/i18n";

// vite.config.ts doesn't set test.globals, so @testing-library/react's
// automatic afterEach-based cleanup never registers on its own — every
// component test file would otherwise leak DOM nodes into the next test in
// the same file. Registering it once here (shared setupFiles) fixes it for
// every test, not just the new ones added in this block.
afterEach(() => {
  cleanup();
});
