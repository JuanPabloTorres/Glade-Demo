import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(currentDir, "../../contracts/api-contracts.json");
const targetPath = resolve(currentDir, "../src/api/apiContracts.generated.ts");
const sourceContracts = JSON.parse(readFileSync(sourcePath, "utf8"));
const publicContracts = Object.fromEntries(
  Object.entries(sourceContracts).map(([key, contract]) => [
    key,
    {
      operationId: contract.operationId,
      method: contract.method,
      path: contract.path,
    },
  ]),
);

const output =
  `// Generated from contracts/api-contracts.json. Do not edit manually.\n` +
  `// Only client-safe endpoint metadata is included in the browser bundle.\n` +
  `export const apiContracts = ${JSON.stringify(publicContracts, null, 2)} as const;\n` +
  `export type ApiOperationKey = keyof typeof apiContracts;\n`;
writeFileSync(targetPath, output, "utf8");
console.log(`Generated ${targetPath}`);
