"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkSitePassword, GATE_COOKIE } from "@/lib/site-gate";
import { siteLogin } from "@/lib/api";
import { ORG_COOKIE } from "@/lib/current-org";
import { SESSION_COOKIE, ROLE_COOKIE } from "@/lib/current-session";

export async function enterAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/integrations";

  if (!checkSitePassword(password)) {
    redirect(`/enter?error=1&next=${encodeURIComponent(next)}`);
  }

  const result = await siteLogin();

  const store = await cookies();
  store.set(GATE_COOKIE, "granted", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
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

  redirect(next === "/login" || next === "/signup" ? "/integrations" : next);
}
