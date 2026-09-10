"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signup } from "@/lib/api";
import { ORG_COOKIE } from "@/lib/current-org";
import { SESSION_COOKIE } from "@/lib/current-session";

export async function signupAction(formData: FormData) {
  const company_name = String(formData.get("company_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!company_name || !email || !password) {
    throw new Error("Company name, email, and password are required");
  }

  let result;
  try {
    result = await signup({ company_name, email, password });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    redirect(`/signup?error=${encodeURIComponent(message.includes("409") ? "That email is already registered" : "Signup failed")}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, result.session_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expires_at),
  });
  store.set(ORG_COOKIE, result.user.org_id, { httpOnly: true, sameSite: "lax", path: "/" });

  redirect("/integrations?welcome=1");
}
