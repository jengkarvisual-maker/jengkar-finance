import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];
const CANONICAL_APP_URL =
  process.env.APP_URL?.trim() || "https://finance.rumahjengkar.com";

function getCanonicalOrigin() {
  try {
    return new URL(CANONICAL_APP_URL);
  } catch {
    return new URL("https://finance.rumahjengkar.com");
  }
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const canonicalUrl = getCanonicalOrigin();
  const currentHostname = request.nextUrl.hostname.toLowerCase();
  const canonicalHostname = canonicalUrl.hostname.toLowerCase();

  if (
    process.env.NODE_ENV === "production" &&
    !isLocalHost(currentHostname) &&
    currentHostname !== canonicalHostname
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = canonicalUrl.protocol;
    redirectUrl.host = canonicalUrl.host;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
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
