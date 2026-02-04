import { sql } from "drizzle-orm";
import { usersTable } from "../src/db/schema.ts";
import { runMigrations } from "../src/db/migrate.ts";
import { closeDb, getDb, isDatabaseConfigured } from "../src/init/db.ts";

const logPrefix = "[db:seed]";

if (!isDatabaseConfigured()) {
  console.error(`${logPrefix} database not configured. Set DATABASE_URL or DB_* env vars.`);
  process.exit(1);
}

const db = getDb();

try {
  // Ensure schema is up to date before seeding.
  await runMigrations();

  const [result] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const existingCount = Number(result?.count ?? 0);

  if (existingCount > 0) {
    console.log(`${logPrefix} users already exist (count=${existingCount}); skipping`);
  } else {
    const now = new Date();
    const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    await db.insert(usersTable).values([
      {
        name: "Alice",
        email: "alice@example.com",
        age: 42,
        createdAt: now,
        updatedAt: fiveDaysLater,
      },
      {
        name: "Robert",
        email: "robert@example.com",
        age: 21,
        createdAt: now,
        updatedAt: fiveDaysLater,
      },
    ]);

    console.log(`${logPrefix} inserted 2 dummy users`);
  }
} finally {
  await closeDb();
}
