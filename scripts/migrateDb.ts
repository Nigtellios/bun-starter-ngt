import { closeDb } from "../src/init/db.ts";
import { runMigrations } from "../src/db/migrate.ts";

const logPrefix = "[db:migrate]";

try {
  await runMigrations();
  console.log(`${logPrefix} migrations applied`);
} catch (error) {
  console.error(`${logPrefix} migration failed`);
  throw error;
} finally {
  await closeDb();
}

