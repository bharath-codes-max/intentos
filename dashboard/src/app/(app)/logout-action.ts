"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "@/lib/api";
import { ORG_COOKIE } from "@/lib/current-org";
import { SESSION_COOKIE } from "@/lib/current-session";
import { GATE_COOKIE } from "@/lib/site-gate";

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await logout(token);
    } catch {
      // Session may already be invalid/expired server-side — clearing cookies below still
      // signs this browser out either way, so a failed revoke call isn't worth blocking on.
    }
  }
  store.delete(SESSION_COOKIE);
  store.delete(ORG_COOKIE);
  store.delete(GATE_COOKIE);
  redirect("/enter");
}
