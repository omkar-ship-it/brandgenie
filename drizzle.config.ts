import { existsSync } from "fs";
import type { Config } from "drizzle-kit";

// Vercel injects env vars directly; locally they sit in .env.local, which
// drizzle-kit doesn't read on its own.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
