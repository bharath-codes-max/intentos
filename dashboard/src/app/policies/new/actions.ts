"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compileIntent, createContract, CompiledRule } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";

export async function compileIntentAction(text: string, agentType?: string) {
  return compileIntent({ text, agent_type: agentType });
}

export async function activateContractAction(input: {
  name: string;
  natural_language: string;
  agent_token_id?: string;
  rules: CompiledRule[];
}) {
  const org_id = await getCurrentOrgId();
  const contract = await createContract({
    org_id,
    agent_token_id: input.agent_token_id,
    name: input.name,
    natural_language: input.natural_language,
    rules: input.rules.map((r) => ({
      resource: r.resource,
      resource_action: r.resource_action,
      effect: r.effect,
      reason: r.reason,
      condition: r.condition,
    })),
  });
  revalidatePath("/policies");
  redirect(`/policies/${contract.id}`);
}
