"use server";

import { redirect } from "next/navigation";
import { approveDevice, denyDevice } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";

export async function approveDeviceAction(formData: FormData) {
  const userCode = String(formData.get("user_code") ?? "");
  const token = await getSessionToken();
  if (!token) redirect(`/login?next=${encodeURIComponent(`/connect?code=${userCode}`)}`);
  await approveDevice(token, userCode);
  redirect(`/connect?code=${encodeURIComponent(userCode)}&result=approved`);
}

export async function denyDeviceAction(formData: FormData) {
  const userCode = String(formData.get("user_code") ?? "");
  const token = await getSessionToken();
  if (!token) redirect(`/login?next=${encodeURIComponent(`/connect?code=${userCode}`)}`);
  await denyDevice(token, userCode);
  redirect(`/connect?code=${encodeURIComponent(userCode)}&result=denied`);
}
