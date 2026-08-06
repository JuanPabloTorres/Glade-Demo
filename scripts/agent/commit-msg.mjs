import { readFileSync } from "node:fs";
const path = process.argv[2];
const first = readFileSync(path, "utf8").split("\n")[0];
if (!/^(feat|fix|refactor|chore|docs|test|ci|build)(\([a-z0-9-]+\))?!?: .{3,72}$/.test(first)) {
  console.error("Commit message must follow Conventional Commits: type(scope): message");
  process.exit(1);
}
