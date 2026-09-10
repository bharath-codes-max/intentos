import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "intentos_session";
// Not a trust boundary by itself — every admin-only API route re-checks the real role server
// side (requireOrgAdmin). This cookie only drives which UI a signed-in browser is routed to.
export const ROLE_COOKIE = "intentos_role";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getRole(): Promise<"admin" | "employee" | null> {
  const store = await cookies();
  const value = store.get(ROLE_COOKIE)?.value;
  return value === "admin" || value === "employee" ? value : null;
}
