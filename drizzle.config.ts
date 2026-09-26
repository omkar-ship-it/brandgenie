import { existsSync } from "fs";
import type { Config } from "drizzle-kit";

// Locally the connection string sits in .env.local, which drizzle-kit doesn't
// read on its own. An explicit DATABASE_URL in the environment wins, so
// `DATABASE_URL=<neon url> npx drizzle-kit push` can target production
// without the local file silently overriding it.
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
