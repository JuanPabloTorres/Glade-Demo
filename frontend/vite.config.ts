import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import flowbiteReact from "flowbite-react/plugin/vite";
import { defineConfig } from "vitest/config";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appVersion = readFileSync(resolve(repositoryRoot, "VERSION"), "utf8").trim();

export default defineConfig({
  plugins: [react(), tailwindcss(), flowbiteReact()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
