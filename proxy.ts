import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasSession = Boolean(request.cookies.get("rjf_session")?.value);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};