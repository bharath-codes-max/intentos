"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { regenerateInvite, revokeEmployee, resolveScopeRequest, compileIntent, createContract } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";
import { getCurrentOrgId } from "@/lib/current-org";

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

/** Lets an admin create a brand-new Intent Contract right from the scope-approval dialog,
 *  instead of only picking from ones that already exist — mirrors compile+activate from the
 *  main Intent Contracts flow, but returns the new contract instead of redirecting, since this
 *  runs inline inside a dialog the admin is about to finish approving from. */
export async function createInlineContractAction(input: {
  name: string;
  natural_language: string;
}): Promise<{ ok: true; contract: { id: string; name: string } } | { ok: false; error: string }> {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  try {
    const org_id = await getCurrentOrgId();
    const compiled = await compileIntent({ text: input.natural_language });
    if (compiled.rules.length === 0) {
      return { ok: false, error: "Couldn't compile any rules from that description — try being more specific." };
    }
    const contract = await createContract({
      org_id,
      name: input.name,
      natural_language: input.natural_language,
      rules: compiled.rules.map((r) => ({
        resource: r.resource,
        resource_action: r.resource_action,
        effect: r.effect,
        reason: r.reason,
        condition: r.condition,
      })),
    });
    revalidatePath("/employees");
    revalidatePath("/policies");
    return { ok: true, contract: { id: contract.id, name: contract.name } };
  } catch (err) {
    return { ok: false, error: messageFrom(err) };
  }
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
