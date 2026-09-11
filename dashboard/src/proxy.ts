import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, ROLE_COOKIE } from "@/lib/current-session";
import { GATE_COOKIE } from "@/lib/site-gate";

const PUBLIC_PATHS = ["/login", "/signup", "/connect", "/join"];
// Paths an 'employee' role session is allowed to reach — everything else under (app) is
// admin-only. This is UI routing convenience only; the real enforcement is server-side
// (requireOrgAdmin on the API), so a redirect miss here can never leak data on its own.
const EMPLOYEE_ALLOWED_PATHS = ["/employee", "/connect"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Preserve the query string (e.g. /connect?code=XXXX) through the redirect chain —
  // pathname alone drops it, which silently broke the device-approval deep link.
  const fullPath = pathname + search;

  if (pathname === "/enter") {
    return NextResponse.next();
  }
  const gated = req.cookies.get(GATE_COOKIE)?.value === "granted";
  if (!gated) {
    const enterUrl = new URL("/enter", req.url);
    if (pathname !== "/") enterUrl.searchParams.set("next", fullPath);
    return NextResponse.redirect(enterUrl);
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const enterUrl = new URL("/enter", req.url);
    if (pathname !== "/") enterUrl.searchParams.set("next", fullPath);
    return NextResponse.redirect(enterUrl);
  }

  const role = req.cookies.get(ROLE_COOKIE)?.value;
  if (role === "employee" && !EMPLOYEE_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/employee", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|hooks/|install.sh|connect.mjs|install-codex-desktop.sh|connect-codex-desktop.mjs|uninstall-codex-desktop.sh).*)",
  ],
};
