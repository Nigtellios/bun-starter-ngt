import { join } from "node:path";
import { parseBoolean, parseInteger } from "../common/utils/parsers.ts";

const parseStringList = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

/**
 * Runtime configuration settings loaded from environment variables. Centralized for consistent defaults.
 */
const RuntimeConfig = {
  HOST: process.env.HOST || "0.0.0.0",
  PORT: parseInteger(process.env.PORT, 3137),
  MODE: process.env.NODE_ENV || "development",
  /**
   * Public base URL used for OpenAPI `servers` and other absolute links.
   * Example: https://api.example.com
   */
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  /**
   * Whether the app should trust `X-Forwarded-For` / `X-Real-Ip`.
   * Enable when running behind a reverse proxy (nginx / Cloudflare / Traefik).
   */
  TRUST_PROXY: parseBoolean(process.env.TRUST_PROXY, true),
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  PRESERVE_LOGS: parseBoolean(process.env.PRESERVE_LOGS, false),
  LOG_MAX_LINES: Math.max(parseInteger(process.env.LOG_MAX_LINES, 1000), 1),
  LOG_REQUESTS: parseBoolean(process.env.LOG_REQUESTS, true),
  LOG_RESPONSES: parseBoolean(process.env.LOG_RESPONSES, true),
  DELETE_LOGS_OLDER_THAN_DAYS: Math.max(parseInteger(process.env.DELETE_LOGS_OLDER_THAN_DAYS, 3), 0),
  LOG_DIRECTORY: process.env.LOG_DIRECTORY || join(process.cwd(), "logs"),
  LOG_SESSION_PREFIX: process.env.LOG_SESSION_PREFIX || "log",
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInteger(process.env.DB_PORT, 5432),
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_SSL: parseBoolean(process.env.DB_SSL, false),

  // Admin security (A + C)
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  ADMIN_IP_ALLOWLIST: parseStringList(process.env.ADMIN_IP_ALLOWLIST),
};

export default RuntimeConfig;
