import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

export type Db = NodePgDatabase & { $client: Pool };

export function createDb(connectionString: string): Db {
  return drizzle({ connection: connectionString, casing: "snake_case" });
}
