"use server";

import { revalidatePath } from "next/cache";
import { createToken } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";

const AGENT_TYPES = ["claude-code", "cursor", "github-copilot", "codex", "openai-agents-sdk", "custom"] as const;

export async function createTokenAction(agentType: string, label: string) {
  if (!AGENT_TYPES.includes(agentType as (typeof AGENT_TYPES)[number])) {
    throw new Error("Unknown agent type");
  }
  if (!label.trim()) {
    throw new Error("Label is required");
  }
  const result = await createToken({ org_id: await getCurrentOrgId(), agent_type: agentType, label: label.trim() });
  revalidatePath("/agents");
  return result;
}
