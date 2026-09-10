"use server";

import { revalidatePath } from "next/cache";
import { revokeToken } from "@/lib/api";

export async function revokeTokenAction(tokenId: string) {
  await revokeToken(tokenId);
  revalidatePath("/integrations");
}
