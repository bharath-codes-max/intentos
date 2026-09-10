"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveApproval, getMe } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";

export async function resolveApprovalAction(id: string, approved: boolean) {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  const me = await getMe(token);
  await resolveApproval(id, approved, me.email);
  revalidatePath("/approvals");
  revalidatePath("/decisions");
  revalidatePath("/");
}
