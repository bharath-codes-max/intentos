import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/current-session";
import { GATE_COOKIE } from "@/lib/site-gate";

const PUBLIC_PATHS = ["/login", "/signup", "/connect"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/enter") {
    return NextResponse.next();
  }
  const gated = req.cookies.get(GATE_COOKIE)?.value === "granted";
  if (!gated) {
    const enterUrl = new URL("/enter", req.url);
    if (pathname !== "/") enterUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(enterUrl);
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|hooks/|install.sh|connect.mjs).*)"],
};
