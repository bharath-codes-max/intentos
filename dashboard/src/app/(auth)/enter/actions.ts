"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkSitePassword, GATE_COOKIE } from "@/lib/site-gate";

export async function enterAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/login";

  if (!checkSitePassword(password)) {
    redirect(`/enter?error=1&next=${encodeURIComponent(next)}`);
  }

  const store = await cookies();
  store.set(GATE_COOKIE, "granted", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next);
}
