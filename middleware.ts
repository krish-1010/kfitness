import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/session";

// Paths that must stay reachable without a session, or nobody could ever
// log in (the login page itself, and the endpoint that issues the cookie) --
// plus the PWA assets, which browsers fetch unauthenticated to decide
// whether to offer the install prompt at all, often before a first login.
// None of these expose anything private.
const PUBLIC_PATHS = ["/login", "/api/login", "/manifest.webmanifest", "/icon", "/apple-icon", "/sw.js"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fail closed: if the secret isn't configured, refuse to serve the app
    // rather than silently running with no real session verification.
    return new NextResponse("SESSION_SECRET is not configured on the server.", { status: 500 });
  }

  const cookie = req.cookies.get("ct_session")?.value;
  const userId = await verifySessionCookie(secret, cookie);
  if (userId !== null) {
    // Forward the verified userId to route handlers via a header, so they
    // don't each re-verify the cookie. Building a fresh Headers object from
    // the incoming request and overwriting this key server-side means a
    // client can never inject their own x-user-id to spoof another account
    // — whatever they sent under this name is discarded here.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", String(userId));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
