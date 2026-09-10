"use server";

import { redirect } from "next/navigation";
import { requestScopeChange } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";

export async function requestScopeChangeAction(projectIdentifier: string, action: "include" | "exclude") {
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  await requestScopeChange(token, projectIdentifier, action);
}
