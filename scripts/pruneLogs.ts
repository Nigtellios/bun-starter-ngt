import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import RuntimeConfig from "../src/config/runtimeConfig.ts";

const MS_PER_DAY = 86_400_000;

const { PRESERVE_LOGS, DELETE_LOGS_OLDER_THAN_DAYS, LOG_DIRECTORY } = RuntimeConfig;

if (!PRESERVE_LOGS) {
  console.log("[logs] preserve_logs disabled; skipping prune step");
  process.exit(0);
}

if (DELETE_LOGS_OLDER_THAN_DAYS <= 0) {
  console.log("[logs] log retention disabled; nothing to prune");
  process.exit(0);
}

const cutoffTimestamp = Date.now() - DELETE_LOGS_OLDER_THAN_DAYS * MS_PER_DAY;

let entries;

try {
  entries = await readdir(LOG_DIRECTORY, { withFileTypes: true });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") {
    console.log(`[logs] directory ${LOG_DIRECTORY} missing; nothing to prune`);
    process.exit(0);
  }

  throw error;
}

let removedCount = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) {
    continue;
  }

  const entryPath = join(LOG_DIRECTORY, entry.name);
  const stats = await stat(entryPath);

  if (stats.mtimeMs <= cutoffTimestamp && !entry.name.includes("running-")) {
    await rm(entryPath, { recursive: true, force: true });
    removedCount += 1;
  }
}

console.log(
  `[logs] pruned ${removedCount} log session${removedCount === 1 ? "" : "s"} older than ${DELETE_LOGS_OLDER_THAN_DAYS} day${DELETE_LOGS_OLDER_THAN_DAYS === 1 ? "" : "s"}`,
);
