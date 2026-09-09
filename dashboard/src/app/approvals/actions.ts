"use server";

import { revalidatePath } from "next/cache";
import { resolveApproval } from "@/lib/api";

export async function resolveApprovalAction(id: string, approved: boolean, reviewer: string) {
  await resolveApproval(id, approved, reviewer);
  revalidatePath("/approvals");
  revalidatePath("/decisions");
  revalidatePath("/");
}
