import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "intentos_session";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
