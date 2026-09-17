import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/session";

// Paths that must stay reachable without a session, or nobody could ever
// log in (the login page itself, and the endpoint that issues the cookie).
const PUBLIC_PATHS = ["/login", "/api/login"];

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
  const valid = await verifySessionCookie(secret, cookie);
  if (valid) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
