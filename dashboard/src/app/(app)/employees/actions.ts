"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { regenerateInvite, revokeEmployee, resolveScopeRequest } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";

export async function regenerateInviteAction() {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  await regenerateInvite(token);
  revalidatePath("/employees");
}

export async function revokeEmployeeAction(id: string) {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  await revokeEmployee(token, id);
  revalidatePath("/employees");
}

export async function resolveScopeRequestAction(id: string, approved: boolean) {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  await resolveScopeRequest(token, id, approved);
  revalidatePath("/employees");
}
