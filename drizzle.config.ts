import type { Config } from "drizzle-kit";

const buildDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (url && url.trim().length > 0) {
    return url.trim();
  }

  const host = process.env.DB_HOST ?? "localhost";
  const port = Number.parseInt(process.env.DB_PORT ?? "5432", 10);
  const db = process.env.DB_NAME ?? "bun_starter_ngt";
  const user = process.env.DB_USER ?? "postgres";
  const password = process.env.DB_PASSWORD ?? "postgres";

  // Note: drizzle-kit expects a URL; this matches the runtime DB_* config.
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${Number.isNaN(port) ? 5432 : port}/${db}`;
};

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: buildDatabaseUrl(),
  },
} satisfies Config;

