import { getDb, isDatabaseConfigured } from "@init/db.ts";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export const runMigrations = async () => {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured. Set DATABASE_URL or DB_* environment variables.");
  }

  const db = getDb();
  await migrate(db, { migrationsFolder: "drizzle" });
};
