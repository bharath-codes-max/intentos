"use server";

import { revalidatePath } from "next/cache";
import { setContractStatus } from "@/lib/api";

export async function toggleContractStatusAction(id: string, status: "active" | "archived") {
  await setContractStatus(id, status);
  revalidatePath(`/policies/${id}`);
  revalidatePath("/policies");
}
