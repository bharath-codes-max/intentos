import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_ORG_ID } from "./api";

export const ORG_COOKIE = "intentos_org_id";

export async function getCurrentOrgId(): Promise<string> {
  const store = await cookies();
  return store.get(ORG_COOKIE)?.value || DEFAULT_ORG_ID;
}
