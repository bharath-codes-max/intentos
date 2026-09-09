"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createOrg } from "@/lib/api";
import { ORG_COOKIE } from "@/lib/current-org";

export async function signupAction(formData: FormData) {
  const name = String(formData.get("company_name") ?? "").trim();
  if (!name) {
    throw new Error("Company name is required");
  }

  const org = await createOrg(name);

  const store = await cookies();
  store.set(ORG_COOKIE, org.id, { httpOnly: true, sameSite: "lax", path: "/" });

  redirect("/agents?welcome=1");
}
