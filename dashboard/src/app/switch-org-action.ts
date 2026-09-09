"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/current-org";

export async function switchOrgAction(orgId: string) {
  const store = await cookies();
  store.set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}
