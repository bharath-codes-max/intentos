"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login } from "@/lib/api";
import { ORG_COOKIE } from "@/lib/current-org";
import { SESSION_COOKIE } from "@/lib/current-session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/";

  let result;
  try {
    result = await login({ email, password });
  } catch {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, result.session_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expires_at),
  });
  store.set(ORG_COOKIE, result.user.org_id, { httpOnly: true, sameSite: "lax", path: "/" });

  redirect(next);
}
