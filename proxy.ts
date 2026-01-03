import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./lib/auth";

const PROTECTED_PREFIXES = ["/vote", "/admin", "/change-password"];
const ADMIN_PREFIX = "/admin";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const session = getSessionFromRequest(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && session.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/vote";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/vote/:path*", "/admin/:path*", "/change-password/:path*"]
};

