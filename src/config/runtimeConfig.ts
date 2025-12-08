import { join } from "node:path";
import { parseBoolean, parseInteger } from "../common/utils/parsers.ts";

/**
 * Runtime configuration settings loaded from environment variables. Centralized for consistent defaults.
 */
const RuntimeConfig = {
  PORT: parseInteger(process.env.PORT, 3137),
  MODE: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  PRESERVE_LOGS: parseBoolean(process.env.PRESERVE_LOGS, false),
  LOG_MAX_LINES: Math.max(parseInteger(process.env.LOG_MAX_LINES, 1000), 1),
  LOG_REQUESTS: parseBoolean(process.env.LOG_REQUESTS, false),
  LOG_RESPONSES: parseBoolean(process.env.LOG_RESPONSES, false),
  DELETE_LOGS_OLDER_THAN_DAYS: Math.max(parseInteger(process.env.DELETE_LOGS_OLDER_THAN_DAYS, 3), 0),
  LOG_DIRECTORY: process.env.LOG_DIRECTORY || join(process.cwd(), "logs"),
  LOG_SESSION_PREFIX: process.env.LOG_SESSION_PREFIX || "log",
};

export default RuntimeConfig;
