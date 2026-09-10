import "server-only";

export const GATE_COOKIE = "intentos_gate";
/** Soft access gate for the testing period — keeps casual visitors from stumbling onto
 *  signup, not a real security boundary. Never sent to the client; compared server-side only. */
const SITE_PASSWORD = process.env.SITE_ACCESS_PASSWORD || "96183";

export function checkSitePassword(input: string): boolean {
  return input === SITE_PASSWORD;
}
