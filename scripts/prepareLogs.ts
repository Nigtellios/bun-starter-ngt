import { mkdir } from "node:fs/promises";
import RuntimeConfig from "../src/config/runtimeConfig.ts";

const logsDir = RuntimeConfig.LOG_DIRECTORY;

await mkdir(logsDir, { recursive: true });

console.log(`[logs] ensured directory exists at ${logsDir}`);
