import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

export const hasDb = Boolean(connectionString);

/**
 * Neon's HTTP driver in production (same as LetterMail); plain node-postgres
 * for any other connection string, which is what makes a local Postgres work
 * for development without changing a line of schema or query code.
 */
function createDb() {
  if (!connectionString) return null;
  if (/neon\.tech/.test(connectionString)) {
    return drizzleNeon(neon(connectionString), { schema });
  }
  const globalForPg = globalThis as unknown as { __bgPool?: Pool };
  globalForPg.__bgPool ??= new Pool({ connectionString });
  return drizzlePg(globalForPg.__bgPool, { schema });
}

export const db = createDb();
