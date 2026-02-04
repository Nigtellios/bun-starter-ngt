import RuntimeConfig from "@config/runtimeConfig.ts";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema.ts";

const { DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL } = RuntimeConfig;

const isConfigured = Boolean(DATABASE_URL || DB_HOST || DB_NAME || DB_USER);

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

const createPool = () =>
  new Pool({
    connectionString: DATABASE_URL,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: DB_SSL ? { rejectUnauthorized: false } : false,
  });

export const isDatabaseConfigured = () => isConfigured;

export const getPool = () => {
  if (!isConfigured) {
    return null;
  }

  if (!pool) {
    pool = createPool();
  }

  return pool;
};

export const getDb = () => {
  if (!isConfigured) {
    throw new Error("Database not configured. Set DATABASE_URL or DB_* environment variables.");
  }

  if (!db) {
    const activePool = getPool();

    if (!activePool) {
      throw new Error("Database pool unavailable.");
    }

    db = drizzle(activePool, { schema });
  }

  return db;
};

export const closeDb = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
};
