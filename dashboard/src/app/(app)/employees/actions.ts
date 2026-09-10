"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { regenerateInvite, revokeEmployee, resolveScopeRequest } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";

type ActionResult = { ok: true } | { ok: false; error: string };

function messageFrom(err: unknown): string {
  if (err instanceof Error) {
    // api.ts throws "Intentos API <status>: <raw body>" — surface just the meaningful part.
    const match = err.message.match(/Intentos API \d+: (.+)/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.error) return parsed.error;
      } catch {
        // fall through to raw text
      }
      return match[1];
    }
    return err.message;
  }
  return "Something went wrong";
}

export async function regenerateInviteAction(): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  try {
    await regenerateInvite(token);
  } catch (err) {
    return { ok: false, error: messageFrom(err) };
  }
  revalidatePath("/employees");
  return { ok: true };
}

export async function revokeEmployeeAction(id: string): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  try {
    await revokeEmployee(token, id);
  } catch (err) {
    return { ok: false, error: messageFrom(err) };
  }
  revalidatePath("/employees");
  return { ok: true };
}

export async function resolveScopeRequestAction(id: string, approved: boolean, contractId?: string): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  try {
    await resolveScopeRequest(token, id, approved, contractId);
  } catch (err) {
    return { ok: false, error: messageFrom(err) };
  }
  revalidatePath("/employees");
  return { ok: true };
}
