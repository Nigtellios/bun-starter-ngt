import type { User } from "@api/user/model/userModel";
import { getDb, isDatabaseConfigured } from "@init/db.ts";
import { eq } from "drizzle-orm";
import { usersTable } from "../../../db/schema.ts";

export const users: User[] = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    age: 42,
    createdAt: new Date(),
    updatedAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days later
  },
  {
    id: 2,
    name: "Robert",
    email: "robert@example.com",
    age: 21,
    createdAt: new Date(),
    updatedAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days later
  },
];

export class UserRepository {
  async findAllAsync(): Promise<User[]> {
    if (!isDatabaseConfigured()) {
      return users;
    }

    const db = getDb();
    return db.select().from(usersTable);
  }

  async findByIdAsync(id: number): Promise<User | null> {
    if (!isDatabaseConfigured()) {
      return users.find((user) => user.id === id) || null;
    }

    const db = getDb();
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return rows[0] ?? null;
  }
}
