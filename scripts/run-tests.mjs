import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.execPath,
  ["--test", "tests/pix.test.js", "tests/order.test.js"],
  { cwd: root, stdio: "inherit" }
);

process.exit(result.status ?? 1);
