import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, hasDb } from "./db";
import { sessions, users } from "./db/schema";

const SESSION_COOKIE = "bg_session";
const SESSION_DAYS = 30;

export type SessionUser = { id: string; email: string; role: string; name: string | null };

/**
 * Session ids are uuids and the column is typed `uuid`, so anything else
 * makes Postgres throw rather than return no rows — which turned a junk
 * cookie into a 500 on every page, including the one you'd go to in order
 * to sign out. A cookie we didn't issue just means "signed out".
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createSession(userId: string): Promise<string> {
  if (!hasDb || !db) throw new Error("Accounts require a database connection.");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const [row] = await db.insert(sessions).values({ userId, expiresAt }).returning();
  return row.id;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasDb || !db) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || !UUID.test(token)) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      name: users.name,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return { id: row.id, email: row.email, role: row.role, name: row.name };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && UUID.test(token) && hasDb && db) {
    await db.delete(sessions).where(eq(sessions.id, token)).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}
