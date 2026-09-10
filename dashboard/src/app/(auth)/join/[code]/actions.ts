"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { join } from "@/lib/api";
import { ORG_COOKIE } from "@/lib/current-org";
import { SESSION_COOKIE, ROLE_COOKIE } from "@/lib/current-session";

export async function joinAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) throw new Error("Email and password are required");

  let result;
  try {
    result = await join({ code, email, password });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not join";
    const reason = message.includes("409") ? "That email is already registered" : message.includes("404") ? "This invite link is invalid or has been revoked" : "Could not join";
    redirect(`/join/${code}?error=${encodeURIComponent(reason)}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, result.session_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expires_at),
  });
  store.set(ORG_COOKIE, result.user.org_id, { httpOnly: true, sameSite: "lax", path: "/" });
  store.set(ROLE_COOKIE, result.user.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expires_at),
  });

  redirect("/employee");
}
