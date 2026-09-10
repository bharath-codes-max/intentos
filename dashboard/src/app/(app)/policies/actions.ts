"use server";

import { revalidatePath } from "next/cache";
import { createPolicy, setPolicyActive } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";

export async function createPolicyAction(formData: FormData) {
  const rule_name = String(formData.get("rule_name") ?? "");
  const field = String(formData.get("field") ?? "");
  const op = String(formData.get("op") ?? "");
  const value = String(formData.get("value") ?? "");
  const action = String(formData.get("action") ?? "") as "ALLOW" | "BLOCK" | "REVIEW";
  const priority = Number(formData.get("priority") ?? 10);

  if (!rule_name || !field || !op || !value || !action) {
    throw new Error("All fields are required");
  }

  await createPolicy({
    org_id: await getCurrentOrgId(),
    rule_name,
    condition: { field, op, value },
    action,
    priority,
  });

  revalidatePath("/policies");
}

export async function togglePolicyAction(id: string, active: boolean) {
  await setPolicyActive(id, active);
  revalidatePath("/policies");
}
